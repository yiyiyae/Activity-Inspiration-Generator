import { NotionLocationItem } from "./notionLocations.js";

type WeatherType = "Sunny" | "Cloudy" | "Rainy";
type TimeType = "Morning" | "Afternoon" | "Evening";
type EnergyLevel = "low" | "medium" | "high";
type SocialLevel = "low" | "medium" | "high";

export type RecommendInput = {
  weather: WeatherType;
  time: TimeType;
  moodIntent: string;
  partyMode: string;
  energyLevel: EnergyLevel;
  socialIntensity?: SocialLevel;
  budgetLevel?: string;
  recentIds?: string[];
};

type ScoredItem = {
  item: NotionLocationItem;
  score: number;
  explain: string[];
};

const generationRoleWeight: Record<string, number> = {
  "人工精选": 1.0,
  "已审核动态卡": 0.9,
  "AI候选": 0.6,
  "待下架": 0.1,
};

const budgetRank: Record<string, number> = {
  "免费": 1,
  "低预算": 2,
  "中预算": 3,
  "高预算": 4,
  "不敏感": 0,
};

const energyRank: Record<string, number> = {
  "低能量": 1,
  "中能量": 2,
  "高能量": 3,
};

const socialRank: Record<string, number> = {
  "低社交": 1,
  "中社交": 2,
  "高社交": 3,
};

function gateByHardConditions(item: NotionLocationItem, input: RecommendInput): boolean {
  const weatherKnown = item.suitableWeather.length > 0;
  const timeKnown = item.suitableTime.length > 0;

  if (!weatherKnown && !timeKnown) return true;

  const weatherMatch = item.suitableWeather.includes(input.weather);
  const timeMatch = item.suitableTime.includes(input.time);

  // V1.5 轻量策略：不再要求“双命中”才放行。
  // 只要有一维匹配，或另一维缺省未知，就允许进入排序。
  return (weatherMatch || !weatherKnown) && (timeMatch || !timeKnown) ? true : weatherMatch || timeMatch;
}

function scoreContextFit(item: NotionLocationItem, input: RecommendInput): number {
  const weatherFit = item.suitableWeather.length ? (item.suitableWeather.includes(input.weather) ? 1 : 0.35) : 0.7;
  const timeFit = item.suitableTime.length ? (item.suitableTime.includes(input.time) ? 1 : 0.35) : 0.7;
  const crowdFit = input.socialIntensity
    ? Math.max(
        0,
        1 - Math.abs((socialRank[item.socialIntensity] ?? 2) - (input.socialIntensity === "low" ? 1 : input.socialIntensity === "medium" ? 2 : 3)) / 2
      )
    : 0.6;

  return 0.45 * weatherFit + 0.45 * timeFit + 0.1 * crowdFit;
}

function scoreIntentFit(item: NotionLocationItem, input: RecommendInput): number {
  const moodFit = item.moodIntents.includes(input.moodIntent) ? 1 : 0.2;
  const partyFit =
    input.partyMode === "UNKNOWN"
      ? 0.7
      : item.partyModes.includes(input.partyMode)
      ? 1
      : item.partyModes.includes("不限定")
      ? 0.7
      : 0.1;

  const targetEnergy = input.energyLevel === "low" ? 1 : input.energyLevel === "medium" ? 2 : 3;
  const sourceEnergy = item.energyLevels.map((x) => energyRank[x]).filter(Boolean);
  const energyGap = sourceEnergy.length ? Math.min(...sourceEnergy.map((v) => Math.abs(v - targetEnergy))) : 1;
  const energyFit = energyGap === 0 ? 1 : energyGap === 1 ? 0.6 : 0.1;

  const targetSocial = input.socialIntensity ? (input.socialIntensity === "low" ? 1 : input.socialIntensity === "medium" ? 2 : 3) : 2;
  const sourceSocial = socialRank[item.socialIntensity] ?? 2;
  const socialGap = Math.abs(sourceSocial - targetSocial);
  const socialFit = socialGap === 0 ? 1 : socialGap === 1 ? 0.5 : 0.1;

  return 0.4 * moodFit + 0.25 * partyFit + 0.2 * energyFit + 0.15 * socialFit;
}

function scoreFeasibilityFit(item: NotionLocationItem, input: RecommendInput): number {
  const itemBudget = budgetRank[item.budgetLevel] ?? 0;
  const targetBudget = input.budgetLevel ? budgetRank[input.budgetLevel] ?? 0 : 0;
  const budgetFit =
    !input.budgetLevel || targetBudget === 0 || itemBudget === 0
      ? 0.7
      : itemBudget <= targetBudget
      ? 1
      : itemBudget - targetBudget === 1
      ? 0.5
      : 0.2;

  const steps = item.j_mode.timeline.length;
  const complexityFit = steps <= 4 ? 1 : steps <= 6 ? 0.7 : 0.4;
  const stabilityFit = item.generationRole === "AI候选" ? 0.7 : 1;

  return 0.5 * budgetFit + 0.3 * complexityFit + 0.2 * stabilityFit;
}

function scoreQuality(item: NotionLocationItem): number {
  return generationRoleWeight[item.generationRole] ?? 0.7;
}

function scoreDiversity(item: NotionLocationItem, recentIds: string[]): number {
  if (!recentIds.length) return 1;
  return recentIds.includes(item.id) ? 0.1 : 1;
}

function buildExplain(item: NotionLocationItem, input: RecommendInput): string[] {
  const explain: string[] = [];
  if (item.suitableWeather.includes(input.weather)) explain.push("天气匹配");
  else if (!item.suitableWeather.length) explain.push("天气可去");
  if (item.suitableTime.includes(input.time)) explain.push("时段匹配");
  else if (!item.suitableTime.length) explain.push("时段可去");
  if (item.moodIntents.includes(input.moodIntent)) explain.push("意图匹配");
  if (item.partyModes.includes(input.partyMode)) explain.push("同行模式匹配");
  if (item.energyLevels.length) explain.push("能量强度可执行");
  return explain;
}

export function recommendLocations(items: NotionLocationItem[], input: RecommendInput, limit = 3): ScoredItem[] {
  const recentIds = input.recentIds ?? [];
  const scored = items
    .filter((item) => gateByHardConditions(item, input))
    .map((item) => {
      const context = scoreContextFit(item, input);
      const intent = scoreIntentFit(item, input);
      const feasibility = scoreFeasibilityFit(item, input);
      const quality = scoreQuality(item);
      const diversity = scoreDiversity(item, recentIds);
      const score = 35 * context + 30 * intent + 15 * feasibility + 10 * quality + 10 * diversity;
      return { item, score, explain: buildExplain(item, input) };
    })
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit);
}
