import { queryMappedLocations } from "./_lib/notionLocations.js";
import { recommendLocations } from "./_lib/recommendation.js";

type ReqBody = {
  weather: "Sunny" | "Cloudy" | "Rainy";
  time: "Morning" | "Afternoon" | "Evening";
  moodIntent: string;
  partyMode: string;
  energyLevel: "low" | "medium" | "high";
  socialIntensity?: "low" | "medium" | "high";
  budgetLevel?: string;
  recentIds?: string[];
  limit?: number;
};

export default async function handler(req: any, res: any) {
  try {
    const body: ReqBody = req.body ?? {};
    if (!body.weather || !body.time || !body.moodIntent || !body.partyMode || !body.energyLevel) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }

    const rows = await queryMappedLocations();
    const scored = recommendLocations(rows, body, body.limit ?? 3);
    res.status(200).json({
      totalCandidates: rows.length,
      matchedCandidates: scored.length,
      results: scored.map((x) => ({
        id: x.item.id,
        title: x.item.title,
        score: Number(x.score.toFixed(2)),
        explain: x.explain,
        location: x.item,
      })),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: "Failed to generate recommendation", reason });
  }
}
