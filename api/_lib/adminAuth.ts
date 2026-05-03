declare const process: any;

type ReqLike = {
  headers?: Record<string, string | string[] | undefined>;
};

function getHeaderValue(req: ReqLike, key: string): string | null {
  const headers = req.headers ?? {};
  const raw = headers[key] ?? headers[key.toLowerCase()];
  if (Array.isArray(raw)) {
    const value = raw[0];
    return typeof value === "string" ? value : null;
  }
  return typeof raw === "string" ? raw : null;
}

export function getAdminAnalyticsToken(): string | null {
  const token = process.env.ADMIN_ANALYTICS_TOKEN;
  if (typeof token !== "string") return null;
  const trimmed = token.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function isAdminAnalyticsAuthorized(req: ReqLike): boolean {
  const expected = getAdminAnalyticsToken();
  if (!expected) return true;
  const supplied = getHeaderValue(req, "x-admin-token");
  return supplied === expected;
}

