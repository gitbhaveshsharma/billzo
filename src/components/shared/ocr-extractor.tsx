"use client";

// ============================================================================
// OCR SHEET — Global Image-to-Text tool accessible via Alt+Q
// Opens from right side, shows OCR results with 10-minute expiration
// ============================================================================

import { useState, useCallback, useEffect, useRef, useId } from "react";
import {
    ImageIcon,
    Loader2,
    Clock,
    Trash2,
    AlertCircle,
    ScanText,
    FileText,
    ChevronDown,
    ChevronUp,
    Copy,
    Check,
} from "lucide-react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useOcr } from "@/hooks/use-ocr";
import {
    cacheOcrResult,
    getAllCachedResults,
    deleteCachedResult,
    checkRateLimit,
    formatRemainingTime,
    getRemainingTime,
    clearOcrCache,
} from "@/lib/ocr-cache";
import type { CachedOcrResult, OcrLanguage } from "@/types/ocr.types";
import { OCR_ACCEPTED_TYPES, OCR_RATE_LIMIT_MAX } from "@/types/ocr.types";
import toast from "react-hot-toast";

// ============================================================================
// TYPES
// ============================================================================

interface OcrSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function OcrSheet({ open, onOpenChange }: OcrSheetProps) {
    const inputId = useId();
    const inputRef = useRef<HTMLInputElement>(null);

    const [isDragging, setIsDragging]       = useState(false);
    const [cachedResults, setCachedResults] = useState<CachedOcrResult[]>([]);
    const [uploadError, setUploadError]     = useState<string | null>(null);
    const [copiedId, setCopiedId]           = useState<string | null>(null);
    const [expandedId, setExpandedId]       = useState<string | null>(null);
    const [rateLimit, setRateLimit]         = useState({ remaining: OCR_RATE_LIMIT_MAX, resetIn: 0 });
    const currentFileName                   = useRef<string | null>(null);

    // Use ref for updateRateLimit so onSuccess can access latest version
    const updateRateLimitRef = useRef<(() => Promise<void>) | null>(null);
    
    const updateRateLimit = useCallback(async () => {
        const limit = await checkRateLimit();
        setRateLimit({ remaining: limit.remaining, resetIn: limit.resetIn });
    }, []);
    
    updateRateLimitRef.current = updateRateLimit;
    
    const loadCachedResults = useCallback(async () => {
        setCachedResults(await getAllCachedResults());
    }, []);

    const {
        progress,
        isProcessing,
        processImage,
        validateFile,
    } = useOcr({
        language: "eng" as OcrLanguage,
        onSuccess: async (res) => {
            if (currentFileName.current) {
                const cached = await cacheOcrResult(
                    currentFileName.current,
                    res.text,
                    res.confidence
                );
                if (cached) {
                    setCachedResults((prev) => [cached, ...prev]);
                    setExpandedId(cached.id);
                }
                // Update rate limit after caching (which records the upload)
                await updateRateLimitRef.current?.();
            }
            currentFileName.current = null;
        },
    });

    useEffect(() => {
        if (open) {
            loadCachedResults();
            updateRateLimitRef.current?.();
        }
    }, [open, loadCachedResults]);

    useEffect(() => {
        if (!open || cachedResults.length === 0) return;
        const interval = setInterval(() => {
            setCachedResults((prev) => {
                const valid = prev.filter((r) => getRemainingTime(r.expiresAt) > 0);
                if (expandedId && !valid.find((r) => r.id === expandedId)) setExpandedId(null);
                return valid.length !== prev.length ? valid : [...prev];
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [open, cachedResults.length, expandedId]);

    useEffect(() => {
        if (!copiedId) return;
        const t = setTimeout(() => setCopiedId(null), 2000);
        return () => clearTimeout(t);
    }, [copiedId]);

    const handleToggleExpand = useCallback((id: string) => {
        setExpandedId((prev) => (prev === id ? null : id));
    }, []);

    const handleFile = useCallback(
        async (file: File) => {
            setUploadError(null);
            const validation = validateFile(file);
            if (!validation.valid) { setUploadError(validation.error || "Invalid file"); return; }
            const limit = await checkRateLimit();
            if (!limit.canUpload) {
                const secs = Math.ceil(limit.resetIn / 1000);
                setUploadError(`Rate limit reached. Try again in ${secs}s`);
                toast.error(`Rate limit: ${OCR_RATE_LIMIT_MAX} uploads per minute`);
                return;
            }
            currentFileName.current = file.name;
            // Rate limit will be updated in onSuccess callback after caching
            await processImage(file);
        },
        [validateFile, processImage]
    );

    const handleCopy = useCallback(async (result: CachedOcrResult) => {
        try {
            await navigator.clipboard.writeText(result.extractedText);
            setCopiedId(result.id);
            toast.success("Copied to clipboard");
        } catch {
            toast.error("Failed to copy text");
        }
    }, []);

    const handleDelete = useCallback(
        async (id: string) => {
            await deleteCachedResult(id);
            setCachedResults((prev) => prev.filter((r) => r.id !== id));
            if (expandedId === id) setExpandedId(null);
        },
        [expandedId]
    );

    const handleClearAll = useCallback(async () => {
        await clearOcrCache();
        setCachedResults([]);
        setExpandedId(null);
        toast.success("All results cleared");
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
        e.target.value = "";
    };

    const handleDragOver  = (e: React.DragEvent) => { e.preventDefault(); if (!isProcessing) setIsDragging(true); };
    const handleDragLeave = () => setIsDragging(false);
    const handleDrop      = (e: React.DragEvent) => {
        e.preventDefault(); setIsDragging(false);
        if (isProcessing) return;
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
    };
    const handlePaste = useCallback(
        (e: React.ClipboardEvent) => {
            if (isProcessing) return;
            const file = Array.from(e.clipboardData.items).find((i) => i.kind === "file")?.getAsFile();
            if (file) handleFile(file);
        },
        [isProcessing, handleFile]
    );

    return (
        <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
            {/*
             * Layout strategy
             * ───────────────
             * SheetContent  → flex-col h-full p-0
             *   SheetHeader → shrink-0  (always visible, never scrolls away)
             *   Separator
             *   Body div    → flex-1 min-h-0 flex-col  (takes all remaining height)
             *     upload / error zone  → shrink-0
             *     Separator
             *     results header       → shrink-0
             *     ScrollArea           → flex-1 min-h-0  ← THIS makes it scroll
             */}
            <SheetContent
                side="right"
                className="z-[80] w-full sm:max-w-xl flex flex-col h-full p-0 gap-0 overflow-hidden"
            >
                {/* ── Fixed header ── */}
                <SheetHeader className="px-6 pt-6 pb-4 shrink-0">
                    <SheetTitle className="flex items-center gap-2">
                        <ScanText className="h-5 w-5 text-primary" />
                        Text Extractor (OCR)
                    </SheetTitle>
                    <SheetDescription>
                        Upload an image to extract text. Results are saved for 10 minutes.
                    </SheetDescription>
                </SheetHeader>

                <Separator className="shrink-0" />

                {/* ── Scrollable body ── */}
                <div
                    className="flex-1 min-h-0 flex flex-col px-6 py-4 gap-4"
                    onPaste={handlePaste}
                >
                    {/* Rate limit row */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground shrink-0">
                        <span>
                            Uploads remaining:{" "}
                            <span className={cn("font-medium", rateLimit.remaining === 0 && "text-destructive")}>
                                {rateLimit.remaining}/{OCR_RATE_LIMIT_MAX}
                            </span>
                        </span>
                        <span className="text-[10px]">
                            Press{" "}
                            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Alt+Q</kbd>{" "}
                            to toggle
                        </span>
                    </div>

                    {/* Upload / processing zone */}
                    <div className="shrink-0 space-y-2">
                        {isProcessing ? (
                            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                                <div className="flex items-center gap-3">
                                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                    <span className="text-sm font-medium">{progress.status}</span>
                                </div>
                                <Progress value={progress.progress} showLabel size="md" />
                            </div>
                        ) : (
                            <>
                                <input
                                    ref={inputRef}
                                    id={inputId}
                                    type="file"
                                    accept={OCR_ACCEPTED_TYPES.join(",")}
                                    className="hidden"
                                    onChange={handleInputChange}
                                />
                                <div
                                    role="button"
                                    tabIndex={0}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={() => inputRef.current?.click()}
                                    onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
                                    className={cn(
                                        "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors cursor-pointer select-none",
                                        isDragging
                                            ? "border-primary bg-primary/5"
                                            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30",
                                        rateLimit.remaining === 0 && "opacity-50 pointer-events-none"
                                    )}
                                >
                                    <div className="rounded-full bg-muted p-2.5">
                                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-medium">
                                            {isDragging ? "Drop image here" : "Upload Image"}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            Drag & drop, click, or paste · PNG, JPG
                                        </p>
                                    </div>
                                </div>
                            </>
                        )}

                        {uploadError && (
                            <div className="flex items-center gap-2 text-xs text-destructive">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                {uploadError}
                            </div>
                        )}
                    </div>

                    <Separator className="shrink-0" />

                    {/* ── Results panel — takes all remaining vertical space ── */}
                    <div className="flex-1 min-h-0 flex flex-col gap-2">

                        {/* Section heading — always visible */}
                        <div className="flex items-center justify-between shrink-0">
                            <h3 className="text-sm font-medium flex items-center gap-1.5">
                                <FileText className="h-4 w-4" />
                                Recent Extractions
                                {cachedResults.length > 0 && (
                                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                                        {cachedResults.length}
                                    </Badge>
                                )}
                            </h3>
                            {cachedResults.length > 0 && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleClearAll}
                                    className="h-7 text-xs text-muted-foreground hover:text-destructive"
                                >
                                    Clear All
                                </Button>
                            )}
                        </div>

                        {/*
                         * ScrollArea fills all remaining height.
                         * flex-1 min-h-0 is the critical combo — without min-h-0
                         * the flex child won't shrink below its content height.
                         */}
                        <ScrollArea className="flex-1 min-h-0">
                            {cachedResults.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                    <FileText className="h-9 w-9 mb-3 opacity-40" />
                                    <p className="text-sm font-medium">No extractions yet</p>
                                    <p className="text-xs mt-1">Upload an image to get started</p>
                                </div>
                            ) : (
                                <div className="space-y-3 pr-3 pb-6">
                                    {cachedResults.map((result) => (
                                        <ResultCard
                                            key={result.id}
                                            result={result}
                                            isCopied={copiedId === result.id}
                                            isExpanded={expandedId === result.id}
                                            onCopy={() => handleCopy(result)}
                                            onDelete={() => handleDelete(result.id)}
                                            onToggleExpand={() => handleToggleExpand(result.id)}
                                        />
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}

// ============================================================================
// RESULT CARD
// ============================================================================

interface ResultCardProps {
    result: CachedOcrResult;
    isCopied: boolean;
    isExpanded: boolean;
    onCopy: () => void;
    onDelete: () => void;
    onToggleExpand: () => void;
}

function ResultCard({ result, isCopied, isExpanded, onCopy, onDelete, onToggleExpand }: ResultCardProps) {
    const remaining = formatRemainingTime(result.expiresAt);
    const isLong    = result.extractedText?.length > 120;

    return (
        <div
            className={cn(
                "rounded-lg border bg-card transition-all duration-200",
                isExpanded && "ring-1 ring-primary/25 shadow-sm"
            )}
        >
            {/* Header row */}
            <div className="flex items-start justify-between gap-2 p-3">
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{result.fileName}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            Expires in {remaining}
                        </span>
                        {result.confidence > 0 && (
                            <>
                                <span className="text-muted-foreground text-xs">·</span>
                                <Badge variant="outline" className="h-4 px-1.5 text-[10px] font-normal">
                                    {Math.round(result.confidence)}% confident
                                </Badge>
                            </>
                        )}
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={onToggleExpand}
                        className={cn(
                            "h-7 w-7",
                            isExpanded ? "text-primary" : "text-muted-foreground hover:text-foreground"
                        )}
                        title={isExpanded ? "Collapse" : "Expand"}
                    >
                        {isExpanded
                            ? <ChevronUp className="h-3.5 w-3.5" />
                            : <ChevronDown className="h-3.5 w-3.5" />
                        }
                    </Button>
                    <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={onCopy}
                        className="h-7 w-7"
                        title="Copy text"
                    >
                        {isCopied
                            ? <Check className="h-3.5 w-3.5 text-green-500" />
                            : <Copy className="h-3.5 w-3.5" />
                        }
                    </Button>
                    <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={onDelete}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        title="Delete"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>

            {/* Text content */}
            <div className="px-3 pb-3">
                <div
                    className={cn(
                        "rounded-md bg-muted/40 p-2.5 overflow-hidden transition-[max-height] duration-300 ease-in-out",
                        isExpanded ? "max-h-[500px] overflow-y-auto" : "max-h-[90px]"
                    )}
                >
                    {result.extractedText ? (
                        <p className="text-xs whitespace-pre-wrap break-words leading-relaxed">
                            {result.extractedText}
                        </p>
                    ) : (
                        <p className="text-xs text-muted-foreground italic">
                            No text could be extracted
                        </p>
                    )}
                </div>

                {/* "Show full text" nudge when collapsed + long content */}
                {!isExpanded && isLong && (
                    <button
                        type="button"
                        onClick={onToggleExpand}
                        className="mt-1.5 w-full text-center text-[11px] text-primary hover:underline"
                    >
                        Show full text ↓
                    </button>
                )}
            </div>
        </div>
    );
}

export type { OcrSheetProps };