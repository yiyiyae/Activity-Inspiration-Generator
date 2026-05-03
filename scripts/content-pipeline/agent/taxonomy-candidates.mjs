import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { VENUE_VOCAB, ACTION_VOCAB, VIBE_VOCAB } from "./taxonomy.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_PATH = path.join(__dirname, "taxonomy_candidates.json");

const VENUE_SET = new Set(VENUE_VOCAB);
const ACTION_SET = new Set(ACTION_VOCAB);
const VIBE_SET = new Set(VIBE_VOCAB);
const ALL_KNOWN_SET = new Set([...VENUE_VOCAB, ...ACTION_VOCAB, ...VIBE_VOCAB]);

const RESERVED_TERMS = new Set(["未知", "长沙", "本地探索", "周末出行", "高德POI"]);

function nowIso() {
  return new Date().toISOString();
}

function unique(items) {
  return Array.from(new Set(items.filter(Boolean)));
}

function isValidCandidateTerm(term) {
  const clean = String(term ?? "").trim();
  if (!clean) return false;
  if (RESERVED_TERMS.has(clean)) return false;
  if (/^[\u4e00-\u9fff]{2,4}(区|县|市)$/.test(clean)) return false;
  if (!/^[\u4e00-\u9fff]{2,8}$/.test(clean)) return false;
  return true;
}

function splitToChineseTerms(input) {
  return String(input ?? "")
    .split(/[\s,，、|\/()（）#]+/)
    .map((x) => x.trim())
    .filter(isValidCandidateTerm);
}

function buildEntryKey(dimension, term) {
  return `${dimension}::${term}`;
}

function pushUniqueLimited(list, value, max = 5) {
  if (!value) return list;
  if (!list.includes(value)) list.push(value);
  if (list.length > max) list.splice(max);
  return list;
}

function extractEntriesFromCandidate(candidate) {
  const entries = [];
  const name = String(candidate?.name ?? "").trim();
  const sourceId = String(candidate?.sourceId ?? "").trim();

  const addEntry = (term, dimension, reason) => {
    if (!isValidCandidateTerm(term)) return;
    entries.push({
      term,
      dimension,
      reason,
      sampleName: name,
      sampleSourceId: sourceId,
    });
  };

  const inferDimensionFromTerm = (term) => {
    if (/[馆店街区园坊场寺湖山]/.test(term)) return "venue_types";
    if (/[拍逛走爬骑读看喝玩]/.test(term)) return "actions";
    if (/[愈静闹酷美暖松潮燃]/.test(term)) return "vibes";
    return "unknown";
  };

  for (const term of candidate?.venueTypes ?? []) {
    if (!VENUE_SET.has(term)) addEntry(term, "venue_types", "generated_label_not_in_vocab");
  }
  for (const term of candidate?.actionVerbs ?? []) {
    if (!ACTION_SET.has(term)) addEntry(term, "actions", "generated_label_not_in_vocab");
  }
  for (const term of candidate?.vibeThemes ?? []) {
    if (!VIBE_SET.has(term)) addEntry(term, "vibes", "generated_label_not_in_vocab");
  }

  // 从源标签中提取候选词，给后续词库扩展做素材。
  const sourceTerms = unique([
    ...splitToChineseTerms((candidate?.tags ?? []).join(" ")),
    ...splitToChineseTerms((candidate?.category ?? []).join(" ")),
  ]);

  for (const term of sourceTerms) {
    if (ALL_KNOWN_SET.has(term)) continue;
    addEntry(term, inferDimensionFromTerm(term), "source_tag_not_in_vocab");
  }

  return entries;
}

async function loadStore(filePath) {
  if (!existsSync(filePath)) {
    return { updatedAt: null, items: [] };
  }
  try {
    const raw = await readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.items)) {
      return { updatedAt: null, items: [] };
    }
    return {
      updatedAt: parsed.updatedAt ?? null,
      items: parsed.items.filter((item) => isValidCandidateTerm(item?.term)),
    };
  } catch {
    return { updatedAt: null, items: [] };
  }
}

function upsertEntries(store, entries) {
  const items = Array.isArray(store.items) ? [...store.items] : [];
  const indexMap = new Map(items.map((item, idx) => [buildEntryKey(item.dimension, item.term), idx]));

  let created = 0;
  let updated = 0;
  const now = nowIso();

  for (const entry of entries) {
    const key = buildEntryKey(entry.dimension, entry.term);
    const foundIndex = indexMap.get(key);

    if (foundIndex === undefined) {
      items.push({
        term: entry.term,
        dimension: entry.dimension,
        count: 1,
        firstSeenAt: now,
        lastSeenAt: now,
        reasons: [entry.reason],
        sampleNames: entry.sampleName ? [entry.sampleName] : [],
        sampleSourceIds: entry.sampleSourceId ? [entry.sampleSourceId] : [],
      });
      indexMap.set(key, items.length - 1);
      created += 1;
      continue;
    }

    const target = items[foundIndex];
    target.count = Number(target.count ?? 0) + 1;
    target.lastSeenAt = now;
    target.reasons = unique([...(target.reasons ?? []), entry.reason]);
    target.sampleNames = pushUniqueLimited(Array.isArray(target.sampleNames) ? target.sampleNames : [], entry.sampleName, 5);
    target.sampleSourceIds = pushUniqueLimited(
      Array.isArray(target.sampleSourceIds) ? target.sampleSourceIds : [],
      entry.sampleSourceId,
      5
    );
    updated += 1;
  }

  items.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return String(b.lastSeenAt).localeCompare(String(a.lastSeenAt));
  });

  return {
    updatedAt: now,
    items,
    stats: {
      created,
      updated,
      total: items.length,
    },
  };
}

export async function collectTaxonomyCandidates(candidates, options = {}) {
  if (process.env.PIPELINE_TAXONOMY_CANDIDATES === "0") {
    return { enabled: false, created: 0, updated: 0, total: 0, path: DEFAULT_PATH };
  }

  const filePath = options.filePath ? path.resolve(options.filePath) : DEFAULT_PATH;
  const parent = path.dirname(filePath);
  await mkdir(parent, { recursive: true });

  const flatEntries = [];
  for (const candidate of candidates ?? []) {
    flatEntries.push(...extractEntriesFromCandidate(candidate));
  }

  if (!flatEntries.length && !existsSync(filePath)) {
    await writeFile(filePath, JSON.stringify({ updatedAt: nowIso(), items: [] }, null, 2), "utf-8");
    return { enabled: true, created: 0, updated: 0, total: 0, path: filePath };
  }

  const store = await loadStore(filePath);
  const merged = upsertEntries(store, flatEntries);
  await writeFile(filePath, JSON.stringify({ updatedAt: merged.updatedAt, items: merged.items }, null, 2), "utf-8");

  return {
    enabled: true,
    created: merged.stats.created,
    updated: merged.stats.updated,
    total: merged.stats.total,
    path: filePath,
  };
}
