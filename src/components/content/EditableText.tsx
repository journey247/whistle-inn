import { useState, useRef, useEffect } from 'react';
import { useContent } from './ContentProvider';
import { Pencil, Save, X } from 'lucide-react';
import { cn } from "@/lib/utils";

interface EditableTextProps {
    contentKey: string;
    defaultValue: string;
    multiline?: boolean;
    className?: string; // Standard styling
    as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div';
    children?: React.ReactNode; // Usually just default text content from SSR
}

export function EditableText({
    contentKey,
    defaultValue,
    multiline = false,
    className,
    as: Component = 'span',
    children
}: EditableTextProps) {
    const { isEditMode, content, updateContent, isAdmin } = useContent();
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(defaultValue);
    const inputRef = useRef<HTMLElement>(null);

    // Sync context update if key exists
    useEffect(() => {
        if (content[contentKey]) {
            setValue(content[contentKey]);
        }
    }, [content, contentKey]);

    const handleSave = async () => {
        // Only trigger update if changed
        if (value !== content[contentKey]) {
            await updateContent(contentKey, value);
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setIsEditing(false);
        setValue(content[contentKey] || defaultValue);
    };

    if (!isAdmin || !isEditMode) {
        // Normal render
        return (
            <Component className={className}>
                {content[contentKey] || defaultValue}
            </Component>
        );
    }

    if (isEditing) {
        return (
            <div className="relative inline-block w-full max-w-full z-50">
                {multiline ? (
                    <textarea
                        ref={inputRef as any}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className={cn(
                            "w-full min-h-[100px] p-4 bg-white text-slate-900 border-2 border-brand-gold rounded-lg shadow-xl outline-none focus:ring-4 focus:ring-brand-gold/30 resize-none font-sans text-base leading-relaxed",
                            className?.includes("font-serif") ? "font-serif" : ""
                        )}
                        autoFocus
                    />
                ) : (
                    <input
                        ref={inputRef as any}
                        type="text"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className={cn(
                            "w-full p-2 bg-white text-slate-900 border-2 border-brand-gold rounded-lg shadow-xl outline-none focus:ring-4 focus:ring-brand-gold/30 font-inherit",
                            className
                        )}
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSave();
                            if (e.key === 'Escape') handleCancel();
                        }}
                    />
                )}

                {/* Floating controls */}
                <div className="absolute -top-12 right-0 flex gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <button
                        onClick={handleCancel}
                        className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-md transition-colors"
                        title="Cancel"
                    >
                        <X size={16} />
                    </button>
                    <button
                        onClick={handleSave}
                        className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 shadow-md transition-colors"
                        title="Save Changes"
                    >
                        <Save size={16} />
                    </button>
                </div>
                {multiline && (
                    <div className="text-xs text-slate-500 mt-1 italic text-right">
                        Click save or press Enter to submit
                    </div>
                )}
            </div>
        );
    }

    // Edit Mode Active but not currently editing this specific element
    return (
        <div
            className="group relative inline-block cursor-pointer"
            onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
            }}
        >
            <Component className={cn(
                className,
                "border border-dashed border-brand-gold/50 rounded hover:bg-brand-gold/10 transition-colors p-[2px] -m-[2px]" // Visual cue
            )}>
                {content[contentKey] || defaultValue}
            </Component>

            <div className="absolute -top-3 -right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-brand-gold text-white p-1 rounded-full shadow-sm pointer-events-none">
                <Pencil size={12} />
            </div>
        </div>
    );
}

