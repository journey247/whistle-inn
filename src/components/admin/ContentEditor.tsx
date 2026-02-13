import { useState, useEffect } from 'react';
import { useToast } from "@/components/ui/toast-context";
import { Loader2, Save, Image as ImageIcon, FileText, Type, Edit2, X, UploadCloud } from "lucide-react";
import { ImagePicker } from "./ImagePicker";

type ContentBlock = {
    key: string;
    value: string;
    label: string;
    type: string;
    category: string;
    section?: string;
};

export const ContentEditor = () => {
    const [blocks, setBlocks] = useState<ContentBlock[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [editingMeta, setEditingMeta] = useState<string | null>(null);
    const [activeSection, setActiveSection] = useState<string>("Hero Section");
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pickerTarget, setPickerTarget] = useState<string | null>(null);
    const { addToast } = useToast();

    useEffect(() => {
        fetchContent();
    }, []);

    const fetchContent = async () => {
        try {
            const token = localStorage.getItem('admin_token');
            const res = await fetch('/api/admin/content', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                setBlocks(data);
                // Set initial section if current active one doesn't exist
                const uniqueSections = Array.from(new Set(data.map((b: ContentBlock) => b.section || 'Other')));
                if (!uniqueSections.includes(activeSection) && uniqueSections.length > 0) {
                    // Prefer "Hero Section" or "Home" if available
                    if (uniqueSections.includes("Hero Section")) setActiveSection("Hero Section");
                    else if (uniqueSections.includes("Home")) setActiveSection("Home");
                    else setActiveSection(uniqueSections[0] as string);
                }
            } else {
                addToast("Error fetching content", "error");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (key: string, value: string, label?: string, section?: string) => {
        setSaving(key);
        try {
            const token = localStorage.getItem('admin_token');
            const res = await fetch('/api/admin/content', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ key, value, label, section })
            });

            if (res.ok) {
                addToast("Content updated successfully", "success");
                setEditingMeta(null);
                fetchContent(); // Refresh to update sections/labels
            } else {
                throw new Error("Failed to save");
            }
        } catch (error) {
            addToast("Failed to save content", "error");
        } finally {
            setSaving(null);
        }
    };

    const handleChange = (key: string, field: keyof ContentBlock, value: string) => {
        setBlocks(prev => prev.map(b => b.key === key ? { ...b, [field]: value } : b));
    };

    const handleImageSelect = (url: string) => {
        if (pickerTarget) {
            handleChange(pickerTarget, 'value', url);
            // Optionally auto-save?
            // handleSave(pickerTarget, url); 
        }
        setPickerOpen(false);
        setPickerTarget(null);
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

    // Group by section
    const sections: Record<string, ContentBlock[]> = {};
    const sectionOrder = [
        "Hero Section", "Hero Slider", "About Section", "Highlights",
        "Concierge", "Adventures", "Skiing", "Fishing", "Serenity",
        "Rooms", "Gallery", "House Rules", "Other"
    ];

    blocks.forEach(block => {
        const section = block.section || 'Other';
        if (!sections[section]) sections[section] = [];
        sections[section].push(block);
    });

    const sortedSectionKeys = Object.keys(sections).sort((a, b) => {
        const idxA = sectionOrder.indexOf(a);
        const idxB = sectionOrder.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
    });

    return (
        <div className="space-y-6 h-[calc(100vh-200px)] flex flex-col">
            <div className="flex justify-between items-center shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Site Content</h2>
                    <p className="text-slate-500">Manage website text, images, and headlines.</p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6 h-full min-h-0">
                {/* Sidebar Navigation */}
                <div className="w-full md:w-64 shrink-0 overflow-y-auto pr-2 border-b md:border-b-0 md:border-r border-slate-200 pb-4 md:pb-0">
                    <div className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
                        {sortedSectionKeys.map(sectionName => (
                            <button
                                key={sectionName}
                                onClick={() => setActiveSection(sectionName)}
                                className={`px-4 py-3 text-sm font-medium rounded-lg text-left transition-colors whitespace-nowrap ${activeSection === sectionName
                                    ? 'bg-brand-gold text-white shadow-md'
                                    : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                    }`}
                            >
                                {sectionName}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto bg-slate-50/50 rounded-xl border border-slate-200 p-1">
                    {activeSection && sections[activeSection] ? (
                        <div className="bg-white rounded-lg shadow-sm m-1">
                            <div className="px-6 py-4 border-b border-slate-100 bg-white sticky top-0 z-10 rounded-t-lg">
                                <h3 className="font-bold text-lg text-slate-800">{activeSection}</h3>
                            </div>
                            <div className="p-6 space-y-8">
                                {sections[activeSection].map(block => (
                                    <div key={block.key} className="group border-b border-slate-100 last:border-0 pb-8 last:pb-0">
                                        <div className="flex justify-between items-start mb-3">
                                            <label className="text-base font-semibold text-slate-700 flex items-center gap-2">
                                                {block.type === 'image' ? <ImageIcon className="text-blue-500" size={18} /> :
                                                    block.type === 'textarea' ? <FileText className="text-green-500" size={18} /> : <Type className="text-slate-500" size={18} />}
                                                {block.label}
                                            </label>
                                            <button
                                                onClick={() => setEditingMeta(editingMeta === block.key ? null : block.key)}
                                                className={`p-1.5 rounded transition-colors ${editingMeta === block.key ? 'bg-slate-200 text-slate-700' : 'text-slate-400 hover:text-brand-gold hover:bg-yellow-50'}`}
                                                title="Edit Details"
                                            >
                                                {editingMeta === block.key ? <X size={16} /> : <Edit2 size={16} />}
                                            </button>
                                        </div>

                                        {/* Key Display (Subtle) */}
                                        <div className="text-xs font-mono text-slate-400 mb-2 ml-7 bg-slate-50 inline-block px-2 py-0.5 rounded border border-slate-100">
                                            key: {block.key}
                                        </div>

                                        {editingMeta === block.key && (
                                            <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4 ml-7 animate-in fade-in slide-in-from-top-2 duration-200">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Label</label>
                                                    <input
                                                        type="text"
                                                        value={block.label}
                                                        onChange={(e) => handleChange(block.key, 'label', e.target.value)}
                                                        className="w-full text-sm p-2 border border-slate-300 rounded focus:ring-2 focus:ring-brand-gold focus:border-brand-gold outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Section Group</label>
                                                    <input
                                                        type="text"
                                                        value={block.section || ''}
                                                        onChange={(e) => handleChange(block.key, 'section', e.target.value)}
                                                        className="w-full text-sm p-2 border border-slate-300 rounded focus:ring-2 focus:ring-brand-gold focus:border-brand-gold outline-none"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex gap-3 items-start ml-7">
                                            {block.type === 'textarea' || block.type === 'markdown' ? (
                                                <textarea
                                                    value={block.value}
                                                    onChange={(e) => handleChange(block.key, 'value', e.target.value)}
                                                    className="flex-1 min-h-[120px] p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-gold focus:border-brand-gold outline-none transition-all shadow-sm text-sm leading-relaxed"
                                                />
                                            ) : (
                                                <div className="flex-1 flex gap-2">
                                                    <div className="relative flex-1">
                                                        <input
                                                            type="text"
                                                            value={block.value}
                                                            onChange={(e) => handleChange(block.key, 'value', e.target.value)}
                                                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-gold focus:border-brand-gold outline-none transition-all shadow-sm pl-3"
                                                        />
                                                        {block.type.includes('image') && (
                                                            <div className="absolute right-3 top-3 pointer-events-none">
                                                                <ImageIcon size={16} className="text-slate-300" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    {block.type.includes('image') && (
                                                        <button
                                                            onClick={() => {
                                                                setPickerTarget(block.key);
                                                                setPickerOpen(true);
                                                            }}
                                                            className="p-3 bg-white border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                                                            title="Pick Image"
                                                        >
                                                            <UploadCloud size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            <button
                                                onClick={() => handleSave(block.key, block.value, block.label, block.section)}
                                                disabled={saving === block.key}
                                                className="bg-brand-gold text-white p-3 rounded-lg hover:bg-yellow-600 disabled:opacity-50 transition-colors shadow-sm shrink-0"
                                                title="Save changes"
                                            >
                                                {saving === block.key ? <Loader2 className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />}
                                            </button>
                                        </div>

                                        {block.type === 'markdown' && (
                                            <p className="mt-2 text-xs text-slate-400 ml-7 italic">
                                                Supports markdown formatting.
                                            </p>
                                        )}
                                        {block.type.includes('image') && block.value.startsWith('/') && (
                                            <div className="mt-3 ml-7 w-32 h-20 relative rounded-md overflow-hidden border border-slate-200">
                                                {/* Preview image if valid path */}
                                                <img src={block.value} className="w-full h-full object-cover" alt="preview" onError={(e) => e.currentTarget.style.display = 'none'} />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex h-full items-center justify-center text-slate-400">
                            Select a section to edit
                        </div>
                    )}
                </div>
            </div>

            <ImagePicker
                isOpen={pickerOpen}
                onClose={() => setPickerOpen(false)}
                onSelect={handleImageSelect}
            />
        </div>
    );
};
