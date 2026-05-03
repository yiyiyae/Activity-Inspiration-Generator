export type ModeFilter = "ALL" | "P" | "J";

type OverviewResponse = {
  provider: "memory" | "postgres";
  filters: {
    from: string | null;
    to: string | null;
    mode: ModeFilter;
  };
  totals: {
    sessions: number;
    events: number;
  };
  metrics: {
    prescriptionCompletionRate: number;
    recommendationSuccessRate: number;
    recommendationFailureRate: number;
    emptyResultRate: number;
    saveRate: number;
    averageTopScore: number | null;
    latencyP50Ms: number | null;
    latencyP95Ms: number | null;
  };
  counts: {
    intentSubmittedUv: number;
    resultImpressionUv: number;
    recommendationRequestedCnt: number;
    recommendationReceivedCnt: number;
    recommendationFailedCnt: number;
    emptyResultCnt: number;
    recommendationEmptyCnt: number;
    saveModalOpenedUv: number;
    modeSelectedP: number;
    modeSelectedJ: number;
  };
};

type FunnelRow = {
  step: string;
  uv: number;
  conversionRate: number;
  dropoffRate: number;
};

type FunnelResponse = {
  provider: "memory" | "postgres";
  filters: {
    from: string | null;
    to: string | null;
    mode: ModeFilter;
  };
  rows: FunnelRow[];
};

export type AnalyticsDashboardData = {
  overview: OverviewResponse;
  funnel: FunnelResponse;
};

export type AnalyticsQuery = {
  from?: string;
  to?: string;
  mode?: ModeFilter;
};

export type AdminAuth = {
  token: string;
};

function getBasePath() {
  return import.meta.env.DEV ? "/__api/analytics" : "/api/analytics";
}

function toQueryString(query: AnalyticsQuery): string {
  const params = new URLSearchParams();
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (query.mode) params.set("mode", query.mode);
  const q = params.toString();
  return q ? `?${q}` : "";
}

async function fetchJson<T>(url: string, auth: AdminAuth): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "x-admin-token": auth.token,
    },
  });
  if (!response.ok) {
    let detail = `Request failed with status ${response.status}`;
    try {
      const body = (await response.json()) as { message?: string; reason?: string };
      detail = body.reason || body.message || detail;
    } catch {
      // ignore parse errors
    }
    throw new Error(detail);
  }
  return (await response.json()) as T;
}

export async function getAnalyticsDashboardData(query: AnalyticsQuery, auth: AdminAuth): Promise<AnalyticsDashboardData> {
  const qs = toQueryString(query);
  const base = getBasePath();
  const [overview, funnel] = await Promise.all([
    fetchJson<OverviewResponse>(`${base}/overview${qs}`, auth),
    fetchJson<FunnelResponse>(`${base}/funnel${qs}`, auth),
  ]);

  return { overview, funnel };
}
