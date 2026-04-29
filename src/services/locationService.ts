// 数据服务层：优先拉取 /api/locations，失败时自动回退到本地 mock 数据。
import { locations, type LocationItem } from "../data/mockData";

export type LocationResult = {
  data: LocationItem[];
  source: "notion" | "mock";
  error?: string;
};

export async function getLocations(): Promise<LocationResult> {
  try {
    const endpoint = import.meta.env.DEV ? "/__api/locations" : "/api/locations";
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const data = (await response.json()) as LocationItem[];
    if (!Array.isArray(data) || !data.length) {
      throw new Error("Empty location list from API");
    }

    return { data, source: "notion" };
  } catch (error) {
    return {
      data: locations,
      source: "mock",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

