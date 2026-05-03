import {
  VENUE_RULES,
  ACTION_RULES,
  VIBE_RULES,
  SCENE_TO_VENUE,
  SCENE_TO_ACTION,
  SCENE_TO_VIBE,
} from "./taxonomy.mjs";

function isValidChineseTag(value) {
  return /^[\u4e00-\u9fff]{2,6}$/.test(value);
}

function unique(items) {
  return Array.from(new Set(items.filter(Boolean)));
}

function scoreByRules(text, rules) {
  const scored = new Map();
  for (const rule of rules) {
    const matches = text.match(rule.pattern);
    if (!matches?.length) continue;
    scored.set(rule.tag, (scored.get(rule.tag) ?? 0) + matches.length);
  }
  return [...scored.entries()].sort((a, b) => b[1] - a[1]).map(([tag]) => tag);
}

function normalizeBucket(candidates, maxSize, used) {
  const result = [];
  for (const tag of candidates) {
    if (result.length >= maxSize) break;
    if (!isValidChineseTag(tag)) continue;
    if (used.has(tag)) continue;
    used.add(tag);
    result.push(tag);
  }
  return result.length ? result : ["未知"];
}

export function tagByRuleAgent(input) {
  const text = [input.name, input.pHook, input.pAction, input.categoryOrTags].filter(Boolean).join(" ");
  const used = new Set();

  const venueCandidates = scoreByRules(text, VENUE_RULES);
  const actionCandidates = scoreByRules(text, ACTION_RULES);
  const vibeCandidates = scoreByRules(text, VIBE_RULES);

  if (input.scene && SCENE_TO_VENUE[input.scene]) {
    venueCandidates.unshift(SCENE_TO_VENUE[input.scene]);
  }
  if (input.scene && SCENE_TO_ACTION[input.scene]) {
    actionCandidates.unshift(...SCENE_TO_ACTION[input.scene]);
  }
  if (input.scene && SCENE_TO_VIBE[input.scene]) {
    vibeCandidates.unshift(...SCENE_TO_VIBE[input.scene]);
  }

  const venue_types = normalizeBucket(unique(venueCandidates), 2, used);
  const actions = normalizeBucket(unique(actionCandidates), 3, used);
  const vibes = normalizeBucket(unique(vibeCandidates), 3, used);

  return {
    venue_types,
    actions,
    vibes,
  };
}
