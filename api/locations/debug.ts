declare const process: any;
// 调试接口（安全版）：仅用于排查 Notion 字段结构映射问题。
// 生产默认关闭，可通过 ENABLE_DEBUG_API 和 DEBUG_API_KEY 控制开放与鉴权。
import { queryRawPages } from "../_lib/notionLocations";

function isDebugEnabled() {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const toggle = process.env.ENABLE_DEBUG_API === "true";
  return nodeEnv !== "production" || toggle;
}

function getHeader(req: any, key: string) {
  const raw = req.headers?.[key] ?? req.headers?.[key.toLowerCase()];
  if (Array.isArray(raw)) {
    return raw[0];
  }
  return raw;
}

export default async function handler(req: any, res: any) {
  if (!isDebugEnabled()) {
    res.status(404).json({ message: "Not found" });
    return;
  }

  const expectedKey = process.env.DEBUG_API_KEY;
  if (expectedKey) {
    const suppliedKey = getHeader(req, "x-debug-key");
    if (suppliedKey !== expectedKey) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
  }

  try {
    const pages = await queryRawPages();

    const preview = pages.map((page) => {
      const propertyEntries = Object.entries(page.properties ?? {}).map(([name, value]: [string, any]) => ({
        name,
        type: value?.type ?? "unknown",
      }));

      return {
        id: page.id,
        propertyNames: propertyEntries,
      };
    });

    res.status(200).json({
      count: preview.length,
      hints: [
        "No secrets are returned here.",
        "Set DEBUG_API_KEY and send x-debug-key header for additional protection.",
      ],
      preview,
    });
  } catch (error) {
    console.error("Debug API failed", error);
    res.status(500).json({ message: "Debug API failed" });
  }
}


