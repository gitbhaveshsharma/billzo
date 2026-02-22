import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getRouteConfig } from "@/config/routes.config";
import { hasAnyRole } from "@/config/roles.config";
import { MIDDLEWARE_CONFIG } from "@/config/middleware.config";
import type { RoleName, StoreStatus, Json } from "@/types/database.types";

// ============================================================================
// Logger — minimal inline logger for edge runtime
// ============================================================================

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_RANK: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const { logging } = MIDDLEWARE_CONFIG;
  if (!logging.enabled) return;
  if (LOG_RANK[level] < LOG_RANK[logging.level]) return;

  const ts = new Date().toISOString();
  const line = `[${ts}] [${level.toUpperCase()}] [MW] ${message}`;
  const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  fn(meta ? `${line} ${JSON.stringify(meta)}` : line);
}

/** Verbose console.log only in dev */
function verbose(label: string, data: Record<string, unknown>) {
  if (MIDDLEWARE_CONFIG.logging.verboseConsole) {
    console.log(label, data);
  }
}

// ============================================================================
// In-memory rate limiter (per-instance, resets on restart — production should
// use Redis/Upstash. This is a lightweight edge-compatible default.)
// ============================================================================

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

// ============================================================================
// Request deduplication — prevents duplicate Supabase calls during HMR / fast
// refresh. Caches middleware results per (userId × path) for a short window.
// ============================================================================

interface CachedResult {
  response: Response;
  timestamp: number;
}

const DEDUP_WINDOW_MS = 2000; // 2 seconds
const requestCache = new Map<string, CachedResult>();

function getCachedResponse(userId: string, pathname: string): NextResponse | null {
  const key = `${userId}:${pathname}`;
  const cached = requestCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > DEDUP_WINDOW_MS) {
    requestCache.delete(key);
    return null;
  }
  // Return a cloned response so headers aren't shared
  return new NextResponse(cached.response.body, {
    status: cached.response.status,
    headers: new Headers(cached.response.headers),
  });
}

function cacheResponse(userId: string, pathname: string, response: NextResponse): void {
  const key = `${userId}:${pathname}`;
  requestCache.set(key, { response: response.clone(), timestamp: Date.now() });

  // Periodic cleanup of stale entries
  if (requestCache.size > 200) {
    const now = Date.now();
    for (const [k, v] of requestCache) {
      if (now - v.timestamp > DEDUP_WINDOW_MS) requestCache.delete(k);
    }
  }
}

function checkRateLimit(ip: string, pathname: string): { allowed: boolean; retryAfterMs: number } {
  const cfg = MIDDLEWARE_CONFIG.rateLimit;
  if (!cfg.enabled) return { allowed: true, retryAfterMs: 0 };

  // Find matching rule (first match wins) or use default
  const rule = cfg.rules.find((r) => pathname.startsWith(r.pathPrefix));
  const maxReq = rule?.maxRequests ?? cfg.defaultLimit.maxRequests;
  const windowMs = (rule?.windowSeconds ?? cfg.defaultLimit.windowSeconds) * 1000;

  const key = `${ip}:${rule?.pathPrefix ?? "default"}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now >= entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  entry.count += 1;
  if (entry.count > maxReq) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }
  return { allowed: true, retryAfterMs: 0 };
}

// ============================================================================
// Helpers
// ============================================================================

/** True when `pathname` starts with any prefix in `list` */
function matchesAny(pathname: string, list: readonly string[]): boolean {
  return list.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"));
}

/** Build a NextResponse redirect */
function redirect(request: NextRequest, path: string): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = path;
  const res = NextResponse.redirect(url);
  res.headers.set("X-Middleware-Redirect", path);
  return res;
}

/** Parse JSON permissions column to string[] */
function parsePermissions(raw: Json): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((v): v is string => typeof v === "string");
  if (typeof raw === "object" && raw !== null) {
    return Object.entries(raw)
      .filter(([, v]) => v === true)
      .map(([k]) => k);
  }
  return [];
}

/** Stamp informational headers onto a response */
function stamp(
  response: NextResponse,
  data: Record<string, string | undefined>,
): NextResponse {
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) response.headers.set(k, v);
  }
  return response;
}

// ============================================================================
// Supabase client factory (mutates `response` via cookie setter)
// ============================================================================

function createClient(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    },
  );

  // Expose response getter so callers always see the latest instance
  return { supabase, getResponse: () => response };
}

// ============================================================================
// Onboarding status shape returned by the RPC
// ============================================================================

interface OnboardingRPC {
  has_organization: boolean;
  has_store: boolean;
  store_status: string | null;
  is_store_user: boolean;
  next_step: string;
  redirect_to: string;
  is_onboarding_complete: boolean;
}

// ============================================================================
// Middleware entry point
// ============================================================================

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { routes, redirects } = MIDDLEWARE_CONFIG;

  // ── 1. Bypass static / internal paths ────────────────────────────────────
  //    Also bypass paths that look like static assets (images, fonts, etc.)
  if (matchesAny(pathname, routes.bypass)) {
    return NextResponse.next();
  }

  // Bypass files with extensions (static assets like .png, .jpg, .svg, .woff)
  if (/\.[a-z0-9]{2,6}$/i.test(pathname) && !pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  verbose("🚀 [MW]", { path: pathname, ts: new Date().toISOString() });

  // ── 2. Dev bypass ────────────────────────────────────────────────────────
  if (process.env.NODE_ENV === "development" && MIDDLEWARE_CONFIG.dev.bypassAuth) {
    log("warn", "Auth bypassed (dev)", { path: pathname });
    return NextResponse.next();
  }

  // ── 3. Rate limit ───────────────────────────────────────────────────────
  const rl = checkRateLimit(ip, pathname);
  if (!rl.allowed) {
    log("warn", "Rate limited", { path: pathname, ip, retryMs: rl.retryAfterMs });
    return new NextResponse("Too Many Requests", {
      status: 429,
      headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) },
    });
  }

  // ── 4. Create Supabase client & authenticate ────────────────────────────
  const { supabase, getResponse } = createClient(request);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  verbose("🔐 [AUTH]", {
    path: pathname,
    authenticated: !!user,
    userId: user?.id,
    error: authError?.message,
  });

  log("info", "Auth check", {
    path: pathname,
    authenticated: !!user,
    userId: user?.id,
  });

  // ── 4b. Check dedup cache to avoid repeated Supabase RPCs on HMR ────────
  if (user) {
    const cached = getCachedResponse(user.id, pathname);
    if (cached) {
      log("debug", "Returning cached middleware result", { path: pathname });
      return cached;
    }
  }

  // ── 5. Resolve route config ──────────────────────────────────────────────
  const routeConfig = getRouteConfig(pathname);

  // Unknown route — let Next.js show its 404
  if (!routeConfig) {
    log("debug", "No route config", { path: pathname });
    return stamp(getResponse(), { "X-Middleware-Result": "no-config" });
  }

  // ── 6. PUBLIC routes ─────────────────────────────────────────────────────
  if (routeConfig.type === "public") {
    if (user && routeConfig.redirect?.authenticated) {
      log("info", "Auth user on public → redirect", { path: pathname, to: routeConfig.redirect.authenticated });
      return redirect(request, routeConfig.redirect.authenticated);
    }
    return stamp(getResponse(), { "X-Middleware-Result": "public" });
  }

  // ── 7. AUTH routes (login/signup/otp) — only for unauthenticated ────────
  if (routeConfig.type === "auth") {
    if (user) {
      const target = routeConfig.redirect?.authenticated ?? redirects.afterAuth;
      log("info", "Auth user on auth route → redirect", { path: pathname, to: target });
      return redirect(request, target);
    }
    return stamp(getResponse(), { "X-Middleware-Result": "auth-allowed" });
  }

  // ── 8. Everything below requires authentication ─────────────────────────
  if (!user) {
    const target = routeConfig.redirect?.unauthenticated ?? redirects.unauthenticated;
    log("info", "Unauthenticated → redirect", { path: pathname, to: target });
    return redirect(request, target);
  }

  // ── 9. Fetch onboarding status ──────────────────────────────────────────
  const { data: onboardingRaw, error: onboardingError } = await (supabase.rpc as CallableFunction)(
    "get_onboarding_status",
    { p_user_id: user.id },
  );

  if (onboardingError) {
    log("error", "Onboarding RPC failed", { path: pathname, userId: user.id, err: onboardingError.message });
    // Fallback: let request through so the client-side can handle it
    return stamp(getResponse(), {
      "X-Middleware-Result": "onboarding-error-fallback",
      "X-Onboarding-Error": onboardingError.message,
    });
  }

  const onboarding = onboardingRaw as unknown as OnboardingRPC;

  verbose("🔍 [ONBOARDING]", {
    path: pathname,
    complete: onboarding.is_onboarding_complete,
    step: onboarding.next_step,
    redirectTo: onboarding.redirect_to,
    storeStatus: onboarding.store_status,
  });

  log("info", "Onboarding status", {
    path: pathname,
    userId: user.id,
    complete: onboarding.is_onboarding_complete,
    step: onboarding.next_step,
    redirectTo: onboarding.redirect_to,
  });

  // ── 10. Handle ONBOARDING routes ────────────────────────────────────────
  //
  //  Key fix: if onboarding is COMPLETE, the user must NOT stay on any
  //  onboarding page — redirect them to their role dashboard immediately.
  //
  const isOnboardingPage = routeConfig.type === "onboarding" || matchesAny(pathname, routes.onboarding);

  if (isOnboardingPage) {
    // ✅ FIX: Completed users should never be on onboarding pages
    if (onboarding.is_onboarding_complete) {
      const target = onboarding.redirect_to || redirects.afterAuth;
      log("info", "Onboarding complete → redirect away from onboarding page", {
        path: pathname,
        userId: user.id,
        to: target,
      });
      verbose("🔀 [ONBOARDING→DASHBOARD]", { from: pathname, to: target });
      return redirect(request, target);
    }

    // Store is pending → always go to /pending-approval
    if (onboarding.store_status === "pending" && pathname !== redirects.pendingStore) {
      log("info", "Store pending → redirect", { path: pathname, to: redirects.pendingStore });
      return redirect(request, redirects.pendingStore);
    }

    // Wrong onboarding step → redirect to correct step
    if (pathname !== onboarding.redirect_to) {
      log("info", "Wrong onboarding step → redirect", {
        path: pathname,
        correctStep: onboarding.redirect_to,
      });
      return redirect(request, onboarding.redirect_to);
    }

    // Correct step — allow
    return stamp(getResponse(), {
      "X-Middleware-Result": "onboarding-allowed",
      "X-User-Id": user.id,
      "X-Onboarding-Step": onboarding.next_step,
    });
  }

  // ── 11. Protected / role-based routes require completed onboarding ──────
  if (!onboarding.is_onboarding_complete) {
    log("info", "Onboarding incomplete → redirect to correct step", {
      path: pathname,
      userId: user.id,
      to: onboarding.redirect_to,
    });
    return redirect(request, onboarding.redirect_to);
  }

  // ── 12. Redirect generic /dashboard to role-specific dashboard ──────────
  if (pathname === "/dashboard" && onboarding.redirect_to && onboarding.redirect_to !== "/dashboard") {
    log("info", "Generic dashboard → role dashboard", {
      path: pathname,
      to: onboarding.redirect_to,
    });
    verbose("🔀 [ROLE DASHBOARD]", { from: pathname, to: onboarding.redirect_to });
    return redirect(request, onboarding.redirect_to);
  }

  // ── 13. Fetch full user row for role/permissions/store checks ───────────
  const { data: userRow, error: userError } = await supabase
    .from("v_user_store_role")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (userError || !userRow) {
    log("info", "No store assignment → onboarding", { path: pathname, userId: user.id });
    return redirect(request, redirects.onboardingStart);
  }

  // ── 14. Banned / inactive check ─────────────────────────────────────────
  if (userRow.is_banned || !userRow.is_active) {
    log("warn", userRow.is_banned ? "Banned user" : "Inactive user", {
      path: pathname,
      userId: user.id,
    });
    return redirect(request, redirects.banned);
  }

  // ── 15. Store status check ──────────────────────────────────────────────
  const storeStatus = userRow.store_status as StoreStatus;

  if (MIDDLEWARE_CONFIG.storeStatus.handlePendingStores && storeStatus === "pending") {
    if (pathname !== redirects.pendingStore) {
      log("info", "Store pending → redirect", { path: pathname });
      return redirect(request, redirects.pendingStore);
    }
    return getResponse();
  }

  if (storeStatus === "suspended" || storeStatus === "rejected" || storeStatus === "closed") {
    log("warn", `Store ${storeStatus}`, { path: pathname, userId: user.id });
    return redirect(request, redirects.banned);
  }

  // ── 16. Role-based access control ───────────────────────────────────────
  if (routeConfig.type === "role-based") {
    const userRole = userRow.role_name as RoleName;

    // Role check
    if (routeConfig.allowedRoles?.length && !hasAnyRole(userRole, routeConfig.allowedRoles)) {
      log("warn", "Role denied", {
        path: pathname,
        role: userRole,
        required: routeConfig.allowedRoles,
      });
      return redirect(request, routeConfig.redirect?.unauthorized ?? redirects.unauthorized);
    }

    // Permission check
    if (routeConfig.requiredPermissions?.length) {
      const userPerms = parsePermissions(userRow.permissions);
      const hasPerm = routeConfig.requiredPermissions.some((p) => userPerms.includes(p));
      if (!hasPerm) {
        log("warn", "Permission denied", {
          path: pathname,
          required: routeConfig.requiredPermissions,
        });
        return redirect(request, routeConfig.redirect?.unauthorized ?? redirects.unauthorized);
      }
    }
  }

  // ── 17. All checks passed — grant access ────────────────────────────────
  log("info", "Access granted", { path: pathname, userId: user.id, role: userRow.role_name });

  const finalResponse = stamp(getResponse(), {
    "X-Middleware-Executed": "true",
    "X-User-Id": user.id,
  });

  // Cache the result to prevent duplicate Supabase calls during HMR
  cacheResponse(user.id, pathname, finalResponse);

  return finalResponse;
}

// ============================================================================
// Matcher — tells Next.js which paths to run middleware on
// ============================================================================

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     * - _next (all build assets, static, image, data)
     * - favicon.ico, favicon_io/ (favicon assets)
     * - sitemap.xml, robots.txt (meta files)
     * - images/, fonts/ (public asset dirs)
     * - Files with extensions like .png, .jpg, .svg, .woff2
     */
    "/((?!_next|favicon.ico|favicon_io|sitemap.xml|robots.txt|images/|fonts/|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot|css|js|map)$).*)",
  ],
};
