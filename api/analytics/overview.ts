import { getOverviewMetrics } from "../_lib/analyticsStore.js";
import { isAdminAnalyticsAuthorized } from "../_lib/adminAuth.js";

function normalizeMode(value: unknown): "P" | "J" | "ALL" {
  if (value === "P" || value === "J") return value;
  return "ALL";
}

export default async function handler(req: any, res: any) {
  if (req.method && req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  if (!isAdminAnalyticsAuthorized(req)) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const query = req.query ?? {};
    const from = typeof query.from === "string" ? query.from : undefined;
    const to = typeof query.to === "string" ? query.to : undefined;
    const mode = normalizeMode(query.mode);

    const data = await getOverviewMetrics({ from, to, mode });
    res.status(200).json(data);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: "Failed to query overview metrics", reason });
  }
}
