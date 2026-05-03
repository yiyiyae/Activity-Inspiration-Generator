import { useEffect, useMemo, useState } from "react";
import {
  type AnalyticsDashboardData,
  type ModeFilter,
  getAnalyticsDashboardData,
} from "../services/analyticsDashboardService";

const ADMIN_TOKEN_STORAGE_KEY = "weekend_admin_analytics_token_v1";

function toPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function toDateInputValue(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatStep(step: string) {
  const map: Record<string, string> = {
    intent_submitted: "问诊提交",
    mode_selected: "模式选择",
    recommendation_requested: "请求推荐",
    recommendation_received: "获得推荐",
    result_impression: "结果曝光",
    save_modal_opened: "打开保存弹窗",
  };
  return map[step] ?? step;
}

function readStoredToken() {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) ?? "";
}

function saveToken(token: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
}

function clearToken() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
}

function AdminAnalyticsPage() {
  const [mode, setMode] = useState<ModeFilter>("ALL");
  const [from, setFrom] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return toDateInputValue(date);
  });
  const [to, setTo] = useState(() => toDateInputValue(new Date()));
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [data, setData] = useState<AnalyticsDashboardData | null>(null);
  const [adminToken, setAdminToken] = useState("");
  const [tokenInput, setTokenInput] = useState("");

  const query = useMemo(() => {
    const queryFrom = from ? `${from}T00:00:00.000Z` : undefined;
    const queryTo = to ? `${to}T23:59:59.999Z` : undefined;
    return {
      from: queryFrom,
      to: queryTo,
      mode,
    };
  }, [from, mode, to]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    const tokenFromUrl = url.searchParams.get("token");
    if (tokenFromUrl && tokenFromUrl.trim()) {
      const normalized = tokenFromUrl.trim();
      saveToken(normalized);
      setAdminToken(normalized);
      setTokenInput(normalized);
      url.searchParams.delete("token");
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
      return;
    }

    const existing = readStoredToken();
    if (existing) {
      setAdminToken(existing);
      setTokenInput(existing);
    }
  }, []);

  const loadData = async () => {
    if (!adminToken) return;

    setLoading(true);
    try {
      const next = await getAnalyticsDashboardData(query, { token: adminToken });
      setData(next);
      setErrorText("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "加载失败";
      setErrorText(message);
      if (message.toLowerCase().includes("401") || message.includes("Unauthorized")) {
        clearToken();
        setAdminToken("");
        setData(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!adminToken) {
      setLoading(false);
      return;
    }
    void loadData();
  }, [query, adminToken]);

  const handleUnlock = () => {
    const token = tokenInput.trim();
    if (!token) {
      setErrorText("请输入后台口令");
      return;
    }
    saveToken(token);
    setAdminToken(token);
    setErrorText("");
  };

  const handleLogout = () => {
    clearToken();
    setAdminToken("");
    setTokenInput("");
    setData(null);
    setErrorText("");
  };

  if (!adminToken) {
    return (
      <main className="min-h-screen bg-skin-bg px-4 py-6 text-skin-text">
        <div className="mx-auto w-full max-w-md rounded-card border border-skin-border bg-skin-surface p-5 shadow-theme">
          <p className="text-xs uppercase tracking-[0.14em] opacity-70">内部后台</p>
          <h1 className="mt-2 font-heading text-3xl leading-tight">埋点分析看板解锁</h1>
          <p className="mt-2 text-sm opacity-80">请输入管理员口令后再查看数据。</p>

          <label className="mt-4 block text-sm">
            <span className="mb-1 block opacity-70">管理员口令</span>
            <input
              type="password"
              value={tokenInput}
              onChange={(event) => setTokenInput(event.target.value)}
              className="w-full rounded-pill border border-skin-border bg-skin-bg px-3 py-2"
              placeholder="输入 ADMIN_ANALYTICS_TOKEN"
            />
          </label>

          {errorText ? <p className="mt-3 text-sm text-red-500">{errorText}</p> : null}

          <button
            type="button"
            onClick={handleUnlock}
            className="mt-4 w-full rounded-pill bg-skin-primary px-4 py-2 font-semibold text-skin-bg"
          >
            解锁后台
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-skin-bg px-4 py-6 text-skin-text">
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <header className="rounded-card border border-skin-border bg-skin-surface p-4 shadow-theme">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] opacity-70">内部后台</p>
              <h1 className="font-heading text-3xl leading-tight">埋点分析看板</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-pill border border-skin-border bg-skin-bg px-3 py-1 text-xs font-semibold">
                数据源：{data?.overview.provider ?? "加载中"}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-pill border border-skin-border bg-skin-bg px-3 py-1 text-xs"
              >
                退出后台
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-2 md:grid-cols-4">
            <label className="text-xs">
              <span className="mb-1 block opacity-70">开始日期</span>
              <input
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className="w-full rounded-pill border border-skin-border bg-skin-bg px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs">
              <span className="mb-1 block opacity-70">结束日期</span>
              <input
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className="w-full rounded-pill border border-skin-border bg-skin-bg px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs">
              <span className="mb-1 block opacity-70">模式筛选</span>
              <select
                value={mode}
                onChange={(event) => setMode(event.target.value as ModeFilter)}
                className="w-full rounded-pill border border-skin-border bg-skin-bg px-3 py-2 text-sm"
              >
                <option value="ALL">全部模式</option>
                <option value="P">仅 P 模式</option>
                <option value="J">仅 J 模式</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => void loadData()}
              className="self-end rounded-pill bg-skin-primary px-4 py-2 text-sm font-semibold text-skin-bg"
            >
              刷新数据
            </button>
          </div>
        </header>

        {errorText ? (
          <section className="rounded-card border border-red-400 bg-red-100/80 p-3 text-sm text-red-700">{errorText}</section>
        ) : null}

        {loading && !data ? (
          <section className="rounded-card border border-skin-border bg-skin-surface p-5 text-sm opacity-70">加载中...</section>
        ) : null}

        {data ? (
          <>
            <section className="grid gap-3 md:grid-cols-4">
              <article className="rounded-card border border-skin-border bg-skin-surface p-4 shadow-theme">
                <p className="text-xs opacity-70">会话数</p>
                <p className="mt-2 text-3xl font-bold">{data.overview.totals.sessions}</p>
              </article>
              <article className="rounded-card border border-skin-border bg-skin-surface p-4 shadow-theme">
                <p className="text-xs opacity-70">处方完成率</p>
                <p className="mt-2 text-3xl font-bold">{toPercent(data.overview.metrics.prescriptionCompletionRate)}</p>
              </article>
              <article className="rounded-card border border-skin-border bg-skin-surface p-4 shadow-theme">
                <p className="text-xs opacity-70">推荐成功率</p>
                <p className="mt-2 text-3xl font-bold">{toPercent(data.overview.metrics.recommendationSuccessRate)}</p>
              </article>
              <article className="rounded-card border border-skin-border bg-skin-surface p-4 shadow-theme">
                <p className="text-xs opacity-70">保存率</p>
                <p className="mt-2 text-3xl font-bold">{toPercent(data.overview.metrics.saveRate)}</p>
              </article>
            </section>

            <section className="grid gap-3 md:grid-cols-3">
              <article className="rounded-card border border-skin-border bg-skin-surface p-4 shadow-theme">
                <p className="text-xs opacity-70">推荐延迟 p50 / p95</p>
                <p className="mt-2 text-2xl font-bold">
                  {data.overview.metrics.latencyP50Ms ?? "--"}ms / {data.overview.metrics.latencyP95Ms ?? "--"}ms
                </p>
              </article>
              <article className="rounded-card border border-skin-border bg-skin-surface p-4 shadow-theme">
                <p className="text-xs opacity-70">推荐失败率</p>
                <p className="mt-2 text-2xl font-bold">{toPercent(data.overview.metrics.recommendationFailureRate)}</p>
              </article>
              <article className="rounded-card border border-skin-border bg-skin-surface p-4 shadow-theme">
                <p className="text-xs opacity-70">空推荐率</p>
                <p className="mt-2 text-2xl font-bold">{toPercent(data.overview.metrics.emptyResultRate)}</p>
              </article>
            </section>

            <section className="rounded-card border border-skin-border bg-skin-surface p-4 shadow-theme">
              <h2 className="text-sm font-semibold">漏斗转化</h2>
              <div className="mt-3 space-y-3">
                {data.funnel.rows.map((row) => (
                  <div key={row.step} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span>{formatStep(row.step)}</span>
                      <span>
                        UV {row.uv} · 转化 {toPercent(row.conversionRate)} · 流失 {toPercent(row.dropoffRate)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-pill bg-skin-bg">
                      <div
                        className="h-full rounded-pill bg-skin-primary transition-all"
                        style={{ width: `${Math.max(0, Math.min(100, row.conversionRate * 100))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}

export default AdminAnalyticsPage;
