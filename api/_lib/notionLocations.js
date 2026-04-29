// Notion 数据映射库：负责把数据库字段转换为前端 LocationItem 结构。
// 如果你改了 Notion 字段名，优先修改本文件的字段映射与归一化逻辑。
import { Client } from "@notionhq/client";
const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&q=80&w=1200";
const WEATHER_MAP = {
    Sunny: "Sunny",
    Cloudy: "Cloudy",
    Rainy: "Rainy",
    晴天: "Sunny",
    阴天: "Cloudy",
    雨天: "Rainy",
};
const TIME_MAP = {
    Morning: "Morning",
    Afternoon: "Afternoon",
    Evening: "Evening",
    上午: "Morning",
    下午: "Afternoon",
    晚上: "Evening",
    夜晚: "Evening",
};
function pickProperty(properties, keys) {
    for (const key of keys) {
        if (properties[key]) {
            return properties[key];
        }
    }
    return null;
}
function getTitle(properties, keys) {
    const prop = pickProperty(properties, keys);
    if (!prop)
        return "";
    if (prop.title?.length)
        return prop.title.map((item) => item.plain_text ?? "").join("").trim();
    if (prop.rich_text?.length)
        return prop.rich_text.map((item) => item.plain_text ?? "").join("").trim();
    return "";
}
function getRichText(properties, keys) {
    const prop = pickProperty(properties, keys);
    if (!prop)
        return "";
    if (prop.rich_text?.length)
        return prop.rich_text.map((item) => item.plain_text ?? "").join("").trim();
    if (prop.title?.length)
        return prop.title.map((item) => item.plain_text ?? "").join("").trim();
    return "";
}
function getUrl(properties, keys) {
    const prop = pickProperty(properties, keys);
    if (!prop)
        return "";
    return prop.url ?? "";
}
function getMultiSelect(properties, keys) {
    const prop = pickProperty(properties, keys);
    if (!prop?.multi_select)
        return [];
    return prop.multi_select.map((item) => item.name).filter(Boolean);
}
function getListFromText(input) {
    if (!input)
        return [];
    return input
        .split(/\r?\n|\||；|;/)
        .map((line) => line.trim())
        .filter(Boolean);
}
function normalizeWeather(items) {
    const mapped = items.map((item) => WEATHER_MAP[item]).filter(Boolean);
    return Array.from(new Set(mapped));
}
function normalizeTime(items) {
    const mapped = items.map((item) => TIME_MAP[item]).filter(Boolean);
    return Array.from(new Set(mapped));
}
function mapPageToLocation(page) {
    const props = page.properties ?? {};
    const timelineText = getRichText(props, ["J_Timeline", "J Timeline", "j_timeline", "timeline"]);
    const checklistText = getRichText(props, ["J_Checklist", "J Checklist", "j_checklist", "checklist"]);
    const suitableWeather = normalizeWeather(getMultiSelect(props, ["Weather", "weather", "天气"]));
    const suitableTime = normalizeTime(getMultiSelect(props, ["Time Period", "Time", "time", "时间"]));
    const mainImage = getUrl(props, ["Main Image", "main_image", "image", "图片"]);
    return {
        id: page.id,
        title: getTitle(props, ["Name", "name", "Title", "title"]),
        tags: getMultiSelect(props, ["Category", "category", "Tags", "tags", "标签"]),
        suitableWeather,
        suitableTime,
        p_mode: {
            image: mainImage || FALLBACK_IMAGE,
            hook_text: getRichText(props, ["P_Hook", "P Hook", "p_hook", "hook_text"]),
            action_prompt: getRichText(props, ["P_Action", "P Action", "p_action", "action_prompt"]),
        },
        j_mode: {
            timeline: getListFromText(timelineText),
            checklist: getListFromText(checklistText),
            warning: getRichText(props, ["J_Warning", "J Warning", "j_warning", "warning"]),
        },
    };
}
export async function queryMappedLocations() {
    const notionToken = process.env.NOTION_TOKEN;
    if (!notionToken) {
        throw new Error("Missing NOTION_TOKEN");
    }
    const notion = new Client({ auth: notionToken });
    const dataSourceId = await resolveDataSourceId(notion);
    const response = await queryRowsByDataSource(notion, dataSourceId, 100);
    return response.results
        .map(mapPageToLocation)
        .filter((item) => item.title.trim())
        .filter((item) => item.suitableWeather.length && item.suitableTime.length);
}
export async function queryRawPages() {
    const notionToken = process.env.NOTION_TOKEN;
    if (!notionToken) {
        throw new Error("Missing NOTION_TOKEN");
    }
    const notion = new Client({ auth: notionToken });
    const dataSourceId = await resolveDataSourceId(notion);
    const response = await queryRowsByDataSource(notion, dataSourceId, 10);
    return response.results;
}
async function resolveDataSourceId(notion) {
    const directDataSourceId = process.env.NOTION_DATA_SOURCE_ID;
    if (directDataSourceId) {
        return directDataSourceId;
    }
    const databaseId = process.env.NOTION_DATABASE_ID;
    if (!databaseId) {
        throw new Error("Missing NOTION_DATA_SOURCE_ID and NOTION_DATABASE_ID");
    }
    const databasesRetrieve = notion.databases?.retrieve;
    if (typeof databasesRetrieve !== "function") {
        throw new Error("NOTION_DATA_SOURCE_ID is required: databases.retrieve is unavailable in current SDK");
    }
    const database = await databasesRetrieve({ database_id: databaseId });
    const firstDataSourceId = database?.data_sources?.[0]?.id;
    if (!firstDataSourceId) {
        throw new Error("No data source found under NOTION_DATABASE_ID");
    }
    return firstDataSourceId;
}
async function queryRowsByDataSource(notion, dataSourceId, pageSize) {
    const dataSourcesQuery = notion.dataSources?.query;
    if (typeof dataSourcesQuery !== "function") {
        throw new Error("Notion dataSources.query is unavailable in current SDK version");
    }
    return dataSourcesQuery({
        data_source_id: dataSourceId,
        page_size: pageSize,
    });
}
