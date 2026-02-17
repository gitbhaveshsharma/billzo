import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  getRouteConfig,
  shouldBypassMiddleware,
} from "@/config/routes.config";
import { hasAnyRole } from "@/config/roles.config";
import { MIDDLEWARE_CONFIG } from "@/config/middleware.config";
import type { RoleName, StoreStatus, Json } from "@/types/database.types";

// ============================================================================
// Structured logger (inline — cannot import utils that use MIDDLEWARE_CONFIG
// at the edge because of module resolution, so we duplicate minimal logic)
// ============================================================================

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  if (!MIDDLEWARE_CONFIG.logging.enabled) return;
  if (LOG_PRIORITY[level] < LOG_PRIORITY[MIDDLEWARE_CONFIG.logging.level]) return;
  const ts = new Date().toISOString();
  const base = `[${ts}] [${level.toUpperCase()}] [MW] ${message}`;
  const fn =
    level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  fn(meta ? `${base} ${JSON.stringify(meta)}` : base);
}

// ============================================================================
// Middleware handler
// ============================================================================

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  // VISIBILITY CHECK: Always log to confirm middleware execution
  // NOTE: In Next.js 16, middleware logs don't appear in dev terminal - check browser network tab for X-Middleware-Executed header
  console.log("🚀 [MIDDLEWARE] EXECUTING", {
    path: pathname,
    url: request.nextUrl.href,
    timestamp: new Date().toISOString(),
  });

  // 1. Bypass paths (static assets, internals)
  if (shouldBypassMiddleware(pathname)) {
    console.log("⏭️  [MIDDLEWARE] BYPASSED", pathname);
    return NextResponse.next();
  }

  // 2. Dev bypass
  if (
    process.env.NODE_ENV === "development" &&
    MIDDLEWARE_CONFIG.dev.bypassAuth
  ) {
    log("warn", "Auth bypassed in dev mode", { path: pathname });
    return NextResponse.next();
  }

  // 3. Create response and Supabase client (response will be updated with cookies)
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // 4. Get authenticated user (server-validated, triggers token refresh if needed)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // CRITICAL: Log auth check result to verify middleware execution
  console.log("🔐 [AUTH CHECK]", {
    path: pathname,
    authenticated: !!user,
    userId: user?.id,
    userEmail: user?.email,
    error: authError?.message,
    cookieCount: request.cookies.getAll().length,
    cookies: request.cookies.getAll().map(c => c.name),
  });

  log("info", "Auth check", {
    path: pathname,
    authenticated: !!user,
    userId: user?.id,
    hasCookies: request.cookies.getAll().length > 0,
  });

  // 5. Resolve route config
  const routeConfig = getRouteConfig(pathname);

  // No config found — allow (unknown routes fall through to Next.js 404)
  if (!routeConfig) {
    log("info", "No route config, allowing", { path: pathname });
    response.headers.set("X-Middleware-Result", "no-config");
    return response;
  }

  // ── Public routes ────────────────────────────────────────────────────────
  if (routeConfig.type === "public") {
    if (user && routeConfig.redirect?.authenticated) {
      const target = routeConfig.redirect.authenticated;

      log("info", "Authenticated user on public route, redirect", {
        path: pathname,
        userId: user.id,
        target,
      });
      return redirect(request, target);
    }
    log("info", "Public route allowed", { path: pathname });
    response.headers.set("X-Middleware-Result", "public-allowed");
    return response;
  }

  // ── Auth routes (login / signup / otp) ───────────────────────────────────
  if (routeConfig.type === "auth") {
    if (user) {
      const target = routeConfig.redirect?.authenticated ?? MIDDLEWARE_CONFIG.redirects.defaultAuthRedirect;

      log("info", "Authenticated user on auth route, redirect", {
        path: pathname,
        userId: user.id,
        target,
      });
      return redirect(request, target);
    }
    log("info", "Auth route allowed (unauthenticated)", { path: pathname });
    response.headers.set("X-Middleware-Result", "auth-route-allowed");
    return response;
  }

  // ── Everything below requires authentication ─────────────────────────────
  if (!user) {
    const target =
      routeConfig.redirect?.unauthenticated ??
      MIDDLEWARE_CONFIG.redirects.defaultUnauthRedirect;
    log("info", "Unauthenticated access, redirect to login", { path: pathname, ip });
    return redirect(request, target);
  }

  // ── For authenticated users, check onboarding status ─────────────────────
  const { data: onboardingData, error: onboardingError } = await (supabase.rpc as CallableFunction)(
    "get_onboarding_status",
    { p_user_id: user.id }
  );

  if (onboardingError) {
    log("error", "Failed to get onboarding status", {
      path: pathname,
      userId: user.id,
      error: onboardingError.message,
    });
    // Fallback: allow access, let client-side handle it
    response.headers.set("X-Middleware-Result", "onboarding-error-fallback");
    response.headers.set("X-Onboarding-Error", onboardingError.message);
    return response;
  }

  const onboardingStatus = onboardingData as unknown as {
    has_organization: boolean;
    has_store: boolean;
    store_status: string | null;
    is_store_user: boolean;
    next_step: string;
    redirect_to: string;
    is_onboarding_complete: boolean;
  };

  log("info", "Onboarding status", {
    path: pathname,
    userId: user.id,
    onboarding_complete: onboardingStatus.is_onboarding_complete,
    next_step: onboardingStatus.next_step,
    redirect_to: onboardingStatus.redirect_to,
  });

  // CRITICAL: Console log for debugging onboarding flow
  console.log("🔍 [ONBOARDING CHECK]", {
    currentPath: pathname,
    hasOrg: onboardingStatus.has_organization,
    hasStore: onboardingStatus.has_store,
    storeStatus: onboardingStatus.store_status,
    isStoreUser: onboardingStatus.is_store_user,
    nextStep: onboardingStatus.next_step,
    shouldRedirectTo: onboardingStatus.redirect_to,
    isComplete: onboardingStatus.is_onboarding_complete,
  });

  // ── Onboarding routes (authenticated, check correct step) ────────────────
  if (routeConfig.type === "onboarding") {
    // Check if user is on the correct onboarding step
    if (!onboardingStatus.is_onboarding_complete && pathname !== onboardingStatus.redirect_to) {
      log("info", "Wrong onboarding step, redirecting", {
        path: pathname,
        userId: user.id,
        correctStep: onboardingStatus.redirect_to,
      });
      console.log("🔀 [ONBOARDING REDIRECT]", {
        from: pathname,
        to: onboardingStatus.redirect_to,
        reason: "User on wrong onboarding step",
      });
      return redirect(request, onboardingStatus.redirect_to);
    }

    log("info", "Onboarding route allowed", {
      path: pathname,
      userId: user.id,
    });
    response.headers.set("X-Middleware-Result", "onboarding-allowed");
    response.headers.set("X-User-Id", user.id);
    response.headers.set("X-Onboarding-Complete", String(onboardingStatus.is_onboarding_complete));
    response.headers.set("X-Onboarding-Step", onboardingStatus.next_step);
    return response;
  }

  // ── Protected routes - require completed onboarding ──────────────────────
  if (!onboardingStatus.is_onboarding_complete) {
    log("info", "Onboarding incomplete, redirecting", {
      path: pathname,
      userId: user.id,
      redirect_to: onboardingStatus.redirect_to,
    });
    return redirect(request, onboardingStatus.redirect_to);
  }

  // ── Protected & role-based routes — enrich from DB ───────────────────────
  const { data: userRow, error: userError } = await supabase
    .from("v_user_store_role")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  // If no store assignment yet, redirect to onboarding
  if (userError || !userRow) {
    log("info", "No store assignment, redirect to onboarding", {
      path: pathname,
      userId: user.id,
      error: userError?.message,
    });
    return redirect(request, MIDDLEWARE_CONFIG.redirects.onboardingRedirect);
  }

  // Check banned
  if (userRow.is_banned) {
    log("warn", "Banned user attempted access", {
      path: pathname,
      userId: user.id,
    });
    return redirect(request, MIDDLEWARE_CONFIG.redirects.bannedUserRedirect);
  }

  // Check active
  if (!userRow.is_active) {
    log("warn", "Inactive user attempted access", {
      path: pathname,
      userId: user.id,
    });
    return redirect(request, MIDDLEWARE_CONFIG.redirects.bannedUserRedirect);
  }

  // Check store status
  const storeStatus = userRow.store_status as StoreStatus;

  if (
    MIDDLEWARE_CONFIG.storeStatus.handlePendingStores &&
    storeStatus === "pending"
  ) {
    // Allow if already on pending-approval page
    if (pathname !== MIDDLEWARE_CONFIG.redirects.pendingStoreRedirect) {
      log("info", "Pending store, redirect", {
        path: pathname,
        userId: user.id,
      });
      return redirect(request, MIDDLEWARE_CONFIG.redirects.pendingStoreRedirect);
    }
    return response;
  }

  if (storeStatus === "suspended" || storeStatus === "rejected") {
    log("warn", `Store ${storeStatus}, redirect`, {
      path: pathname,
      userId: user.id,
    });
    return redirect(request, MIDDLEWARE_CONFIG.redirects.bannedUserRedirect);
  }

  // ── Role-based access check ──────────────────────────────────────────────
  if (routeConfig.type === "role-based") {
    const userRole = userRow.role_name as RoleName;

    if (routeConfig.allowedRoles?.length) {
      if (!hasAnyRole(userRole, routeConfig.allowedRoles)) {
        log("warn", "Role check failed", {
          path: pathname,
          userId: user.id,
          role: userRole,
          required: routeConfig.allowedRoles,
        });
        const target =
          routeConfig.redirect?.unauthorized ??
          MIDDLEWARE_CONFIG.redirects.defaultUnauthorizedRedirect;
        return redirect(request, target);
      }
    }

    // Permission check
    if (routeConfig.requiredPermissions?.length) {
      const userPerms = parsePermissions(userRow.permissions);
      const hasRequired = routeConfig.requiredPermissions.some((p) =>
        userPerms.includes(p)
      );
      if (!hasRequired) {
        log("warn", "Permission check failed", {
          path: pathname,
          userId: user.id,
          required: routeConfig.requiredPermissions,
        });
        const target =
          routeConfig.redirect?.unauthorized ??
          MIDDLEWARE_CONFIG.redirects.defaultUnauthorizedRedirect;
        return redirect(request, target);
      }
    }
  }

  log("info", "Access granted", {
    path: pathname,
    userId: user.id,
    role: userRow.role_name,
  });

  // Add header to confirm middleware executed (visible in browser network tab)
  response.headers.set("X-Middleware-Executed", "true");
  response.headers.set("X-User-Id", user.id);

  return response;
}

// ============================================================================
// Helpers
// ============================================================================

function redirect(request: NextRequest, path: string) {
  const url = request.nextUrl.clone();
  url.pathname = path;
  const redirectResponse = NextResponse.redirect(url);
  // Mark redirects from middleware
  redirectResponse.headers.set("X-Middleware-Redirect", path);
  return redirectResponse;
}

function parsePermissions(raw: Json): string[] {
  if (!raw) return [];
  if (Array.isArray(raw))
    return raw.filter((v): v is string => typeof v === "string");
  if (typeof raw === "object" && raw !== null) {
    return Object.entries(raw)
      .filter(([, v]) => v === true)
      .map(([k]) => k);
  }
  return [];
}

// ============================================================================
// Matcher — tells Next.js which paths to run middleware on
// ============================================================================

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static, _next/image (static files)
     * - favicon.ico, sitemap.xml, robots.txt (meta files)
     * - images, fonts (asset directories)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|images/|fonts/).*)",
  ],
};
