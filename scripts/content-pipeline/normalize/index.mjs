import { tagByRuleAgent } from "../agent/tagger.mjs";

const ENABLE_COPY_POLISH = process.env.PIPELINE_COPY_POLISH !== "0";

function stripHtml(input) {
  if (!input) return "";
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeKey(sourceId, raw) {
  const base = `${sourceId}|${raw.externalId ?? ""}|${raw.url ?? ""}|${raw.title ?? ""}`;
  let hash = 0;
  for (let i = 0; i < base.length; i += 1) {
    hash = (hash * 31 + base.charCodeAt(i)) >>> 0;
  }
  return `${sourceId}:${hash.toString(16)}`;
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function uniq(items) {
  return Array.from(new Set(items.filter(Boolean)));
}

function getTimeDefaultsByScene(scene) {
  if (scene === "cafe") return ["下午", "晚上", "上午"];
  if (scene === "culture") return ["下午", "上午"];
  if (scene === "nightlife") return ["晚上"];
  if (scene === "outdoor") return ["下午", "上午"];
  return ["下午", "晚上"];
}

function getWeatherDefaultsByScene(scene) {
  if (scene === "cafe" || scene === "culture") return ["晴天", "阴天", "雨天"];
  if (scene === "nightlife") return ["晴天", "阴天"];
  if (scene === "outdoor") return ["晴天", "阴天"];
  return ["晴天", "阴天", "雨天"];
}

function detectTimePeriod(title, description, startAtIso, scene) {
  const text = `${title} ${description}`.toLowerCase();
  const defaults = getTimeDefaultsByScene(scene);
  const hinted = [];
  if (text.includes("夜") || text.includes("晚") || text.includes("酒吧")) hinted.push("晚上");
  if (text.includes("早") || text.includes("晨")) hinted.push("上午");
  if (startAtIso) {
    const hour = new Date(startAtIso).getHours();
    if (hour <= 11) hinted.push("上午");
    if (hour >= 17) hinted.push("晚上");
    if (hour >= 12 && hour < 17) hinted.push("下午");
  }
  return uniq([...hinted, ...defaults]);
}

function detectWeather(title, description, scene) {
  const text = `${title} ${description}`;
  const defaults = getWeatherDefaultsByScene(scene);
  const hinted = [];
  if (/(雨|室内|展览|博物馆|商场)/.test(text)) hinted.push("雨天", "阴天");
  if (/(露营|徒步|骑行|公园|湖|山)/.test(text)) hinted.push("晴天", "阴天");
  return uniq([...hinted, ...defaults]);
}

function detectMood(tags) {
  const text = tags.join(" ");
  if (/(艺术|展览|手作|创意)/.test(text)) return ["新鲜感", "治愈"];
  if (/(夜市|live|演出|酒吧)/i.test(text)) return ["热闹一点", "新鲜感"];
  if (/(公园|散步|书店|咖啡|湖边)/.test(text)) return ["治愈", "随便走走"];
  return ["随便走走", "治愈"];
}

function hashSeed(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function pickBySeed(list, seed, offset = 0) {
  if (!list.length) return "";
  const index = (seed + offset) % list.length;
  return list[index];
}

function inferSceneWithConfidence(tags, title, description) {
  const text = `${tags.join(" ")} ${title} ${description}`;
  const rules = {
    cafe: [/咖啡馆?|茶饮|茶馆|甜品|书咖|下午茶|饮品|烘焙/g],
    nightlife: [/夜市|酒吧|live|演出|市集|商圈|夜宵|club/gi],
    culture: [/展览|博物馆|美术馆|艺术|书店|文创|非遗|剧场/g],
    outdoor: [/公园|徒步|骑行|露营|绿道|爬山|登山|徒步道/g],
  };

  const scoreMap = {};
  for (const [scene, sceneRules] of Object.entries(rules)) {
    let score = 0;
    for (const regex of sceneRules) {
      const matches = text.match(regex);
      if (matches?.length) score += matches.length;
    }
    scoreMap[scene] = score;
  }

  const hasCafeSignal = scoreMap.cafe > 0;
  if (!hasCafeSignal && /(湖|江|河|山)/.test(text)) {
    scoreMap.outdoor += 1;
  }

  const entries = Object.entries(scoreMap).sort((a, b) => b[1] - a[1]);
  const [topScene, topScore] = entries[0] ?? ["cafe", 0];
  const secondScore = entries[1]?.[1] ?? 0;

  if (topScore <= 0) {
    return {
      scene: "mixed",
      sceneConfidence: 0.45,
      sceneSignals: [],
    };
  }

  const margin = topScore - secondScore;
  const confidence = Math.max(0.55, Math.min(0.95, 0.55 + topScore * 0.08 + margin * 0.06));

  return {
    scene: topScene,
    sceneConfidence: Number(confidence.toFixed(2)),
    sceneSignals: Object.entries(scoreMap)
      .filter(([, score]) => score > 0)
      .map(([scene]) => scene),
  };
}

function normalizeStartHour(startAtIso, timePeriod) {
  if (startAtIso) {
    const hour = new Date(startAtIso).getHours();
    if (!Number.isNaN(hour)) return hour;
  }
  const primary = Array.isArray(timePeriod) && timePeriod.length ? timePeriod[0] : "下午";
  if (primary === "上午") return 10;
  if (primary === "晚上") return 19;
  return 14;
}

function hhmm(hour, minute = 0) {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function buildTimelineText({ scene, sceneConfidence, seed, startAtIso, timePeriod }) {
  const startHour = normalizeStartHour(startAtIso, timePeriod);
  const slot1 = hhmm(startHour);
  const slot2 = hhmm(Math.min(startHour + 1, 23), 20);
  const slot3 = hhmm(Math.min(startHour + 2, 23), 40);

  const sceneTemplates = {
    cafe: [
      [`${slot1} 先落座点单，给自己 10 分钟静下来`, `${slot2} 试一款新饮品或甜点，慢节奏聊天/发呆`, `${slot3} 整理一下本周情绪，再决定要不要换下一家`],
      [`${slot1} 先选最舒服的位置坐下`, `${slot2} 把这周最想做的 1 件事写下来`, `${slot3} 出门前沿街慢走 10 分钟收尾`],
    ],
    culture: [
      [`${slot1} 先看导览图，挑 2 个重点区`, `${slot2} 深看一个最有感觉的展区`, `${slot3} 去附近找个安静角落复盘`],
      [`${slot1} 快速逛全馆建立地图感`, `${slot2} 回到最打动你的展品前细看`, `${slot3} 出馆后散步消化一下`],
    ],
    outdoor: [
      [`${slot1} 从最轻松的路线热身`, `${slot2} 到视野最好的点停留拍照`, `${slot3} 走回补给点补水休息`],
      [`${slot1} 先按低强度路线起步`, `${slot2} 中段找阴凉处调整节奏`, `${slot3} 收尾时留 20 分钟慢走放松`],
    ],
    nightlife: [
      [`${slot1} 先踩点一圈再决定主场`, `${slot2} 选一家氛围最对的停留`, `${slot3} 高峰前撤离去吃点热的`],
      [`${slot1} 先从轻松档开始`, `${slot2} 到人最多前切换到次热门点`, `${slot3} 收尾补一顿夜宵`],
    ],
    mixed: [
      [`${slot1} 先到达并确认环境是否合拍`, `${slot2} 体验最核心环节 40 分钟`, `${slot3} 看现场状态决定收尾方式`],
      [`${slot1} 先做低承诺体验，别急着打满行程`, `${slot2} 若感觉对路再追加第二段`, `${slot3} 留 20 分钟给返程和整理`],
    ],
  };

  const lowConfidence = typeof sceneConfidence === "number" && sceneConfidence < 0.66;
  const resolvedScene = lowConfidence ? "mixed" : scene;
  const templates = sceneTemplates[resolvedScene] ?? sceneTemplates.mixed;
  const timeline = pickBySeed(templates, seed, 1) ?? templates[0];
  return timeline.join("\n");
}

function buildChecklistText({ tags, weather, scene }) {
  const base = ["手机电量 70% 以上", "舒适鞋", "随身水"];
  if (scene === "outdoor") base.push("防晒/帽子");
  if (scene === "cafe") base.push("轻外套（空调房）");
  if (scene === "culture") base.push("预留安静参观时间");
  if (scene === "nightlife") base.push("回程方案先想好");
  if (weather.includes("雨天")) base.push("折叠伞");
  if (tags.some((tag) => /(拍照|摄影)/.test(tag))) base.push("充电宝");
  return Array.from(new Set(base)).slice(0, 6).join("\n");
}

function buildWarningText({ scene, crowdLevel, seed }) {
  const warningPool = {
    nightlife: [
      "热门时段排队会突然变长，超过 20 分钟就换备选点，别硬等。",
      "晚高峰人流波动大，先看一眼附近替代点，临场切换更省心。",
    ],
    culture: [
      "闭馆前 1 小时体验会打折，建议把重点内容放在前半程。",
      "热门展区容易扎堆，先逛非高峰区域再回看主展区更舒服。",
    ],
    outdoor: [
      "户外节奏别拉太满，留体力给返程，体验会更完整。",
      "遇到人流拥堵就换支线，不必执着打卡点本身。",
    ],
    cafe: [
      "先确认营业和排队情况，超过预期就切到附近同类型店。",
      "周末高峰翻台慢，建议把“喝什么”优先于“必须这家店”。",
    ],
    mixed: [
      "这条灵感是混合场景，先做第一段体验，感觉不对就及时切换。",
      "把核心体验放在前半程，后半程保留机动空间会更稳。",
    ],
  };

  const crowdedAddon = crowdLevel === "拥挤" ? " 如果现场明显拥挤，优先保留核心环节，其他可删减。" : "";
  const templates = warningPool[scene] ?? warningPool.cafe;
  return `${pickBySeed(templates, seed, 2)}${crowdedAddon}`;
}

function normalizeCopyText(text) {
  return String(text ?? "")
    .replace(/\s+/g, " ")
    .replace(/，\s*，/g, "，")
    .replace(/。{2,}/g, "。")
    .trim();
}

function splitLines(text) {
  return String(text ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function buildPolishedHook({ name, moodIntents, seed }) {
  const mood = Array.isArray(moodIntents) && moodIntents.length ? moodIntents[0] : "随便走走";
  const moodPool = {
    治愈: ["把脑子调成省电模式，慢慢把自己捡回来。", "今天不拼效率，只拼舒服。", "让情绪先落地，再决定下一站。"],
    新鲜感: ["这次别走老路线，给周末一点新花样。", "先出门，再让现场决定剧情。", "把“重复的一天”改写成“有记忆点的一天”。"],
    随便走走: ["今天不赶进度，走到哪儿算哪儿。", "先把脚步放慢，灵感会自己冒出来。", "不设 KPI 的一段小出走，反而更上头。"],
    热闹一点: ["把社交电量开到中档，去人间里充会儿电。", "今晚别宅，去热闹里找回状态。", "把周末调成外放模式，和城市同频一下。"],
  };

  const pickedMoodLine = pickBySeed(moodPool[mood] ?? moodPool["随便走走"], seed, 11);
  return normalizeCopyText(`${name}，${pickedMoodLine}`);
}

function buildPolishedAction({ scene, partyMode, seed }) {
  const byScene = {
    cafe: ["先找个顺眼的位置坐下，点单后给自己 10 分钟放空，再决定要不要续摊。", "别急着打卡，先把第一杯喝完，再看心情加一站。"],
    culture: ["先快看全场，再回到最打动你的那一处深看 20 分钟。", "先选 1 个必看点，剩下交给现场灵感，不必逛满。"],
    outdoor: ["先走低强度路线热身，状态在线再加码，累了就及时收尾。", "按“先轻后重”的节奏走，留体力给返程和最后一段风景。"],
    nightlife: ["先踩点再定主场，人太多就立刻切备选，别把时间耗在排队上。", "先从轻松档开场，感觉对路再往热闹处升级。"],
    mixed: ["先做低承诺体验，觉得对味再追加第二段，不对就换点。", "先跑第一站试手感，20 分钟后再决定今天怎么继续。"],
  };

  const partyAddon = partyMode?.includes("朋友") ? " 朋友局优先确保集合点清晰，减少等待。" : "";
  const line = pickBySeed(byScene[scene] ?? byScene.mixed, seed, 13);
  return normalizeCopyText(`${line}${partyAddon}`);
}

function polishTimelineCopy(timelineText) {
  const lines = splitLines(timelineText).map((line) =>
    normalizeCopyText(
      line
        .replace("核心活动体验", "核心体验")
        .replace("收尾与返程", "收尾返程")
        .replace("到达并熟悉路线", "到达后先熟悉环境")
    )
  );
  return lines.join("\n");
}

function polishChecklistCopy(checklistText) {
  const rewritten = splitLines(checklistText).map((line) =>
    normalizeCopyText(line.replace("手机电量 70% 以上", "手机电量 70%+").replace("手机电量 80% 以上", "手机电量 80%+").replace("随身水", "随身水（小瓶即可）"))
  );
  return Array.from(new Set(rewritten)).slice(0, 6).join("\n");
}

function polishWarningCopy(warningText) {
  return normalizeCopyText(
    warningText
      .replace("立即切换到附近备选", "直接切换到附近备选")
      .replace("不必执着打卡点本身", "别和打卡点较劲")
      .replace("体验会更完整", "体验会更舒服")
  );
}

function applyCopyPolish(candidate, seed) {
  if (!ENABLE_COPY_POLISH) {
    return candidate;
  }

  return {
    ...candidate,
    pHook: buildPolishedHook({ name: candidate.name, moodIntents: candidate.moodIntents, seed }),
    pAction: buildPolishedAction({ scene: candidate.scene, partyMode: candidate.partyMode, seed }),
    jTimeline: polishTimelineCopy(candidate.jTimeline),
    jChecklist: polishChecklistCopy(candidate.jChecklist),
    jWarning: polishWarningCopy(candidate.jWarning),
  };
}

function detectPartyMode(tags, title, description) {
  const text = `${tags.join(" ")} ${title} ${description}`;
  if (/(夜市|酒吧|live|演出|派对|桌游|KTV)/i.test(text)) return ["朋友"];
  if (/(情侣|约会|双人|二人)/.test(text)) return ["双人"];
  if (/(书店|展览|博物馆|公园|咖啡|散步|独处)/.test(text)) return ["独处", "双人"];
  return ["独处", "双人"];
}

function detectEnergyLevel(tags, title, description) {
  const text = `${tags.join(" ")} ${title} ${description}`;
  if (/(徒步|骑行|爬山|球|露营|跑)/.test(text)) return ["中能量", "高能量"];
  if (/(按摩|疗愈|展览|咖啡|书店|散步)/.test(text)) return ["低能量", "中能量"];
  return ["中能量"];
}

function detectSocialIntensity(tags, title, description) {
  const text = `${tags.join(" ")} ${title} ${description}`;
  if (/(夜市|live|酒吧|演出|市集|派对)/i.test(text)) return "高社交";
  if (/(书店|博物馆|展览|疗愈|散步|咖啡)/.test(text)) return "低社交";
  return "中社交";
}

function detectBudgetLevel(tags, title, description) {
  const text = `${tags.join(" ")} ${title} ${description}`;
  if (/(免费|公园|步道|散步|图书馆)/.test(text)) return "低预算";
  if (/(酒店|高端|剧院|音乐会|私享)/.test(text)) return "高预算";
  return "中预算";
}

function detectCrowdLevel(tags, title, description) {
  const text = `${tags.join(" ")} ${title} ${description}`;
  if (/(夜市|热门|网红|商圈|演出|展会)/.test(text)) return "拥挤";
  if (/(公园|书店|展览|疗愈|森林)/.test(text)) return "安静";
  return "适中";
}

function computeConfidence(raw) {
  let score = 0.4;
  if (raw.title) score += 0.2;
  if (raw.description) score += 0.1;
  if (raw.url) score += 0.1;
  if (raw.startAt) score += 0.1;
  if (raw.image) score += 0.05;
  return Math.min(0.95, Number(score.toFixed(2)));
}

export function normalizeRawItem(source, raw) {
  const title = firstNonEmpty(raw.title, raw.name);
  if (!title) return null;
  const description = stripHtml(firstNonEmpty(raw.description, raw.summary, raw.content));
  const tags = Array.from(new Set([...(source.tags ?? []), ...(raw.tags ?? [])]))
    .map((item) => String(item).trim())
    .filter(Boolean);

  const moodIntents = detectMood(tags.concat([title, description]));
  const confidence = computeConfidence(raw);
  const autoPublishThreshold = Number(process.env.PIPELINE_AUTO_PUBLISH_CONFIDENCE ?? "0.85");
  const status = confidence >= autoPublishThreshold ? "published" : "draft";
  const sceneMeta = inferSceneWithConfidence(tags, title, description);
  const timePeriod = detectTimePeriod(title, description, raw.startAt, sceneMeta.scene);
  const weather = detectWeather(title, description, sceneMeta.scene);
  const partyMode = detectPartyMode(tags, title, description);
  const energyLevel = detectEnergyLevel(tags, title, description);
  const socialIntensity = detectSocialIntensity(tags, title, description);
  const budgetLevel = detectBudgetLevel(tags, title, description);
  const crowdLevel = detectCrowdLevel(tags, title, description);
  const seed = hashSeed(`${source.id}|${raw.externalId ?? ""}|${title}`);

  const baseCandidate = {
    dedupeKey: dedupeKey(source.id, raw),
    sourceUid: `${source.id}:${raw.externalId ?? raw.url ?? title}`,
    sourceName: source.name,
    sourceUrl: raw.url ?? "",
    sourceId: source.id,
    name: title.slice(0, 120),
    description,
    image: raw.image ?? "",
    tags: tags.slice(0, 10),
    category: tags.slice(0, 4),
    weather,
    timePeriod,
    partyMode,
    energyLevel,
    moodIntents,
    socialIntensity,
    budgetLevel,
    crowdLevel,
    pHook: `${title}，把周末从“想太多”切到“先出门”。`,
    pAction: "先不做完美攻略，按第一眼顺路走 20 分钟，再决定下一站。",
    jTimeline: buildTimelineText({
      scene: sceneMeta.scene,
      sceneConfidence: sceneMeta.sceneConfidence,
      seed,
      startAtIso: raw.startAt,
      timePeriod,
    }),
    jChecklist: buildChecklistText({
      tags,
      weather,
      scene: sceneMeta.scene,
    }),
    jWarning: buildWarningText({
      scene: sceneMeta.scene,
      crowdLevel,
      seed,
    }),
    scene: sceneMeta.scene,
    sceneConfidence: sceneMeta.sceneConfidence,
    sceneSignals: sceneMeta.sceneSignals,
    confidence,
    status,
    eventDate: raw.startAt ? raw.startAt.slice(0, 10) : null,
    expiresAt: raw.endAt ? raw.endAt.slice(0, 10) : null,
  };

  const polished = applyCopyPolish(baseCandidate, seed);
  const labels = tagByRuleAgent({
    name: polished.name,
    pHook: polished.pHook,
    pAction: polished.pAction,
    categoryOrTags: [...(polished.category ?? []), ...(polished.tags ?? [])].join(" "),
    scene: polished.scene,
  });

  return {
    ...polished,
    venueTypes: labels.venue_types,
    actionVerbs: labels.actions,
    vibeThemes: labels.vibes,
  };
}
