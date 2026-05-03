import { Client } from "@notionhq/client";

function notionText(text) {
  return [{ type: "text", text: { content: text.slice(0, 2000) } }];
}

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

const OPTION_CANONICALS = {
  晴天: ["sunny"],
  阴天: ["cloudy", "多云"],
  雨天: ["rainy"],
  上午: ["morning"],
  下午: ["afternoon"],
  晚上: ["evening", "night"],
  独处: ["solo", "alone", "single"],
  双人: ["couple", "pair", "two"],
  朋友: ["friends", "group"],
  低能量: ["low"],
  中能量: ["medium", "mid"],
  高能量: ["high"],
  低社交: ["low"],
  中社交: ["medium", "mid"],
  高社交: ["high"],
  低预算: ["low"],
  中预算: ["medium", "mid", "中"],
  高预算: ["high"],
  安静: ["quiet", "low"],
  适中: ["medium", "mid", "normal"],
  拥挤: ["high", "crowded", "busy"],
  AI流水线: ["ai pipeline"],
  咖啡馆: ["cafe"],
  文化场馆: ["culture"],
  户外自然: ["outdoor"],
  夜生活: ["nightlife"],
  混合场景: ["mixed"],
};

function buildAliasIndex() {
  const map = new Map();
  for (const [canonical, aliases] of Object.entries(OPTION_CANONICALS)) {
    map.set(normalizeText(canonical), canonical);
    for (const alias of aliases) {
      map.set(normalizeText(alias), canonical);
    }
  }
  return map;
}

const OPTION_ALIAS_INDEX = buildAliasIndex();

function chooseExistingOption(rawValue, options) {
  if (!Array.isArray(options) || !options.length) return String(rawValue).trim();
  const value = String(rawValue).trim();
  if (!value) return "";

  const optionsByNorm = new Map(options.map((item) => [normalizeText(item), item]));
  const direct = optionsByNorm.get(normalizeText(value));
  if (direct) return direct;

  const canonical = OPTION_ALIAS_INDEX.get(normalizeText(value));
  if (!canonical) return value;

  const canonicalMatch = optionsByNorm.get(normalizeText(canonical));
  if (canonicalMatch) return canonicalMatch;

  for (const option of options) {
    const optionCanonical = OPTION_ALIAS_INDEX.get(normalizeText(option));
    if (optionCanonical && optionCanonical === canonical) {
      return option;
    }
  }

  return value;
}

function propertyByNames(schema, names) {
  for (const name of names) {
    if (schema.has(name)) return schema.get(name);
  }
  return null;
}

function setProperty(properties, schema, names, value) {
  const target = propertyByNames(schema, names);
  if (!target) return;
  if (value === null || value === undefined) return;

  const { name, type, options } = target;
  if (type === "title") {
    if (!String(value).trim()) return;
    properties[name] = { title: notionText(String(value).trim()) };
    return;
  }
  if (type === "rich_text") {
    if (!String(value).trim()) return;
    properties[name] = { rich_text: notionText(String(value).trim()) };
    return;
  }
  if (type === "url") {
    if (!String(value).trim()) return;
    properties[name] = { url: String(value).trim() };
    return;
  }
  if (type === "number") {
    const numberValue = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(numberValue)) return;
    properties[name] = { number: numberValue };
    return;
  }
  if (type === "multi_select") {
    const list = Array.isArray(value) ? value : [value];
    const normalizedList = list
      .map((item) => chooseExistingOption(item, options))
      .map((item) => String(item).trim())
      .filter(Boolean)
      .slice(0, 20);
    if (!normalizedList.length) return;
    properties[name] = { multi_select: normalizedList.map((item) => ({ name: item })) };
    return;
  }
  if (type === "select") {
    const option = chooseExistingOption(value, options);
    if (!option) return;
    properties[name] = { select: { name: option } };
    return;
  }
  if (type === "status") {
    const option = chooseExistingOption(value, options);
    if (!option) return;
    properties[name] = { status: { name: option } };
    return;
  }
  if (type === "date") {
    const dateStr = String(value).trim();
    if (!dateStr) return;
    properties[name] = { date: { start: dateStr } };
  }
}

function buildNotionProperties(schema, candidate) {
  const properties = {};
  setProperty(properties, schema, ["Name", "name", "Title", "title"], candidate.name);
  setProperty(properties, schema, ["Category", "category", "Tags", "tags"], candidate.category);
  setProperty(properties, schema, ["Weather", "weather", "天气"], candidate.weather);
  setProperty(properties, schema, ["Time Period", "Time", "time", "时间"], candidate.timePeriod);
  setProperty(properties, schema, ["Main Image", "main_image", "image", "图片"], candidate.image);
  setProperty(properties, schema, ["P_Hook", "P Hook", "p_hook"], candidate.pHook);
  setProperty(properties, schema, ["P_Action", "P Action", "p_action"], candidate.pAction);
  setProperty(properties, schema, ["J_Timeline", "J Timeline", "j_timeline"], candidate.jTimeline);
  setProperty(properties, schema, ["J_Checklist", "J Checklist", "j_checklist"], candidate.jChecklist);
  setProperty(properties, schema, ["J_Warning", "J Warning", "j_warning"], candidate.jWarning);

  setProperty(properties, schema, ["Party Mode"], candidate.partyMode);
  setProperty(properties, schema, ["Venue Type", "Location Type", "空间载体"], candidate.venueTypes);
  setProperty(properties, schema, ["Action Verb", "Activity Verb", "核心动作"], candidate.actionVerbs);
  setProperty(properties, schema, ["Vibe Theme", "氛围风格"], candidate.vibeThemes);
  setProperty(properties, schema, ["Energy Level"], candidate.energyLevel);
  setProperty(properties, schema, ["Mood Intent"], candidate.moodIntents);
  setProperty(properties, schema, ["Social Intensity"], candidate.socialIntensity);
  setProperty(properties, schema, ["Budget Level"], candidate.budgetLevel);
  setProperty(properties, schema, ["Content Tags"], candidate.tags);
  setProperty(properties, schema, ["Generation Role"], "AI流水线");
  setProperty(properties, schema, ["Crowd Level"], candidate.crowdLevel ?? "适中");
  setProperty(
    properties,
    schema,
    ["Scene", "scene", "场景"],
    candidate.scene === "cafe"
      ? "咖啡馆"
      : candidate.scene === "culture"
      ? "文化场馆"
      : candidate.scene === "outdoor"
      ? "户外自然"
      : candidate.scene === "nightlife"
      ? "夜生活"
      : "混合场景"
  );
  setProperty(properties, schema, ["Scene Confidence", "scene_confidence", "场景置信度"], candidate.sceneConfidence);

  setProperty(properties, schema, ["Pipeline Status", "Status", "状态"], candidate.status);
  setProperty(properties, schema, ["Source URL", "source_url"], candidate.sourceUrl);
  setProperty(properties, schema, ["Source Name", "source_name"], candidate.sourceName);
  setProperty(properties, schema, ["Source UID", "Source ID", "External ID"], candidate.sourceUid);
  setProperty(properties, schema, ["Confidence", "confidence"], candidate.confidence);
  setProperty(properties, schema, ["Event Date", "event_date"], candidate.eventDate);
  setProperty(properties, schema, ["Expires At", "expires_at"], candidate.expiresAt);
  return properties;
}

function readTitle(page, propertyName) {
  const prop = page.properties?.[propertyName];
  if (!prop || !Array.isArray(prop.title)) return "";
  return prop.title.map((item) => item.plain_text ?? "").join("").trim();
}

function readRichText(page, propertyName) {
  const prop = page.properties?.[propertyName];
  if (!prop) return "";
  if (Array.isArray(prop.rich_text)) return prop.rich_text.map((item) => item.plain_text ?? "").join("").trim();
  if (Array.isArray(prop.title)) return prop.title.map((item) => item.plain_text ?? "").join("").trim();
  return "";
}

async function resolveDataSourceId(notion) {
  if (process.env.NOTION_DATA_SOURCE_ID) return process.env.NOTION_DATA_SOURCE_ID;
  const databaseId = process.env.NOTION_DATABASE_ID;
  if (!databaseId) throw new Error("Missing NOTION_DATA_SOURCE_ID and NOTION_DATABASE_ID");
  const retrieve = notion.databases?.retrieve;
  if (typeof retrieve !== "function") throw new Error("Notion SDK databases.retrieve unavailable");
  const database = await retrieve({ database_id: databaseId });
  const dataSourceId = database?.data_sources?.[0]?.id;
  if (!dataSourceId) throw new Error("No data source found under NOTION_DATABASE_ID");
  return dataSourceId;
}

async function loadSchema(notion, dataSourceId) {
  const retrieve = notion.dataSources?.retrieve;
  if (typeof retrieve !== "function") throw new Error("Notion SDK dataSources.retrieve unavailable");
  const dataSource = await retrieve({ data_source_id: dataSourceId });
  const schema = new Map();
  for (const [name, definition] of Object.entries(dataSource?.properties ?? {})) {
    const type = definition?.type ?? "unknown";
    const options =
      type === "multi_select"
        ? (definition?.multi_select?.options ?? []).map((item) => item?.name).filter(Boolean)
        : type === "select"
        ? (definition?.select?.options ?? []).map((item) => item?.name).filter(Boolean)
        : type === "status"
        ? (definition?.status?.options ?? []).map((item) => item?.name).filter(Boolean)
        : [];
    schema.set(name, { name, type, options });
  }
  return schema;
}

async function queryAllRows(notion, dataSourceId) {
  const query = notion.dataSources?.query;
  if (typeof query !== "function") throw new Error("Notion SDK dataSources.query unavailable");
  const all = [];
  let cursor = undefined;
  while (true) {
    const response = await query({ data_source_id: dataSourceId, page_size: 100, start_cursor: cursor });
    all.push(...(response.results ?? []));
    if (!response.has_more || !response.next_cursor) break;
    cursor = response.next_cursor;
  }
  return all;
}

function buildExistingIndex(rows, schema) {
  const sourceUidProp = propertyByNames(schema, ["Source UID", "Source ID", "External ID"]);
  const titleProp = propertyByNames(schema, ["Name", "name", "Title", "title"]);
  const map = new Map();
  for (const row of rows) {
    if (sourceUidProp) {
      const uid = readRichText(row, sourceUidProp.name);
      if (uid) map.set(uid, row);
    }
    if (titleProp) {
      const title = readTitle(row, titleProp.name);
      if (title && !map.has(title)) map.set(title, row);
    }
  }
  return map;
}

export async function upsertCandidates(candidates, options) {
  if (!candidates.length) {
    return { created: 0, updated: 0, skipped: 0, total: 0 };
  }

  if (options.dryRun) {
    return { created: candidates.length, updated: 0, skipped: 0, total: candidates.length };
  }

  const notionToken = process.env.NOTION_TOKEN;
  if (!notionToken) throw new Error("Missing NOTION_TOKEN");

  const notion = new Client({ auth: notionToken });
  const dataSourceId = await resolveDataSourceId(notion);
  const schema = await loadSchema(notion, dataSourceId);
  const rows = await queryAllRows(notion, dataSourceId);
  const existing = buildExistingIndex(rows, schema);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const candidate of candidates) {
    const properties = buildNotionProperties(schema, candidate);
    const identityKey = candidate.sourceUid || candidate.name;
    const matched = existing.get(identityKey);

    if (!Object.keys(properties).length) {
      skipped += 1;
      continue;
    }

    if (matched) {
      await notion.pages.update({
        page_id: matched.id,
        properties,
      });
      updated += 1;
    } else {
      await notion.pages.create({
        parent: { data_source_id: dataSourceId },
        properties,
      });
      created += 1;
    }
  }

  return { created, updated, skipped, total: candidates.length };
}
