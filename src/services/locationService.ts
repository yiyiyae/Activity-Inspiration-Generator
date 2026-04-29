// 数据服务层：优先拉取 Notion API，失败时自动回退到本地 mock 数据。
import { locations, type LocationItem } from "../data/mockData";

export type LocationResult = {
  data: LocationItem[];
  source: "notion" | "mock";
  error?: string;
};

const CACHE_KEY = "weekend_prescription_locations_cache_v1";
const CACHE_TTL_MS = 1000 * 60 * 10;

type CachePayload = {
  timestamp: number;
  source: "notion" | "mock";
  data: LocationItem[];
};

let memoryCache: CachePayload | null = null;

function isUsableCache(payload: CachePayload | null): payload is CachePayload {
  if (!payload) return false;
  if (!Array.isArray(payload.data) || payload.data.length === 0) return false;
  return Date.now() - payload.timestamp <= CACHE_TTL_MS;
}

function readLocalCache(): CachePayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachePayload;
  } catch {
    return null;
  }
}

function writeLocalCache(payload: CachePayload) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // 缓存写失败不影响主流程
  }
}

function getEndpoint() {
  return import.meta.env.DEV ? "/__api/locations" : "/api/locations";
}

export function getCachedLocations(): LocationResult | null {
  if (isUsableCache(memoryCache)) {
    return { data: memoryCache.data, source: memoryCache.source };
  }

  const local = readLocalCache();
  if (isUsableCache(local)) {
    memoryCache = local;
    return { data: local.data, source: local.source };
  }

  return null;
}

export async function getLocations(): Promise<LocationResult> {
  try {
    const endpoint = getEndpoint();
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const data = (await response.json()) as LocationItem[];
    if (!Array.isArray(data) || !data.length) {
      throw new Error("Empty location list from API");
    }

    const payload: CachePayload = {
      timestamp: Date.now(),
      source: "notion",
      data,
    };
    memoryCache = payload;
    writeLocalCache(payload);

    return { data, source: "notion" };
  } catch (error) {
    const payload: CachePayload = {
      timestamp: Date.now(),
      source: "mock",
      data: locations,
    };
    memoryCache = payload;
    writeLocalCache(payload);

    return {
      data: locations,
      source: "mock",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
