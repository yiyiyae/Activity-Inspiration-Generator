import "dotenv/config";
import { loadSources, fetchRawFromSource } from "./sources/index.mjs";
import { normalizeRawItem } from "./normalize/index.mjs";
import { upsertCandidates } from "./notion-writer/index.mjs";
import { collectTaxonomyCandidates } from "./agent/taxonomy-candidates.mjs";

function parseArgs(argv) {
  const args = {
    dryRun: false,
    limit: 30,
    source: null,
    debug: false,
  };

  for (const token of argv) {
    if (token === "--dry-run") args.dryRun = true;
    if (token === "--debug") args.debug = true;
    if (token.startsWith("--source=")) args.source = token.replace("--source=", "").trim();
    if (token.startsWith("--limit=")) {
      const parsed = Number(token.replace("--limit=", "").trim());
      if (Number.isFinite(parsed) && parsed > 0) args.limit = Math.floor(parsed);
    }
  }

  return args;
}

async function collectRawItems(activeSources) {
  const rawList = [];
  const sourceErrors = [];

  for (const source of activeSources) {
    try {
      const rawItems = await fetchRawFromSource(source);
      for (const raw of rawItems) {
        rawList.push({ source, raw });
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      sourceErrors.push({ sourceId: source.id, reason });
      console.warn(`[content-pipeline] source failed: ${source.id} -> ${reason}`);
    }
  }

  return { rawList, sourceErrors };
}

function normalizeAndDedupe(rawList) {
  const normalized = [];
  const seen = new Set();

  for (const entry of rawList) {
    const candidate = normalizeRawItem(entry.source, entry.raw);
    if (!candidate) continue;
    if (seen.has(candidate.dedupeKey)) continue;
    seen.add(candidate.dedupeKey);
    normalized.push(candidate);
  }

  return normalized;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sources = await loadSources();

  const activeSources = sources
    .filter((source) => source.enabled !== false)
    .filter((source) => (args.source ? source.id === args.source : true));

  if (!activeSources.length) {
    console.log("No enabled sources. Create scripts/content-pipeline/sources.local.json from sources.sample.json.");
    return;
  }

  const { rawList, sourceErrors } = await collectRawItems(activeSources);
  const normalized = normalizeAndDedupe(rawList);
  const limited = normalized.slice(0, args.limit);
  const taxonomyCandidates = await collectTaxonomyCandidates(normalized);

  if (args.debug) {
    const debugSampleSize = Number(process.env.PIPELINE_DEBUG_SAMPLE_SIZE ?? "3");
    const size = Number.isFinite(debugSampleSize) && debugSampleSize > 0 ? Math.floor(debugSampleSize) : 3;
    console.log("Sample candidates:", limited.slice(0, size));
  }

  const result = await upsertCandidates(limited, { dryRun: args.dryRun });
  console.log(
    JSON.stringify(
      {
        mode: args.dryRun ? "dry-run" : "write",
        sources: activeSources.map((x) => x.id),
        sourceErrors,
        fetched: rawList.length,
        normalized: normalized.length,
        processed: limited.length,
        taxonomyCandidates,
        result,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("[content-pipeline] failed:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
