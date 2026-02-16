import { MIDDLEWARE_CONFIG } from "@/config/middleware.config";

// ============================================================================
// Structured Logger — Middleware & Auth event logging
// ============================================================================

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogMeta {
  userId?: string;
  ip?: string;
  path?: string;
  role?: string;
  reason?: string;
  [key: string]: unknown;
}

const LOG_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/** Whether the current config level allows this log level */
function shouldLog(level: LogLevel): boolean {
  if (!MIDDLEWARE_CONFIG.logging.enabled) return false;
  const configured = MIDDLEWARE_CONFIG.logging.level;
  return LOG_PRIORITY[level] >= LOG_PRIORITY[configured];
}

/** Format a structured log line */
function formatLog(
  level: LogLevel,
  category: string,
  message: string,
  meta?: LogMeta
): string {
  const timestamp = new Date().toISOString();
  const base = `[${timestamp}] [${level.toUpperCase()}] [${category}] ${message}`;
  if (!meta || Object.keys(meta).length === 0) return base;
  return `${base} ${JSON.stringify(meta)}`;
}

/** Emit a log to the console (swap with external service if needed) */
function emit(level: LogLevel, formatted: string): void {
  const fn = level === "error"
    ? console.error
    : level === "warn"
      ? console.warn
      : console.log;
  fn(formatted);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Log a middleware event */
export function logMiddlewareEvent(
  level: LogLevel,
  message: string,
  meta?: LogMeta
): void {
  if (!shouldLog(level)) return;
  emit(level, formatLog(level, "MIDDLEWARE", message, meta));
}

/** Log an authentication event */
export function logAuthEvent(
  level: LogLevel,
  message: string,
  meta?: LogMeta
): void {
  if (!shouldLog(level)) return;
  emit(level, formatLog(level, "AUTH", message, meta));
}

/** Log a route access attempt */
export function logRouteAccess(
  path: string,
  userId: string | undefined,
  result: "allowed" | "denied" | "redirected",
  meta?: LogMeta
): void {
  if (!MIDDLEWARE_CONFIG.logging.logRouteAccess) return;
  const level: LogLevel = result === "denied" ? "warn" : "info";
  logMiddlewareEvent(level, `Route ${result}: ${path}`, {
    userId,
    path,
    ...meta,
  });
}

/** Log an unauthorized access attempt */
export function logUnauthorizedAccess(
  path: string,
  userId: string | undefined,
  reason: string,
  meta?: LogMeta
): void {
  if (!MIDDLEWARE_CONFIG.logging.logUnauthorizedAccess) return;
  logMiddlewareEvent("warn", `Unauthorized: ${path}`, {
    userId,
    path,
    reason,
    ...meta,
  });
}
