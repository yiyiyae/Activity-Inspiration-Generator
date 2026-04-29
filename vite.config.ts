declare const process: any;
import "dotenv/config";
// Vite 配置：开发期注入本地 API 中间件，解决 /api/*.ts 在 Vite 下不自动执行的问题。
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { Client } from "@notionhq/client";
import { queryMappedLocations, queryRawPages } from "./api/_lib/notionLocations";

function devApiPlugin(): Plugin {
  return {
    name: "dev-api-middleware",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
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
              res.end(
                JSON.stringify({
                  tokenExists: false,
                  databaseId: notionDatabaseId,
                  visibleDataSources: [],
                  database: null,
                  note: "NOTION_TOKEN is missing in server env.",
                })
              );
              return;
            }

            const notion = new Client({ auth: notionToken });
            const dsSearch = await notion.search({
              filter: { property: "object", value: "data_source" as any },
              page_size: 50,
            });
            const visibleDataSources = (dsSearch.results as any[]).map((item) => ({
              id: item.id,
              title: extractNotionTitle(item),
              parent: item.parent ?? null,
            }));

            let database: { id: string; data_sources: any[] | null } | null = null;
            let databaseRetrieveError: string | null = null;

            if (notionDatabaseId) {
              try {
                const retrieved = await (notion as any).databases.retrieve({
                  database_id: notionDatabaseId,
                });
                database = {
                  id: retrieved?.id ?? notionDatabaseId,
                  data_sources: Array.isArray(retrieved?.data_sources) ? retrieved.data_sources : null,
                };
              } catch (retrieveError) {
                databaseRetrieveError =
                  retrieveError instanceof Error ? retrieveError.message : "Unknown databases.retrieve error";
              }
            }

            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(
              JSON.stringify({
                tokenExists: true,
                databaseId: notionDatabaseId,
                visibleDataSources,
                database,
                databaseRetrieveError,
              })
            );
            return;
          } catch (error) {
            const reason = error instanceof Error ? error.message : "Unknown error";
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(
              JSON.stringify({
                tokenExists: Boolean(notionToken),
                databaseId: notionDatabaseId,
                visibleDataSources: [],
                database: null,
                error: reason,
              })
            );
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
          } catch (error) {
            console.error("[dev-api] /__api/locations failed", error);
            const reason = error instanceof Error ? error.message : "Unknown error";
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ message: "Failed to query Notion database", reason }));
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
              propertyNames: Object.entries(page.properties ?? {}).map(([name, value]: [string, any]) => ({
                name,
                type: value?.type ?? "unknown",
              })),
            }));

            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(
              JSON.stringify({
                count: preview.length,
                hints: [
                  "No secrets are returned here.",
                  "Set DEBUG_API_KEY and send x-debug-key header for additional protection.",
                ],
                preview,
              })
            );
            return;
          } catch (error) {
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

function extractNotionTitle(item: any): string {
  const titleArray = item?.title ?? item?.name ?? [];
  if (Array.isArray(titleArray) && titleArray.length) {
    return titleArray.map((t: any) => t?.plain_text ?? "").join("").trim();
  }

  if (item?.properties?.title?.title?.length) {
    return item.properties.title.title.map((t: any) => t?.plain_text ?? "").join("").trim();
  }

  return "";
}

export default defineConfig({
  plugins: [react(), devApiPlugin()],
});



