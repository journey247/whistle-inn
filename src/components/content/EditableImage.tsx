// src/components/content/EditableImage.tsx
import { useState } from 'react';
import Image, { ImageProps } from 'next/image';
import { useContent } from './ContentProvider';
import { Pencil } from 'lucide-react';
import { ImagePicker } from '@/components/admin/ImagePicker';
import { cn } from "@/lib/utils";

interface EditableImageProps extends Omit<ImageProps, 'src'> {
    contentKey: string;
    defaultValue: string;
    containerClassName?: string;
}

export function EditableImage({
    contentKey,
    defaultValue,
    containerClassName,
    className,
    alt,
    ...props
}: EditableImageProps) {
    const { isEditMode, content, updateContent, isAdmin } = useContent();
    const [pickerOpen, setPickerOpen] = useState(false);

    const src = content[contentKey] || defaultValue;

    const handleSelect = (url: string) => {
        updateContent(contentKey, url);
        setPickerOpen(false);
    };

    if (!isAdmin || !isEditMode) {
        return (
            <div className={cn("relative", containerClassName)}>
                <Image
                    src={src}
                    alt={alt}
                    className={className}
                    {...props}
                />
            </div>
        );
    }

    return (
        <>
            <div
                className={cn("relative group cursor-pointer", containerClassName)}
                onClick={() => setPickerOpen(true)}
            >
                <Image
                    src={src}
                    alt={alt}
                    className={cn(className, "transition-opacity group-hover:opacity-80")}
                    {...props}
                />

                {/* Overlay */}
                <div className="absolute inset-0 border-2 border-dashed border-brand-gold/50 bg-brand-gold/10 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center pointer-events-none z-10">
                    <div className="bg-white p-2 rounded-full shadow-lg">
                        <Pencil className="w-5 h-5 text-brand-gold" />
                    </div>
                </div>
            </div>

            <ImagePicker
                isOpen={pickerOpen}
                onClose={() => setPickerOpen(false)}
                onSelect={handleSelect}
            />
        </>
    );
}