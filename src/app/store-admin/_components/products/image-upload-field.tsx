"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Upload, X, ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

interface ImageUploadFieldProps {
    /** Current image URL (from the form value) */
    value?: string;
    /** Called with the new public URL once uploaded, or "" when cleared */
    onChange: (url: string) => void;
    /**
     * Async upload handler — receives the raw File and must return the
     * public CDN URL on success (or throw/return null on failure).
     */
    onUpload: (file: File) => Promise<string | null>;
    disabled?: boolean;
    className?: string;
}

// ============================================================================
// ACCEPTED TYPES & MAX SIZE
// ============================================================================

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

// ============================================================================
// IMAGE UPLOAD FIELD
// Supports drag-and-drop, click-to-browse, paste, preview, and clear.
// ============================================================================

export function ImageUploadField({
    value,
    onChange,
    onUpload,
    disabled = false,
    className,
}: ImageUploadFieldProps) {
    const inputId = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [imgLoadError, setImgLoadError] = useState(false);

    // Reset image error whenever the src URL changes
    useEffect(() => {
        setImgLoadError(false);
    }, [value]);

    // ── Validate & upload ──
    const processFile = useCallback(
        async (file: File) => {
            setError(null);

            if (!ACCEPTED.includes(file.type)) {
                setError("Unsupported file type. Use JPEG, PNG, WebP, GIF, or SVG.");
                return;
            }
            if (file.size > MAX_BYTES) {
                setError("File is too large. Maximum size is 5 MB.");
                return;
            }

            setIsUploading(true);
            try {
                const url = await onUpload(file);
                if (url) {
                    onChange(url);
                } else {
                    setError("Upload failed. Please try again.");
                }
            } catch {
                setError("Upload failed. Please try again.");
            } finally {
                setIsUploading(false);
            }
        },
        [onUpload, onChange]
    );

    // ── Input change ──
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
        // Reset so the same file can be re-selected
        e.target.value = "";
    };

    // ── Drag events ──
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        if (!disabled && !isUploading) setIsDragging(true);
    };
    const handleDragLeave = () => setIsDragging(false);
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (disabled || isUploading) return;
        const file = e.dataTransfer.files?.[0];
        if (file) processFile(file);
    };

    // ── Paste (Ctrl+V) ──
    const handlePaste = useCallback(
        (e: React.ClipboardEvent) => {
            if (disabled || isUploading) return;
            const file = Array.from(e.clipboardData.items)
                .find((item) => item.kind === "file")
                ?.getAsFile();
            if (file) processFile(file);
        },
        [disabled, isUploading, processFile]
    );

    const handleClear = () => {
        setError(null);
        onChange("");
    };

    // ── Render: preview mode ──
    if (value) {
        return (
            <div className={cn("relative group w-full rounded-lg overflow-hidden border bg-muted/30", className)}>
                {imgLoadError ? (
                    <div className="w-full h-40 flex flex-col items-center justify-center gap-2 bg-muted/40 px-4 text-center">
                        <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                        <p className="text-xs text-muted-foreground">Image could not be loaded</p>
                        <p className="text-[10px] text-muted-foreground/70 break-all line-clamp-2">{value}</p>
                    </div>
                ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={value}
                        alt="Product image"
                        className="w-full h-40 object-contain"
                        onError={() => setImgLoadError(true)}
                    />
                )}
                {/* Overlay on hover — always visible when image errored */}
                <div className={cn(
                    "absolute inset-0 bg-black/40 transition-opacity flex items-center justify-center gap-2",
                    imgLoadError ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}>
                    <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={disabled || isUploading}
                        onClick={() => inputRef.current?.click()}
                        className="gap-1.5"
                    >
                        {isUploading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <Upload className="h-3.5 w-3.5" />
                        )}
                        Replace
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={disabled || isUploading}
                        onClick={handleClear}
                        className="gap-1.5"
                    >
                        <X className="h-3.5 w-3.5" />
                        Remove
                    </Button>
                </div>
                <input
                    ref={inputRef}
                    id={inputId}
                    type="file"
                    accept={ACCEPTED.join(",")}
                    className="hidden"
                    onChange={handleInputChange}
                    disabled={disabled || isUploading}
                />
            </div>
        );
    }

    // ── Render: drop-zone mode ──
    return (
        <div className={cn("space-y-1.5", className)}>
            {/* Hidden file input */}
            <input
                ref={inputRef}
                id={inputId}
                type="file"
                accept={ACCEPTED.join(",")}
                className="hidden"
                onChange={handleInputChange}
                disabled={disabled || isUploading}
            />

            {/* Drop zone */}
            <div
                role="button"
                tabIndex={0}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onPaste={handlePaste}
                onClick={() => !disabled && !isUploading && inputRef.current?.click()}
                onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
                className={cn(
                    "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors cursor-pointer select-none",
                    isDragging
                        ? "border-primary bg-primary/5"
                        : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30",
                    (disabled || isUploading) && "pointer-events-none opacity-60"
                )}
            >
                {isUploading ? (
                    <>
                        <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                        <p className="text-sm text-muted-foreground">Uploading…</p>
                    </>
                ) : (
                    <>
                        <div className="rounded-full bg-muted p-2.5">
                            <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="text-sm font-medium">
                                {isDragging ? "Drop image here" : "Drag & drop or click to upload"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                JPEG, PNG, WebP, GIF, SVG · max 5 MB
                            </p>
                        </div>
                    </>
                )}
            </div>

            {/* Error */}
            {error && (
                <p className="text-xs text-destructive">{error}</p>
            )}
        </div>
    );
}
