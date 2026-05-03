import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_SOURCES_PATH = path.join(__dirname, "..", "sources.local.json");
const SAMPLE_SOURCES_PATH = path.join(__dirname, "..", "sources.sample.json");

function stripHtml(input) {
  if (!input) return "";
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function deepPick(obj, keyPath) {
  if (!obj || typeof obj !== "object") return undefined;
  const segments = keyPath.split(".");
  let cursor = obj;
  for (const segment of segments) {
    if (!cursor || typeof cursor !== "object") return undefined;
    cursor = cursor[segment];
  }
  return cursor;
}

export async function loadSources() {
  const envJson = process.env.PIPELINE_SOURCES_JSON;
  if (envJson) {
    const parsed = JSON.parse(envJson);
    if (!Array.isArray(parsed)) throw new Error("PIPELINE_SOURCES_JSON should be an array");
    return parsed;
  }

  const filePath = existsSync(DEFAULT_SOURCES_PATH) ? DEFAULT_SOURCES_PATH : SAMPLE_SOURCES_PATH;
  const raw = await readFile(filePath, "utf-8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("sources file should be an array");
  return parsed;
}

export async function fetchRssSource(source) {
  const response = await fetch(source.url);
  if (!response.ok) throw new Error(`RSS fetch failed: ${response.status}`);
  const xml = await response.text();
  const items = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];

  const extract = (item, tag) => {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
    const match = item.match(regex);
    return match ? stripHtml(match[1]) : "";
  };

  return items.map((item) => ({
    externalId: firstNonEmpty(extract(item, "guid"), extract(item, "link"), extract(item, "title")),
    title: extract(item, "title"),
    description: extract(item, "description"),
    url: extract(item, "link"),
    image: (() => {
      const enclosure = item.match(/<enclosure[^>]*url="([^"]+)"/i);
      return enclosure?.[1] ?? "";
    })(),
    startAt: "",
    endAt: "",
    tags: [],
  }));
}

export async function fetchGithubJsonSource(source) {
  const response = await fetch(source.url);
  if (!response.ok) throw new Error(`JSON fetch failed: ${response.status}`);
  const json = await response.json();
  if (!Array.isArray(json)) throw new Error("JSON source should be an array");

  const mapping = source.mapping ?? {};
  const mapField = (row, field, fallback = "") => {
    const path = mapping[field] ?? field;
    const value = deepPick(row, path);
    return typeof value === "string" ? value : fallback;
  };

  return json.map((row, index) => ({
    externalId: firstNonEmpty(mapField(row, "id"), mapField(row, "url"), `row-${index + 1}`),
    title: mapField(row, "title"),
    description: mapField(row, "description"),
    url: mapField(row, "url"),
    image: mapField(row, "image"),
    startAt: mapField(row, "startAt"),
    endAt: mapField(row, "endAt"),
    tags: Array.isArray(row.tags) ? row.tags.map((x) => String(x)) : [],
  }));
}

export async function fetchAmapPoiSource(source) {
  const keyEnv = source.keyEnv || "AMAP_WEB_SERVICE_KEY";
  const apiKey = typeof process.env[keyEnv] === "string" ? process.env[keyEnv].trim() : "";
  if (!apiKey) {
    console.warn(`[content-pipeline] skip source=${source.id}: missing env ${keyEnv}`);
    return [];
  }

  const keywords = Array.isArray(source.keywords)
    ? source.keywords.map((x) => String(x).trim()).filter(Boolean)
    : [String(source.keywords ?? "").trim()].filter(Boolean);
  if (!keywords.length) {
    console.warn(`[content-pipeline] skip source=${source.id}: no keywords configured`);
    return [];
  }

  const city = source.city || "长沙";
  const citylimit = source.citylimit === true ? "true" : "false";
  const types = source.types ? String(source.types) : "";
  const pageSize = Number.isFinite(Number(source.pageSize)) ? Math.max(1, Math.min(20, Number(source.pageSize))) : 20;
  const maxPages = Number.isFinite(Number(source.maxPages)) ? Math.max(1, Math.min(5, Number(source.maxPages))) : 1;
  const sleepMs = Number.isFinite(Number(source.sleepMs)) ? Math.max(0, Number(source.sleepMs)) : 200;
  const debug = source.debug === true || process.argv.includes("--debug");

  const list = [];
  for (const keyword of keywords) {
    for (let page = 1; page <= maxPages; page += 1) {
      const qs = new URLSearchParams({
        key: apiKey,
        keywords: keyword,
        city,
        citylimit,
        offset: String(pageSize),
        page: String(page),
        extensions: "base",
      });
      if (types) qs.set("types", types);

      const url = `https://restapi.amap.com/v3/place/text?${qs.toString()}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Amap fetch failed: ${response.status}`);
      const body = await response.json();
      const status = String(body?.status ?? "");
      const info = String(body?.info ?? "");
      const infocode = String(body?.infocode ?? "");
      if (status !== "1") {
        console.warn(
          `[content-pipeline] amap error source=${source.id} keyword="${keyword}" page=${page} status=${status} infocode=${infocode} info=${info}`
        );
        break;
      }

      const pois = Array.isArray(body?.pois) ? body.pois : [];
      if (debug) {
        console.log(`[content-pipeline] amap source=${source.id} keyword="${keyword}" page=${page} pois=${pois.length}`);
      }

      for (const poi of pois) {
        const adname = firstNonEmpty(poi.adname, "");
        const address = firstNonEmpty(poi.address, "");
        list.push({
          externalId: firstNonEmpty(poi.id, poi.name, `${keyword}-${page}`),
          title: firstNonEmpty(poi.name),
          description: [adname, address].filter(Boolean).join(" "),
          url: poi.id
            ? `https://uri.amap.com/marker?position=${encodeURIComponent(poi.location || "")}&name=${encodeURIComponent(poi.name || "")}`
            : "",
          image: "",
          startAt: "",
          endAt: "",
          tags: [keyword, adname, source.defaultTag || "POI"].filter(Boolean),
        });
      }

      if (sleepMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, sleepMs));
      }

      if (pois.length < pageSize) {
        break;
      }
    }
  }

  return list;
}

export async function fetchRawFromSource(source) {
  const adapter = source.type;
  if (adapter === "rss") return fetchRssSource(source);
  if (adapter === "github_json") return fetchGithubJsonSource(source);
  if (adapter === "amap_poi") return fetchAmapPoiSource(source);
  return [];
}
