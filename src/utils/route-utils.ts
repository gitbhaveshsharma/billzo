// ============================================================================
// Route Utility Functions
// ============================================================================

/**
 * Check whether a request path matches a route pattern.
 * Supports exact matches and trailing wildcard (e.g. "/admin/*").
 */
export function matchRoute(path: string, pattern: string): boolean {
  if (pattern === path) return true;

  if (pattern.endsWith("/*")) {
    const base = pattern.slice(0, -2);
    return path === base || path.startsWith(`${base}/`);
  }

  return false;
}

/**
 * Extract simple path segments that follow the base pattern.
 * e.g. extractRouteParams("/admin/stores/123", "/admin/*") → "stores/123"
 */
export function extractRouteParams(
  path: string,
  pattern: string
): string | null {
  if (!pattern.endsWith("/*")) return null;
  const base = pattern.slice(0, -2);
  if (!path.startsWith(`${base}/`)) return null;
  return path.slice(base.length + 1);
}

/**
 * Build a route path from a pattern and a dynamic segment.
 * e.g. buildRoutePath("/admin/*", "stores") → "/admin/stores"
 */
export function buildRoutePath(pattern: string, segment: string): string {
  if (!pattern.endsWith("/*")) return pattern;
  const base = pattern.slice(0, -2);
  return `${base}/${segment}`;
}
