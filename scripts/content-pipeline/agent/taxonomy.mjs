export const VENUE_VOCAB = [
  "书店",
  "咖啡馆",
  "寺庙",
  "街区",
  "公园",
  "展馆",
  "山野",
  "动物空间",
  "夜市",
  "商圈",
  "手作坊",
  "运动场馆",
  "未知",
];

export const ACTION_VOCAB = [
  "散步",
  "拍照",
  "阅读",
  "发呆",
  "嗦粉",
  "爬山",
  "看展",
  "喝酒",
  "祈福",
  "运动",
  "骑行",
  "露营",
  "探店",
  "未知",
];

export const VIBE_VOCAB = [
  "复古",
  "文艺",
  "市井",
  "青春",
  "治愈",
  "出片",
  "浪漫",
  "硬核",
  "赛博朋克",
  "宁静",
  "热闹",
  "未知",
];

export const VENUE_RULES = [
  { tag: "咖啡馆", pattern: /咖啡|茶饮|茶馆|甜品|下午茶|奶茶/g },
  { tag: "书店", pattern: /书店|书吧|阅读空间/g },
  { tag: "展馆", pattern: /展览|博物馆|美术馆|艺术馆|非遗|纪念馆/g },
  { tag: "寺庙", pattern: /寺|祈福|禅修|香火/g },
  { tag: "公园", pattern: /公园|绿道|湖边|江边|滨江|湿地/g },
  { tag: "山野", pattern: /山|森林|徒步道|山谷|山脊|露营地/g },
  { tag: "夜市", pattern: /夜市|夜宵街|小吃街/g },
  { tag: "商圈", pattern: /商圈|广场|购物中心|mall|步行街/gi },
  { tag: "手作坊", pattern: /手作|陶艺|银饰|木工|编织/g },
  { tag: "运动场馆", pattern: /球馆|健身房|攀岩|滑板|羽毛球|篮球|网球/g },
  { tag: "街区", pattern: /老街|街区|里巷|citywalk|街拍/gi },
  { tag: "动物空间", pattern: /动物|猫咖|狗咖|萌宠|动物园/g },
];

export const ACTION_RULES = [
  { tag: "散步", pattern: /散步|漫步|溜达|压马路|citywalk/gi },
  { tag: "拍照", pattern: /拍照|出片|摄影|打卡/g },
  { tag: "阅读", pattern: /阅读|看书|翻书/g },
  { tag: "发呆", pattern: /发呆|放空|坐坐|静坐/g },
  { tag: "嗦粉", pattern: /嗦粉|吃粉|米粉|小吃|夜宵/g },
  { tag: "爬山", pattern: /爬山|登山|徒步/g },
  { tag: "看展", pattern: /看展|观展|展览|博物馆|美术馆/g },
  { tag: "喝酒", pattern: /喝酒|小酌|酒吧|调酒/g },
  { tag: "祈福", pattern: /祈福|还愿|上香/g },
  { tag: "运动", pattern: /运动|健身|训练|打球/g },
  { tag: "骑行", pattern: /骑行|骑车/g },
  { tag: "露营", pattern: /露营|扎营/g },
  { tag: "探店", pattern: /探店|踩点|逛店/g },
];

export const VIBE_RULES = [
  { tag: "治愈", pattern: /治愈|放松|松弛|疗愈|舒缓/g },
  { tag: "文艺", pattern: /文艺|艺术|人文/g },
  { tag: "复古", pattern: /复古|怀旧|老派/g },
  { tag: "市井", pattern: /烟火|市井|接地气/g },
  { tag: "青春", pattern: /青春|活力|元气/g },
  { tag: "出片", pattern: /出片|好拍|摄影|打卡/g },
  { tag: "浪漫", pattern: /浪漫|约会|氛围感/g },
  { tag: "硬核", pattern: /硬核|强度|挑战/g },
  { tag: "赛博朋克", pattern: /赛博|霓虹|未来感/g },
  { tag: "宁静", pattern: /安静|宁静|清净/g },
  { tag: "热闹", pattern: /热闹|人多|沸腾|热辣/g },
];

export const SCENE_TO_VENUE = {
  cafe: "咖啡馆",
  culture: "展馆",
  outdoor: "公园",
  nightlife: "夜市",
  mixed: "街区",
};

export const SCENE_TO_ACTION = {
  cafe: ["探店", "发呆"],
  culture: ["看展", "散步"],
  outdoor: ["散步", "拍照"],
  nightlife: ["探店", "嗦粉"],
  mixed: ["散步", "探店"],
};

export const SCENE_TO_VIBE = {
  cafe: ["治愈", "宁静"],
  culture: ["文艺", "宁静"],
  outdoor: ["治愈", "出片"],
  nightlife: ["热闹", "市井"],
  mixed: ["文艺", "治愈"],
};
