// ============================================================================
// OCR CACHE — IndexedDB persistence for OCR results with auto-expiration
// Stores only file name + extracted text for 10 minutes (no image data)
// Includes rate limiting (max 10 uploads per minute)
// ============================================================================

import { openDB, type IDBPDatabase } from "idb";
import type { CachedOcrResult, OcrCacheMeta, OcrRateLimitEntry } from "@/types/ocr.types";
import {
    OCR_CACHE_DURATION_MS,
    OCR_RATE_LIMIT_MAX,
    OCR_RATE_LIMIT_WINDOW_MS,
} from "@/types/ocr.types";

// ============================================================================
// DATABASE CONFIGURATION
// ============================================================================

const DB_NAME = "ocr-cache";
const DB_VERSION = 2; // Bumped version for schema change
const RESULTS_STORE = "results";
const META_STORE = "meta";
const META_KEY = "ocr-meta";

// ============================================================================
// DATABASE SETUP
// ============================================================================

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
    if (!dbPromise) {
        dbPromise = openDB(DB_NAME, DB_VERSION, {
            upgrade(db, oldVersion) {
                // Clean up old store if exists (schema migration)
                if (oldVersion < 2) {
                    if (db.objectStoreNames.contains("images")) {
                        db.deleteObjectStore("images");
                    }
                }
                // Results store — keyed by unique ID
                if (!db.objectStoreNames.contains(RESULTS_STORE)) {
                    const store = db.createObjectStore(RESULTS_STORE, { keyPath: "id" });
                    store.createIndex("expiresAt", "expiresAt");
                }
                // Meta store — cache metadata + rate limiting
                if (!db.objectStoreNames.contains(META_STORE)) {
                    db.createObjectStore(META_STORE);
                }
            },
        });
    }
    return dbPromise;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a unique ID for cached results
 */
function generateResultId(): string {
    return `ocr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ============================================================================
// RATE LIMITING
// ============================================================================

/**
 * Check if user can upload (rate limit check)
 * @returns Object with canUpload boolean and remaining uploads count
 */
export async function checkRateLimit(): Promise<{
    canUpload: boolean;
    remaining: number;
    resetIn: number;
}> {
    try {
        const db = await getDb();
        const meta = await db.get(META_STORE, META_KEY) as OcrCacheMeta | undefined;
        const now = Date.now();
        
        // Filter out old entries outside the rate limit window
        const recentUploads = (meta?.recentUploads || []).filter(
            (entry) => now - entry.timestamp < OCR_RATE_LIMIT_WINDOW_MS
        );
        
        const remaining = OCR_RATE_LIMIT_MAX - recentUploads.length;
        const canUpload = remaining > 0;
        
        // Calculate reset time (when oldest entry expires)
        let resetIn = 0;
        if (!canUpload && recentUploads.length > 0) {
            const oldestEntry = recentUploads.reduce((min, e) => 
                e.timestamp < min.timestamp ? e : min
            );
            resetIn = Math.max(0, OCR_RATE_LIMIT_WINDOW_MS - (now - oldestEntry.timestamp));
        }
        
        return { canUpload, remaining: Math.max(0, remaining), resetIn };
    } catch {
        // On error, allow upload
        return { canUpload: true, remaining: OCR_RATE_LIMIT_MAX, resetIn: 0 };
    }
}

/**
 * Record an upload for rate limiting
 */
async function recordUpload(db: IDBPDatabase): Promise<void> {
    try {
        const meta = await db.get(META_STORE, META_KEY) as OcrCacheMeta | undefined;
        const now = Date.now();
        
        // Filter out old entries and add new one
        const recentUploads: OcrRateLimitEntry[] = [
            ...(meta?.recentUploads || []).filter(
                (entry) => now - entry.timestamp < OCR_RATE_LIMIT_WINDOW_MS
            ),
            { timestamp: now },
        ];
        
        const updatedMeta: OcrCacheMeta = {
            resultCount: meta?.resultCount || 0,
            lastUpdated: now,
            recentUploads,
        };
        
        await db.put(META_STORE, updatedMeta, META_KEY);
    } catch {
        // Silently fail
    }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Cache an OCR result (only file name + extracted text, no image data)
 * @returns The cached result or null if rate limited
 */
export async function cacheOcrResult(
    fileName: string,
    extractedText: string,
    confidence: number
): Promise<CachedOcrResult | null> {
    const db = await getDb();
    const now = Date.now();

    // Check rate limit
    const { canUpload } = await checkRateLimit();
    if (!canUpload) {
        return null;
    }

    const cachedResult: CachedOcrResult = {
        id: generateResultId(),
        fileName,
        extractedText,
        confidence,
        cachedAt: now,
        expiresAt: now + OCR_CACHE_DURATION_MS,
    };

    await db.put(RESULTS_STORE, cachedResult);

    // Record upload for rate limiting
    await recordUpload(db);
    
    // Update meta
    await updateCacheMeta(db);

    return cachedResult;
}

/**
 * Get a cached result by ID
 */
export async function getCachedResult(id: string): Promise<CachedOcrResult | null> {
    try {
        const db = await getDb();
        const result = await db.get(RESULTS_STORE, id);
        
        if (!result) return null;
        
        // Check if expired
        if (Date.now() > result.expiresAt) {
            await deleteCachedResult(id);
            return null;
        }
        
        return result as CachedOcrResult;
    } catch {
        return null;
    }
}

/**
 * Get all cached results (non-expired)
 */
export async function getAllCachedResults(): Promise<CachedOcrResult[]> {
    try {
        const db = await getDb();
        const allResults = await db.getAll(RESULTS_STORE);
        const now = Date.now();
        
        // Filter out expired results
        const validResults = allResults.filter((r) => r.expiresAt > now) as CachedOcrResult[];
        
        // Clean up expired results in background
        const expiredResults = allResults.filter((r) => r.expiresAt <= now);
        if (expiredResults.length > 0) {
            cleanupExpiredResults().catch(() => {});
        }
        
        // Sort by cachedAt descending (newest first)
        return validResults.sort((a, b) => b.cachedAt - a.cachedAt);
    } catch {
        return [];
    }
}

/**
 * Delete a cached result by ID
 */
export async function deleteCachedResult(id: string): Promise<void> {
    try {
        const db = await getDb();
        await db.delete(RESULTS_STORE, id);
        await updateCacheMeta(db);
    } catch {
        console.warn("[OCR Cache] Failed to delete cached result");
    }
}

/**
 * Clear all cached OCR results
 */
export async function clearOcrCache(): Promise<void> {
    try {
        const db = await getDb();
        const tx = db.transaction([RESULTS_STORE, META_STORE], "readwrite");
        await tx.objectStore(RESULTS_STORE).clear();
        await tx.objectStore(META_STORE).clear();
        await tx.done;
    } catch {
        console.warn("[OCR Cache] Failed to clear cache");
    }
}

/**
 * Clean up expired results from cache
 */
export async function cleanupExpiredResults(): Promise<number> {
    try {
        const db = await getDb();
        const now = Date.now();
        const allResults = await db.getAll(RESULTS_STORE);
        
        let deletedCount = 0;
        const tx = db.transaction(RESULTS_STORE, "readwrite");
        
        for (const result of allResults) {
            if (result.expiresAt <= now) {
                await tx.store.delete(result.id);
                deletedCount++;
            }
        }
        
        await tx.done;
        
        if (deletedCount > 0) {
            await updateCacheMeta(db);
        }
        
        return deletedCount;
    } catch {
        return 0;
    }
}

/**
 * Get cache metadata including rate limit info
 */
export async function getOcrCacheMeta(): Promise<OcrCacheMeta | null> {
    try {
        const db = await getDb();
        const meta = await db.get(META_STORE, META_KEY);
        return (meta as OcrCacheMeta) ?? null;
    } catch {
        return null;
    }
}

/**
 * Calculate remaining time until result expires
 */
export function getRemainingTime(expiresAt: number): number {
    const remaining = expiresAt - Date.now();
    return Math.max(0, remaining);
}

/**
 * Format remaining time as human-readable string
 */
export function formatRemainingTime(expiresAt: number): string {
    const remaining = getRemainingTime(expiresAt);
    
    if (remaining <= 0) return "Expired";
    
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    
    if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

async function updateCacheMeta(db: IDBPDatabase): Promise<void> {
    try {
        const existingMeta = await db.get(META_STORE, META_KEY) as OcrCacheMeta | undefined;
        const allResults = await db.getAll(RESULTS_STORE);
        const now = Date.now();
        const validCount = allResults.filter((r) => r.expiresAt > now).length;
        
        const meta: OcrCacheMeta = {
            resultCount: validCount,
            lastUpdated: now,
            recentUploads: existingMeta?.recentUploads || [],
        };
        
        await db.put(META_STORE, meta, META_KEY);
    } catch {
        // Silently fail meta update
    }
}
