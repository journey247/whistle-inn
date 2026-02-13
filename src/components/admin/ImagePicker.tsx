"use client";

import { useState, useEffect } from 'react';
import { X, Upload, Image as ImageIcon, Loader2, Check } from 'lucide-react';
import { useToast } from "@/components/ui/toast-context";

interface ImagePickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (url: string) => void;
}

export function ImagePicker({ isOpen, onClose, onSelect }: ImagePickerProps) {
    const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');
    const [images, setImages] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        if (isOpen && activeTab === 'library') {
            fetchImages();
        }
    }, [isOpen, activeTab]);

    const fetchImages = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('admin_token');
            const res = await fetch('/api/admin/images', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setImages(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const token = localStorage.getItem('admin_token');
            const res = await fetch('/api/admin/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                addToast("Image uploaded successfully", "success");
                onSelect(data.url); // Auto select uploaded image
                onClose();
            } else {
                throw new Error("Upload failed");
            }
        } catch (error) {
            addToast("Failed to upload image", "error");
        } finally {
            setUploading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800">Select Image</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200">
                    <button
                        onClick={() => setActiveTab('library')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'library' ? 'text-brand-gold border-b-2 border-brand-gold bg-yellow-50/50' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        Image Library
                    </button>
                    <button
                        onClick={() => setActiveTab('upload')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'upload' ? 'text-brand-gold border-b-2 border-brand-gold bg-yellow-50/50' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        Upload New
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
                    {activeTab === 'library' && (
                        <>
                            {loading ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="animate-spin text-brand-gold w-8 h-8" />
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {images.map((img, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => { onSelect(img); onClose(); }}
                                            className="group relative aspect-square rounded-lg overflow-hidden border border-slate-200 hover:border-brand-gold hover:ring-2 hover:ring-brand-gold/20 transition-all bg-white"
                                        >
                                            <img src={img} alt="Library asset" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                        </button>
                                    ))}
                                    {images.length === 0 && (
                                        <div className="col-span-full text-center py-12 text-slate-400">
                                            No images found locally. Try uploading one!
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {activeTab === 'upload' && (
                        <div className="flex flex-col items-center justify-center h-full min-h-[300px] border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-white hover:border-brand-gold/50 transition-colors">
                            {uploading ? (
                                <div className="text-center">
                                    <Loader2 className="animate-spin w-12 h-12 text-brand-gold mx-auto mb-4" />
                                    <p className="text-slate-600">Uploading...</p>
                                </div>
                            ) : (
                                <>
                                    <div className="w-16 h-16 bg-brand-gold/10 text-brand-gold rounded-full flex items-center justify-center mb-4">
                                        <Upload className="w-8 h-8" />
                                    </div>
                                    <h4 className="text-lg font-semibold text-slate-800 mb-2">Click to Upload</h4>
                                    <p className="text-slate-500 mb-6 text-center max-w-xs">
                                        Supports JPG, PNG, WEBP, AVIF. Max 5MB.
                                    </p>
                                    <label className="cursor-pointer">
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleFileUpload}
                                        />
                                        <span className="bg-brand-gold text-white px-6 py-2.5 rounded-lg font-medium hover:bg-yellow-600 transition-colors shadow-lg hover:shadow-xl">
                                            Choose File
                                        </span>
                                    </label>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
