"use client";

// ============================================================================
// USE OCR HOOK — Tesseract.js worker management with proper lifecycle
// Handles OCR processing, progress tracking, and worker cleanup
// ============================================================================

import { useState, useCallback, useRef, useEffect } from "react";
import type { OcrStatus, OcrProgress, OcrResult, OcrLanguage } from "@/types/ocr.types";
import { OCR_ACCEPTED_TYPES, OCR_MAX_FILE_SIZE } from "@/types/ocr.types";

// ============================================================================
// TYPES
// ============================================================================

interface UseOcrOptions {
    /** Language for OCR recognition (default: "eng") */
    language?: OcrLanguage;
    /** Callback when OCR completes successfully */
    onSuccess?: (result: OcrResult) => void;
    /** Callback when OCR fails */
    onError?: (error: string) => void;
}

interface UseOcrReturn {
    /** Current OCR status */
    status: OcrStatus;
    /** Progress information during processing */
    progress: OcrProgress;
    /** Extracted text result */
    result: OcrResult | null;
    /** Error message if any */
    error: string | null;
    /** Whether OCR is currently processing */
    isProcessing: boolean;
    /** Process an image file */
    processImage: (file: File) => Promise<OcrResult | null>;
    /** Process an image from base64 data */
    processBase64: (base64: string) => Promise<OcrResult | null>;
    /** Reset the OCR state */
    reset: () => void;
    /** Validate an image file */
    validateFile: (file: File) => { valid: boolean; error?: string };
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useOcr(options: UseOcrOptions = {}): UseOcrReturn {
    const { language = "eng", onSuccess, onError } = options;

    // State
    const [status, setStatus] = useState<OcrStatus>("idle");
    const [progress, setProgress] = useState<OcrProgress>({ status: "", progress: 0 });
    const [result, setResult] = useState<OcrResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Worker ref for cleanup
    const workerRef = useRef<TesseractWorker | null>(null);
    const abortRef = useRef(false);

    // Cleanup worker on unmount
    useEffect(() => {
        return () => {
            abortRef.current = true;
            if (workerRef.current) {
                workerRef.current.terminate().catch(() => {
                    // Silently fail termination
                });
                workerRef.current = null;
            }
        };
    }, []);

    /**
     * Validate image file
     */
    const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
        // Check file type
        if (!OCR_ACCEPTED_TYPES.includes(file.type as typeof OCR_ACCEPTED_TYPES[number])) {
            return {
                valid: false,
                error: "Unsupported file type. Please use PNG or JPG images.",
            };
        }

        // Check file size
        if (file.size > OCR_MAX_FILE_SIZE) {
            return {
                valid: false,
                error: `File is too large. Maximum size is ${OCR_MAX_FILE_SIZE / (1024 * 1024)} MB.`,
            };
        }

        return { valid: true };
    }, []);

    /**
     * Reset OCR state
     */
    const reset = useCallback(() => {
        setStatus("idle");
        setProgress({ status: "", progress: 0 });
        setResult(null);
        setError(null);
    }, []);

    /**
     * Create and initialize Tesseract worker
     */
    const createWorker = useCallback(async () => {
        // Dynamically import tesseract.js to avoid SSR issues
        const { createWorker: createTesseractWorker } = await import("tesseract.js");
        
        const worker = await createTesseractWorker(language, 1, {
            logger: (m: { status: string; progress?: number }) => {
                if (abortRef.current) return;
                
                // Map Tesseract status to our progress
                if (m.status === "recognizing text") {
                    setProgress({
                        status: "Recognizing text...",
                        progress: Math.round((m.progress || 0) * 100),
                    });
                } else if (m.status === "loading tesseract core") {
                    setProgress({
                        status: "Loading OCR engine...",
                        progress: Math.round((m.progress || 0) * 30),
                    });
                } else if (m.status === "initializing tesseract") {
                    setProgress({
                        status: "Initializing...",
                        progress: 30 + Math.round((m.progress || 0) * 10),
                    });
                } else if (m.status === "loading language traineddata") {
                    setProgress({
                        status: "Loading language data...",
                        progress: 40 + Math.round((m.progress || 0) * 20),
                    });
                } else if (m.status === "initializing api") {
                    setProgress({
                        status: "Preparing...",
                        progress: 60,
                    });
                }
            },
        });

        return worker;
    }, [language]);

    /**
     * Process image and extract text
     */
    const processImageData = useCallback(
        async (imageSource: File | string): Promise<OcrResult | null> => {
            // Reset abort flag
            abortRef.current = false;
            
            // Reset state
            setError(null);
            setResult(null);
            setStatus("loading");
            setProgress({ status: "Preparing...", progress: 0 });

            try {
                // Create worker
                const worker = await createWorker();
                workerRef.current = worker;

                if (abortRef.current) {
                    await worker.terminate();
                    return null;
                }

                setStatus("recognizing");

                // Perform OCR
                const { data } = await worker.recognize(imageSource);

                if (abortRef.current) {
                    await worker.terminate();
                    return null;
                }

                // Clean up worker immediately after use
                await worker.terminate();
                workerRef.current = null;

                const ocrResult: OcrResult = {
                    text: data.text.trim(),
                    confidence: data.confidence,
                };

                setResult(ocrResult);
                setStatus("completed");
                setProgress({ status: "Complete", progress: 100 });
                
                onSuccess?.(ocrResult);
                return ocrResult;
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "OCR processing failed";
                setError(errorMessage);
                setStatus("error");
                setProgress({ status: "Error", progress: 0 });
                
                onError?.(errorMessage);

                // Clean up worker on error
                if (workerRef.current) {
                    await workerRef.current.terminate().catch(() => {});
                    workerRef.current = null;
                }

                return null;
            }
        },
        [createWorker, onSuccess, onError]
    );

    /**
     * Process an image file
     */
    const processImage = useCallback(
        async (file: File): Promise<OcrResult | null> => {
            const validation = validateFile(file);
            if (!validation.valid) {
                setError(validation.error || "Invalid file");
                setStatus("error");
                onError?.(validation.error || "Invalid file");
                return null;
            }

            return processImageData(file);
        },
        [validateFile, processImageData, onError]
    );

    /**
     * Process an image from base64 data
     */
    const processBase64 = useCallback(
        async (base64: string): Promise<OcrResult | null> => {
            if (!base64 || !base64.startsWith("data:image/")) {
                const errorMsg = "Invalid image data";
                setError(errorMsg);
                setStatus("error");
                onError?.(errorMsg);
                return null;
            }

            return processImageData(base64);
        },
        [processImageData, onError]
    );

    return {
        status,
        progress,
        result,
        error,
        isProcessing: status === "loading" || status === "recognizing",
        processImage,
        processBase64,
        reset,
        validateFile,
    };
}

// ============================================================================
// TYPE DECLARATIONS FOR TESSERACT WORKER
// ============================================================================

interface TesseractWorker {
    recognize(image: File | string | Blob): Promise<{ data: TesseractRecognizeResult }>;
    terminate(): Promise<unknown>;
}

interface TesseractRecognizeResult {
    text: string;
    confidence: number;
}
