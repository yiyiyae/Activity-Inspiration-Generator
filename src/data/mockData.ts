// 本地兜底数据：当 Notion 接口不可用时，页面会使用这里的数据继续运行。
export type WeatherType = "Sunny" | "Cloudy" | "Rainy";
export type TimeType = "Morning" | "Afternoon" | "Evening";

export type LocationItem = {
  id: string;
  title: string;
  tags: string[];
  suitableWeather: WeatherType[];
  suitableTime: TimeType[];
  p_mode: {
    image: string;
    hook_text: string;
    action_prompt: string;
  };
  // 兼容新结构：j_activities 字符串可用于动态推算时间轴。
  j_activities?: string;
  j_mode: {
    timeline: string[];
    checklist: string[];
    warning: string;
  };
};

export const locations: LocationItem[] = [
  {
    id: "1",
    title: "潮宗街散步",
    tags: ["户外", "散步", "出片"],
    suitableWeather: ["Sunny", "Cloudy"],
    suitableTime: ["Afternoon"],
    p_mode: {
      image:
        "https://images.unsplash.com/photo-1514539079130-25950c84af65?auto=format&fit=crop&q=80&w=800",
      hook_text: "在潮宗街的麻石路上，虚度一个微风下午。",
      action_prompt: "不要看导航，看到第一只橘猫就停下来喝杯咖啡。",
    },
    j_activities: "抵达潮宗街牌坊入口(0.2) | 钻进错综巷子逛独立书店(1.5) | 找家露台咖啡馆看路人(1.0)",
    j_mode: {
      timeline: ["14:00 潮宗街牌坊入口打卡", "15:00 随便钻进一家中古店", "17:00 中山路出口找家地道湘菜"],
      checklist: ["降噪耳机", "平底鞋 (划重点，麻石路废脚)", "满电的充电宝"],
      warning: "周末下午人多，想拍空镜建议上午 11 点前去。",
    },
  },
  {
    id: "2",
    title: "省博历史沉浸",
    tags: ["室内", "看展", "安静"],
    suitableWeather: ["Rainy", "Sunny", "Cloudy"],
    suitableTime: ["Morning", "Afternoon"],
    p_mode: {
      image:
        "https://images.unsplash.com/photo-1544928147-79a2dbc1f389?auto=format&fit=crop&q=80&w=800",
      hook_text: "去看看两千年前的辛追夫人，感受时间的厚度。",
      action_prompt: "什么都不用带，去二楼文创店随机买一个盲盒作为今天的纪念。",
    },
    j_activities: "提前预约并刷身份证入馆(0.3) | 一楼马王堆陈列馆沉浸式参观(1.6) | 三楼青铜器展慢看细节(1.2)",
    j_mode: {
      timeline: ["09:00 提前预约，刷身份证入馆", "09:30 直奔一楼马王堆陈列馆", "11:30 去三楼看青铜器展"],
      checklist: ["身份证 (必带!)", "一件薄外套 (馆内冷气足)", "平底鞋"],
      warning: "千万别周末去排队，周一闭馆，注意避开。",
    },
  },
  {
    id: "3",
    title: "冬瓜山夜宵大作战",
    tags: ["吃喝", "夜市", "热闹"],
    suitableWeather: ["Sunny", "Cloudy"],
    suitableTime: ["Evening"],
    p_mode: {
      image:
        "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=800",
      hook_text: "碳水和脂肪，是对抗工作日焦灼的最好解药。",
      action_prompt: "今天把卡路里抛在脑后，看到排队最长的那家肉肠店，直接排！",
    },
    j_activities: "抵达冬瓜山入口(0.2) | 买两根肉肠垫肚子并逛街(0.5) | 找紫苏桃子姜解腻收尾(0.8)",
    j_mode: {
      timeline: ["20:00 抵达冬瓜山入口", "20:15 买两根冬瓜山肉肠垫肚子", "20:45 找一家紫苏桃子姜解腻", "21:30 吃饱喝足散步消食"],
      checklist: ["健胃消食片", "纸巾/湿巾", "穿宽松的衣服"],
      warning: "别开车去！别开车去！那里根本找不到停车位，直接打车或地铁。",
    },
  },
];
