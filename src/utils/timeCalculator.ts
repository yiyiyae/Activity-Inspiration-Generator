// J 模式时间推算工具：兼容两种格式
// 1) "动作(时长) | 动作(时长)"
// 2) "14:00 动作"（逐行或 | 分隔）
export type DynamicTimelineItem = {
  time: string;
  action: string;
  relativeOffsetLabel: string;
};

export type TimelineOptions = {
  baseTimeHHmm?: string | null;
  roundingStepMinutes?: number;
};

function getBaseMinutes(selectedTime: string): number {
  if (selectedTime === "上午") return 9 * 60 + 30; // 09:30
  if (selectedTime === "下午") return 14 * 60; // 14:00
  if (selectedTime === "晚上") return 19 * 60; // 19:00
  return 14 * 60;
}

function parseHHmm(input?: string | null): number | null {
  if (!input) return null;
  const match = input.trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function roundToStep(minutes: number, step: number): number {
  if (step <= 1) return Math.round(minutes);
  return Math.round(minutes / step) * step;
}

function formatTime(minutes: number): string {
  const normalized = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

function formatOffset(offsetMinutes: number): string {
  if (offsetMinutes <= 0) return "出发后 +0 分钟";
  return `出发后 +${offsetMinutes} 分钟`;
}

function splitTimelineItems(input: string): string[] {
  return input
    .split(/\r?\n|\|/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function generateDynamicTimeline(
  activitiesString: string,
  selectedTime: string,
  options: TimelineOptions = {}
): DynamicTimelineItem[] {
  const rawItems = splitTimelineItems(activitiesString);
  if (!rawItems.length) return [];

  const step = Math.max(1, options.roundingStepMinutes ?? 5);
  const overrideBaseMinutes = parseHHmm(options.baseTimeHHmm);

  // 格式 A: "14:00 动作"
  const absoluteParsed = rawItems
    .map((item) => {
      const match = item.match(/^([01]?\d|2[0-3]):([0-5]\d)\s+(.+)$/);
      if (!match) return null;
      const hour = Number(match[1]);
      const minute = Number(match[2]);
      const action = match[3].trim();
      return {
        minutes: hour * 60 + minute,
        action,
      };
    })
    .filter((item): item is { minutes: number; action: string } => Boolean(item));

  if (absoluteParsed.length === rawItems.length) {
    const anchor = absoluteParsed[0].minutes;
    const base = overrideBaseMinutes ?? anchor;
    return absoluteParsed.map((item) => {
      const delta = roundToStep(item.minutes - anchor, step);
      const absolute = roundToStep(base + delta, step);
      return {
        time: formatTime(absolute),
        action: item.action,
        relativeOffsetLabel: formatOffset(Math.max(0, delta)),
      };
    });
  }

  // 格式 B: "动作(时长)"，按时长累加绝对时间。
  let currentMinutes = overrideBaseMinutes ?? getBaseMinutes(selectedTime);
  currentMinutes = roundToStep(currentMinutes, step);
  let elapsedMinutes = 0;

  return rawItems.map((item) => {
    const match = item.match(/^(.*?)\s*\(([\d.]+)\)$/);
    const action = (match ? match[1] : item).trim();
    const durationHours = Number(match?.[2] ?? 0);
    const rawDuration = Number.isFinite(durationHours) ? Math.max(0, Math.round(durationHours * 60)) : 0;
    const durationMinutes = roundToStep(rawDuration > 0 ? rawDuration : 40, step);

    const result: DynamicTimelineItem = {
      time: formatTime(currentMinutes),
      action,
      relativeOffsetLabel: formatOffset(elapsedMinutes),
    };

    currentMinutes += durationMinutes;
    elapsedMinutes += durationMinutes;
    return result;
  });
}
