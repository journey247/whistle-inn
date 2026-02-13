"use client";

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
                // Set initial active section
                const uniqueSections = Array.from(new Set(data.map((b: ContentBlock) => b.section || 'Other'))) as string[];
                if (uniqueSections.length > 0 && !uniqueSections.includes(activeSection)) {
                    if (uniqueSections.includes("Hero Section")) setActiveSection("Hero Section");
                    else setActiveSection(uniqueSections[0]);
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
                fetchContent(); // Refresh
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
        }
        setPickerOpen(false);
        setPickerTarget(null);
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

    // Group blocks by section
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
        <div className="flex flex-col h-[calc(100vh-140px)]">
            <div className="flex justify-between items-center shrink-0 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Site Content</h2>
                    <p className="text-slate-500">Manage website text, images, and headlines.</p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6 h-full min-h-0">
                {/* Sidebar Navigation */}
                <div className="w-full md:w-64 bg-white rounded-lg shadow-sm border border-slate-200 overflow-y-auto shrink-0">
                    <div className="p-3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">Sections</h4>
                        <div className="space-y-1">
                            {sortedSectionKeys.map(section => (
                                <button
                                    key={section}
                                    onClick={() => setActiveSection(section)}
                                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeSection === section
                                            ? 'bg-brand-gold text-white shadow-sm'
                                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                        }`}
                                >
                                    {section}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Editor Area */}
                <div className="flex-1 overflow-y-auto min-h-0 bg-slate-50 rounded-lg border border-slate-200">
                    {activeSection && sections[activeSection] ? (
                        <div className="bg-white m-1 rounded-lg">
                            <div className="px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10 rounded-t-lg">
                                <h3 className="font-bold text-lg text-slate-800">{activeSection}</h3>
                            </div>
                            <div className="p-6 space-y-8">
                                {sections[activeSection].map(block => (
                                    <div key={block.key} className="border-b border-slate-100 last:border-0 pb-8 last:pb-0">
                                        <div className="flex justify-between items-start mb-3">
                                            <label className="text-base font-semibold text-slate-700 flex items-center gap-2">
                                                {block.type.includes('image') ? <ImageIcon className="text-blue-500" size={18} /> :
                                                    block.type === 'textarea' ? <FileText className="text-green-500" size={18} /> :
                                                        <Type className="text-slate-500" size={18} />}
                                                {block.label}
                                            </label>
                                            <button
                                                onClick={() => setEditingMeta(editingMeta === block.key ? null : block.key)}
                                                className={`p-1.5 rounded transition-colors ${editingMeta === block.key ? 'bg-slate-200' : 'text-slate-400 hover:text-brand-gold'}`}
                                            >
                                                {editingMeta === block.key ? <X size={16} /> : <Edit2 size={16} />}
                                            </button>
                                        </div>

                                        {editingMeta === block.key && (
                                            <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs font-bold text-slate-500 uppercase">Label</label>
                                                    <input
                                                        value={block.label}
                                                        onChange={(e) => handleChange(block.key, 'label', e.target.value)}
                                                        className="w-full text-sm p-2 border border-slate-300 rounded"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-slate-500 uppercase">Section</label>
                                                    <input
                                                        value={block.section || ''}
                                                        onChange={(e) => handleChange(block.key, 'section', e.target.value)}
                                                        className="w-full text-sm p-2 border border-slate-300 rounded"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex gap-4 items-start">
                                            {block.type === 'textarea' || block.type === 'markdown' ? (
                                                <textarea
                                                    value={block.value}
                                                    onChange={(e) => handleChange(block.key, 'value', e.target.value)}
                                                    rows={4}
                                                    className="flex-1 w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-gold outline-none"
                                                />
                                            ) : (
                                                <div className="flex-1 relative">
                                                    <input
                                                        type="text"
                                                        value={block.value}
                                                        onChange={(e) => handleChange(block.key, 'value', e.target.value)}
                                                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-gold outline-none pr-10"
                                                    />
                                                    {block.type.includes('image') && (
                                                        <button
                                                            onClick={() => { setPickerTarget(block.key); setPickerOpen(true); }}
                                                            className="absolute right-2 top-2 p-1.5 text-slate-500 hover:bg-slate-100 rounded"
                                                        >
                                                            <UploadCloud size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            <button
                                                onClick={() => handleSave(block.key, block.value, block.label, block.section)}
                                                disabled={saving === block.key}
                                                className="bg-brand-gold text-white p-3 rounded-lg hover:bg-yellow-600 disabled:opacity-50"
                                            >
                                                {saving === block.key ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                                            </button>
                                        </div>
                                        {block.type.includes('image') && (
                                            <div className="mt-3 w-32 h-20 relative rounded-md overflow-hidden bg-slate-100 border border-slate-200">
                                                <img src={block.value} className="w-full h-full object-cover" alt="preview" onError={(e) => e.currentTarget.style.display = 'none'} />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-400">Select a section</div>
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
