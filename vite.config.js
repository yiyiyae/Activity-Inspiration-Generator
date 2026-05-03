import "dotenv/config";
// Vite 配置：开发期注入本地 API 中间件，解决 /api/*.ts 在 Vite 下不自动执行的问题。
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { Client } from "@notionhq/client";
import { queryMappedLocations, queryRawPages } from "./api/_lib/notionLocations";
import { recommendLocations } from "./api/_lib/recommendation";
import { getFunnelMetrics, getOverviewMetrics, trackAnalyticsEvent } from "./api/_lib/analyticsStore";
import { isAdminAnalyticsAuthorized } from "./api/_lib/adminAuth";
function devApiPlugin() {
    return {
        name: "dev-api-middleware",
        apply: "serve",
        configureServer(server) {
            server.middlewares.use(async (req, res, next) => {
                const url = req.url?.split("?")[0] ?? "";
                if (url === "/__api/ping") {
                    res.statusCode = 200;
                    res.setHeader("Content-Type", "application/json; charset=utf-8");
                    res.end(JSON.stringify({ ok: true }));
                    return;
                }
                if (url === "/__api/notion-debug") {
                    const notionToken = process.env.NOTION_TOKEN;
                    const notionDatabaseId = process.env.NOTION_DATABASE_ID ?? null;
                    try {
                        if (!notionToken) {
                            res.statusCode = 200;
                            res.setHeader("Content-Type", "application/json; charset=utf-8");
                            res.end(JSON.stringify({
                                tokenExists: false,
                                databaseId: notionDatabaseId,
                                visibleDataSources: [],
                                database: null,
                                note: "NOTION_TOKEN is missing in server env.",
                            }));
                            return;
                        }
                        const notion = new Client({ auth: notionToken });
                        const dsSearch = await notion.search({
                            filter: { property: "object", value: "data_source" },
                            page_size: 50,
                        });
                        const visibleDataSources = dsSearch.results.map((item) => ({
                            id: item.id,
                            title: extractNotionTitle(item),
                            parent: item.parent ?? null,
                        }));
                        let database = null;
                        let databaseRetrieveError = null;
                        if (notionDatabaseId) {
                            try {
                                const retrieved = await notion.databases.retrieve({
                                    database_id: notionDatabaseId,
                                });
                                database = {
                                    id: retrieved?.id ?? notionDatabaseId,
                                    data_sources: Array.isArray(retrieved?.data_sources) ? retrieved.data_sources : null,
                                };
                            }
                            catch (retrieveError) {
                                databaseRetrieveError =
                                    retrieveError instanceof Error ? retrieveError.message : "Unknown databases.retrieve error";
                            }
                        }
                        res.statusCode = 200;
                        res.setHeader("Content-Type", "application/json; charset=utf-8");
                        res.end(JSON.stringify({
                            tokenExists: true,
                            databaseId: notionDatabaseId,
                            visibleDataSources,
                            database,
                            databaseRetrieveError,
                        }));
                        return;
                    }
                    catch (error) {
                        const reason = error instanceof Error ? error.message : "Unknown error";
                        res.statusCode = 500;
                        res.setHeader("Content-Type", "application/json; charset=utf-8");
                        res.end(JSON.stringify({
                            tokenExists: Boolean(notionToken),
                            databaseId: notionDatabaseId,
                            visibleDataSources: [],
                            database: null,
                            error: reason,
                        }));
                        return;
                    }
                }
                if (url === "/__api/locations") {
                    try {
                        const rows = await queryMappedLocations();
                        res.statusCode = 200;
                        res.setHeader("Content-Type", "application/json; charset=utf-8");
                        res.end(JSON.stringify(rows));
                        return;
                    }
                    catch (error) {
                        console.error("[dev-api] /__api/locations failed", error);
                        const reason = error instanceof Error ? error.message : "Unknown error";
                        res.statusCode = 500;
                        res.setHeader("Content-Type", "application/json; charset=utf-8");
                        res.end(JSON.stringify({ message: "Failed to query Notion database", reason }));
                        return;
                    }
                }
                if (url === "/__api/recommend") {
                    if (req.method !== "POST") {
                        res.statusCode = 405;
                        res.setHeader("Content-Type", "application/json; charset=utf-8");
                        res.end(JSON.stringify({ message: "Method not allowed" }));
                        return;
                    }
                    try {
                        let raw = "";
                        for await (const chunk of req) {
                            raw += chunk.toString();
                        }
                        const body = raw ? JSON.parse(raw) : {};
                        if (!body.weather || !body.time || !body.moodIntent || !body.partyMode || !body.energyLevel) {
                            res.statusCode = 400;
                            res.setHeader("Content-Type", "application/json; charset=utf-8");
                            res.end(JSON.stringify({ message: "Missing required fields" }));
                            return;
                        }
                        const rows = await queryMappedLocations();
                        const scored = recommendLocations(rows, body, body.limit ?? 3);
                        res.statusCode = 200;
                        res.setHeader("Content-Type", "application/json; charset=utf-8");
                        res.end(JSON.stringify({
                            totalCandidates: rows.length,
                            matchedCandidates: scored.length,
                            results: scored.map((x) => ({
                                id: x.item.id,
                                title: x.item.title,
                                score: Number(x.score.toFixed(2)),
                                explain: x.explain,
                                location: x.item,
                            })),
                        }));
                        return;
                    }
                    catch (error) {
                        console.error("[dev-api] /__api/recommend failed", error);
                        const reason = error instanceof Error ? error.message : "Unknown error";
                        res.statusCode = 500;
                        res.setHeader("Content-Type", "application/json; charset=utf-8");
                        res.end(JSON.stringify({ message: "Failed to generate recommendation", reason }));
                        return;
                    }
                }
                if (url === "/__api/analytics/track") {
                    if (req.method !== "POST") {
                        res.statusCode = 405;
                        res.setHeader("Content-Type", "application/json; charset=utf-8");
                        res.end(JSON.stringify({ message: "Method not allowed" }));
                        return;
                    }
                    try {
                        let raw = "";
                        for await (const chunk of req) {
                            raw += chunk.toString();
                        }
                        const body = raw ? JSON.parse(raw) : {};
                        const result = await trackAnalyticsEvent(body);
                        if (!result.ok) {
                            const message = "message" in result ? result.message : "Bad request";
                            res.statusCode = result.status;
                            res.setHeader("Content-Type", "application/json; charset=utf-8");
                            res.end(JSON.stringify({ message }));
                            return;
                        }
                        res.statusCode = result.status;
                        res.setHeader("Content-Type", "application/json; charset=utf-8");
                        res.end(JSON.stringify({ ok: true, deduplicated: result.deduplicated }));
                        return;
                    }
                    catch (error) {
                        console.error("[dev-api] /__api/analytics/track failed", error);
                        const reason = error instanceof Error ? error.message : "Unknown error";
                        res.statusCode = 500;
                        res.setHeader("Content-Type", "application/json; charset=utf-8");
                        res.end(JSON.stringify({ message: "Failed to track analytics event", reason }));
                        return;
                    }
                }
                if (url === "/__api/analytics/overview") {
                    if (req.method !== "GET") {
                        res.statusCode = 405;
                        res.setHeader("Content-Type", "application/json; charset=utf-8");
                        res.end(JSON.stringify({ message: "Method not allowed" }));
                        return;
                    }
                    if (!isAdminAnalyticsAuthorized(req)) {
                        res.statusCode = 401;
                        res.setHeader("Content-Type", "application/json; charset=utf-8");
                        res.end(JSON.stringify({ message: "Unauthorized" }));
                        return;
                    }
                    try {
                        const requestUrl = new URL(req.url ?? "", "http://localhost");
                        const from = requestUrl.searchParams.get("from") ?? undefined;
                        const to = requestUrl.searchParams.get("to") ?? undefined;
                        const rawMode = requestUrl.searchParams.get("mode");
                        const mode = rawMode === "P" || rawMode === "J" ? rawMode : "ALL";
                        const data = await getOverviewMetrics({ from, to, mode });
                        res.statusCode = 200;
                        res.setHeader("Content-Type", "application/json; charset=utf-8");
                        res.end(JSON.stringify(data));
                        return;
                    }
                    catch (error) {
                        console.error("[dev-api] /__api/analytics/overview failed", error);
                        const reason = error instanceof Error ? error.message : "Unknown error";
                        res.statusCode = 500;
                        res.setHeader("Content-Type", "application/json; charset=utf-8");
                        res.end(JSON.stringify({ message: "Failed to query overview metrics", reason }));
                        return;
                    }
                }
                if (url === "/__api/analytics/funnel") {
                    if (req.method !== "GET") {
                        res.statusCode = 405;
                        res.setHeader("Content-Type", "application/json; charset=utf-8");
                        res.end(JSON.stringify({ message: "Method not allowed" }));
                        return;
                    }
                    if (!isAdminAnalyticsAuthorized(req)) {
                        res.statusCode = 401;
                        res.setHeader("Content-Type", "application/json; charset=utf-8");
                        res.end(JSON.stringify({ message: "Unauthorized" }));
                        return;
                    }
                    try {
                        const requestUrl = new URL(req.url ?? "", "http://localhost");
                        const from = requestUrl.searchParams.get("from") ?? undefined;
                        const to = requestUrl.searchParams.get("to") ?? undefined;
                        const rawMode = requestUrl.searchParams.get("mode");
                        const mode = rawMode === "P" || rawMode === "J" ? rawMode : "ALL";
                        const data = await getFunnelMetrics({ from, to, mode });
                        res.statusCode = 200;
                        res.setHeader("Content-Type", "application/json; charset=utf-8");
                        res.end(JSON.stringify(data));
                        return;
                    }
                    catch (error) {
                        console.error("[dev-api] /__api/analytics/funnel failed", error);
                        const reason = error instanceof Error ? error.message : "Unknown error";
                        res.statusCode = 500;
                        res.setHeader("Content-Type", "application/json; charset=utf-8");
                        res.end(JSON.stringify({ message: "Failed to query funnel metrics", reason }));
                        return;
                    }
                }
                if (url === "/__api/locations/debug") {
                    const nodeEnv = process.env.NODE_ENV ?? "development";
                    const debugEnabled = nodeEnv !== "production" || process.env.ENABLE_DEBUG_API === "true";
                    if (!debugEnabled) {
                        res.statusCode = 404;
                        res.setHeader("Content-Type", "application/json; charset=utf-8");
                        res.end(JSON.stringify({ message: "Not found" }));
                        return;
                    }
                    const expectedKey = process.env.DEBUG_API_KEY;
                    const suppliedKey = req.headers["x-debug-key"];
                    if (expectedKey && suppliedKey !== expectedKey) {
                        res.statusCode = 401;
                        res.setHeader("Content-Type", "application/json; charset=utf-8");
                        res.end(JSON.stringify({ message: "Unauthorized" }));
                        return;
                    }
                    try {
                        const pages = await queryRawPages();
                        const preview = pages.map((page) => ({
                            id: page.id,
                            propertyNames: Object.entries(page.properties ?? {}).map(([name, value]) => ({
                                name,
                                type: value?.type ?? "unknown",
                            })),
                        }));
                        res.statusCode = 200;
                        res.setHeader("Content-Type", "application/json; charset=utf-8");
                        res.end(JSON.stringify({
                            count: preview.length,
                            hints: [
                                "No secrets are returned here.",
                                "Set DEBUG_API_KEY and send x-debug-key header for additional protection.",
                            ],
                            preview,
                        }));
                        return;
                    }
                    catch (error) {
                        console.error("[dev-api] /__api/locations/debug failed", error);
                        res.statusCode = 500;
                        res.setHeader("Content-Type", "application/json; charset=utf-8");
                        res.end(JSON.stringify({ message: "Debug API failed" }));
                        return;
                    }
                }
                next();
            });
        },
    };
}
function extractNotionTitle(item) {
    const titleArray = item?.title ?? item?.name ?? [];
    if (Array.isArray(titleArray) && titleArray.length) {
        return titleArray.map((t) => t?.plain_text ?? "").join("").trim();
    }
    if (item?.properties?.title?.title?.length) {
        return item.properties.title.title.map((t) => t?.plain_text ?? "").join("").trim();
    }
    return "";
}
export default defineConfig({
    plugins: [react(), devApiPlugin()],
});
