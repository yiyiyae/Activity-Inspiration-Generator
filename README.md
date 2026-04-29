【角色设定】
你现在是一位顶级的资深全栈工程师兼拥有极高审美的 UI/UX 设计师。我们将一起开发一款名为《周末处方药（长沙出gai灵感）》的移动端 Web App (MVP版本)。
这款产品专治年轻人“周末出门决策内耗”。核心理念是：不提供冗长的攻略，只提供极具情绪价值的“即时指令”。

【技术栈与开发规范】

前端框架： React (推荐使用 Vite 初始化)

CSS 方案： Tailwind CSS (需要极其精细的响应式设计，强制锁定为移动端竖屏比例展示，PC 端居中显示并限制最大宽度 max-w-md)

状态管理： React Context 或 Zustand (用于全局管理用户的 MBTI 主题皮肤和 P/J 状态)

图标库： lucide-react

数据源： 纯前端项目，不连接真实后端。所有数据使用本地写死的 mockData.json。

【核心产品架构：身份决定视觉，状态决定玩法】
本产品需实现一套精密的“16人格皮肤系统”及“P/J双轨交互系统”：

1. 视觉系统（Theme Engine）：
将 16 种 MBTI 映射为 4 大 CSS 视觉家族。用户确定身份后，全局切换 activeTheme：

NT 家族 (INTJ, INTP, ENTJ, ENTP)： theme-nt（极简/代码风）。深色背景，等宽字体 (Monospace)，高对比度荧光色，直角边框。

NF 家族 (INFJ, INFP, ENFJ, ENFP)： theme-nf（治愈/拼贴风）。莫兰迪/马卡龙色调，圆润边框，手写体风格标题，柔和阴影。

SJ 家族 (ISTJ, ISFJ, ESTJ, ESFJ)： theme-sj（复古/报纸风）。牛皮纸/米白色背景，衬线字体 (Serif)，经典网格排版，沉稳的森林绿/棕色。

SP 家族 (ISTP, ISFP, ESTP, ESFP)： theme-sp（波普/街头风）。高饱和度撞色（黄/黑/亮橙），粗斜体，夸张的按钮交互动效。

2. 核心用户路径 (User Flow) 与页面规划：

Page 1 - 新手村 (Onboarding)： 默认极简中性风。提供“直接选择 MBTI”或“做3道极简选择题”的入口。获取结果后，全局应用对应的 4 大视觉家族皮肤。

Page 2 - 情绪问诊台 (Mode Select)： 应用专属皮肤。提供两个大按钮选择当下的交互玩法：

选 A 进入 P 模式：“脑子宕机了，随便给我个地方 (随机盲盒)”

选 B 进入 J 模式：“我有特定需求，帮我匹配 (精准筛查)”

Page 3 - 核心交互区 (Interaction)：

P 模式： 类似盲盒扭蛋，无条件筛选，点击一键随机抽取地点。

J 模式： 提供 3 个极简下拉筛选器（时间、天气、人数），点击生成计划。

Page 4 - 处方结果卡 (Result Card)： 最终分享页，需设计得像一张“实体凭证”。P模式重氛围和随机指令，J模式重时间轴和防坑清单。

【Mock Data 数据结构定义】
请在项目中创建一个 src/data/mockData.ts，按照以下结构生成至少 3 条测试数据：

TypeScript
export const locations = [
  {
    id: "1",
    title: "潮宗街散步",
    tags: ["户外", "散步", "咖啡"],
    suitableWeather: ["Sunny", "Cloudy"],
    p_mode: {
      image: "https://images.unsplash.com/photo-1514539079130-25950c84af65?auto=format&fit=crop&q=80&w=800",
      hook_text: "在潮宗街的麻石路上，虚度一个微风下午",
      action_prompt: "不要看导航，看到第一只橘猫就停下来喝杯咖啡。"
    },
    j_mode: {
      timeline: ["14:00 牌坊入口打卡", "15:00 锤子咖啡二楼看人", "17:00 中山路出口吃湘菜"],
      checklist: ["降噪耳机", "平底鞋 (划重点)", "充电宝"],
      warning: "周末下午人多，想拍空镜建议上午 11 点前去。"
    }
  }
];
【你的执行指令：Step 1】
为了保证质量，我们将分步进行。请你现在只执行第一步：

帮我搭建好 React + Vite + Tailwind CSS 的基础骨架。

配置好支持 4 大 MBTI 家族的 Theme 切换逻辑（在 Tailwind 中配置对应的颜色、字体变量，或使用 CSS Variables）。

开发 Page 1 (新手村) 的完整组件。实现：用户点击选择具体的 MBTI（例如选了 INTJ），系统能识别其属于 NT 家族，并成功将整个页面的背景、按钮样式切换为 theme-nt 的风格。

完成第一步后请停下来并告诉我，等待我的验收和下一步指令。