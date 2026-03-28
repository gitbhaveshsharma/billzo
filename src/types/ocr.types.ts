// ============================================================================
// OCR TYPES — Type definitions for Image-to-Text OCR functionality
// ============================================================================

/**
 * OCR processing status
 */
export type OcrStatus = "idle" | "loading" | "recognizing" | "completed" | "error";

/**
 * OCR progress information from Tesseract worker
 */
export interface OcrProgress {
    /** Current status of the OCR process */
    status: string;
    /** Progress percentage (0-100) */
    progress: number;
}

/**
 * OCR result after text extraction
 */
export interface OcrResult {
    /** Extracted text from the image */
    text: string;
    /** Confidence score (0-100) */
    confidence: number;
}

/**
 * Cached OCR result in IndexedDB (no image data stored)
 */
export interface CachedOcrResult {
    /** Unique identifier */
    id: string;
    /** Original file name */
    fileName: string;
    /** Extracted text from OCR */
    extractedText: string;
    /** OCR confidence score */
    confidence: number;
    /** Timestamp when cached */
    cachedAt: number;
    /** Timestamp when it expires */
    expiresAt: number;
}

/**
 * Rate limit tracking entry
 */
export interface OcrRateLimitEntry {
    /** Timestamp of the upload */
    timestamp: number;
}

/**
 * OCR cache metadata
 */
export interface OcrCacheMeta {
    /** Total number of cached results */
    resultCount: number;
    /** Timestamp of last cache update */
    lastUpdated: number;
    /** Rate limit tracking (uploads in the last minute) */
    recentUploads: OcrRateLimitEntry[];
}

/**
 * Accepted image types for OCR
 */
export const OCR_ACCEPTED_TYPES = ["image/jpeg", "image/png"] as const;

/**
 * Maximum image size for OCR (10 MB)
 */
export const OCR_MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Cache duration in milliseconds (10 minutes)
 */
export const OCR_CACHE_DURATION_MS = 10 * 60 * 1000;

/**
 * Rate limit: max uploads per minute
 */
export const OCR_RATE_LIMIT_MAX = 10;

/**
 * Rate limit window in milliseconds (1 minute)
 */
export const OCR_RATE_LIMIT_WINDOW_MS = 60 * 1000;

/**
 * Supported languages for OCR
 */
export const OCR_SUPPORTED_LANGUAGES = ["eng", "hin"] as const;

export type OcrLanguage = (typeof OCR_SUPPORTED_LANGUAGES)[number];
