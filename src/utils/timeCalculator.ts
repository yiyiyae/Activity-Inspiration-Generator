// J 模式时间推算工具：解析 "动作(时长) | 动作(时长)" 并动态生成时间轴。
export type DynamicTimelineItem = {
  time: string;
  action: string;
};

export function generateDynamicTimeline(activitiesString: string, selectedTime: string): DynamicTimelineItem[] {
  // 1. 定义基准时间 (将小时转化为分钟，方便计算)
  let currentMinutes = 0;
  if (selectedTime === "上午") currentMinutes = 9 * 60 + 30; // 09:30
  else if (selectedTime === "下午") currentMinutes = 14 * 60; // 14:00
  else if (selectedTime === "晚上") currentMinutes = 19 * 60; // 19:00
  else currentMinutes = 14 * 60; // 兜底默认下午

  // 2. 分割字符串并过滤空值
  const rawItems = activitiesString
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);

  const timeline: DynamicTimelineItem[] = [];

  // 3. 遍历解析与时间累加
  for (const item of rawItems) {
    // 正则匹配：提取最后括号前的所有内容作为 action，括号内的数字作为时长
    // 例如匹配 "抵达书店并核销座位或点单(0.3)"
    const match = item.match(/^(.*?)\s*\(([\d.]+)\)$/);

    let actionText = item;
    let durationHours = 0;

    if (match) {
      actionText = match[1].trim(); // 净化后的动作文本
      durationHours = parseFloat(match[2]) || 0; // 提取的时长
    } else {
      // 容错处理：如果字符串里根本没写括号，默认当前 action 时长为 0
      actionText = item.trim();
    }

    // 4. 将当前时间格式化为 HH:mm
    const hours = Math.floor(currentMinutes / 60);
    const mins = Math.floor(currentMinutes % 60);
    const formattedTime = `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;

    // 5. 推入结果数组
    timeline.push({
      time: formattedTime,
      action: actionText,
    });

    // 6. 累加时间，供下一个动作使用
    currentMinutes += durationHours * 60;
  }

  return timeline;
}
