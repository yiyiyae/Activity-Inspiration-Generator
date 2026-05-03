import { trackAnalyticsEvent, type TrackRequestBody } from "../_lib/analyticsStore.js";

export default async function handler(req: any, res: any) {
  if (req.method && req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    const body: TrackRequestBody = (req.body ?? {}) as TrackRequestBody;
    const result = await trackAnalyticsEvent(body);
    if (!result.ok) {
      const message = "message" in result ? result.message : "Bad request";
      res.status(result.status).json({ message });
      return;
    }

    res.status(result.status).json({
      ok: true,
      deduplicated: result.deduplicated,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: "Failed to track analytics event", reason });
  }
}
