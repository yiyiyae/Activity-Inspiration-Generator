// Page 3 核心交互区：加载地点数据并执行随机/筛选逻辑。
import { useEffect, useMemo, useState } from "react";
import { Dice5, Filter } from "lucide-react";
import { type SelectedTimeLabel, useTheme } from "../context/ThemeContext";
import { type LocationItem } from "../data/mockData";
import { getCachedLocations, getLocations } from "../services/locationService";

type WeatherOption = "Sunny" | "Cloudy" | "Rainy";
type TimeOption = "Morning" | "Afternoon" | "Evening";

function pickRandom<T>(list: readonly T[]): T | null {
  if (!list.length) {
    return null;
  }
  return list[Math.floor(Math.random() * list.length)];
}

function InteractionPage() {
  const { mode, goToStep, setResultLocation } = useTheme();
  const [weather, setWeather] = useState<WeatherOption>("Sunny");
  const [time, setTime] = useState<TimeOption>("Afternoon");
  const [errorText, setErrorText] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [dataSource, setDataSource] = useState<"notion" | "mock">("mock");

  useEffect(() => {
    let mounted = true;

    async function loadLocations() {
      const cached = getCachedLocations();
      if (cached && mounted) {
        setLocations(cached.data);
        setDataSource(cached.source);
        setLoading(false);
      } else {
        setLoading(true);
      }

      const result = await getLocations();
      if (!mounted) {
        return;
      }

      setLocations(result.data);
      setDataSource(result.source);
      if (result.source === "mock" && result.error) {
        setErrorText(`Notion 数据请求失败，已切换到本地 mock 数据：${result.error}`);
      } else {
        setErrorText("");
      }
      setLoading(false);
    }

    loadLocations();

    return () => {
      mounted = false;
    };
  }, []);

  const weatherLabels = useMemo(
    () => ({
      Sunny: "晴天",
      Cloudy: "阴天",
      Rainy: "雨天",
    }),
    []
  );

  const timeLabels = useMemo<Record<TimeOption, SelectedTimeLabel>>(
    () => ({
      Morning: "上午",
      Afternoon: "下午",
      Evening: "晚上",
    }),
    []
  );

  const handleRandomPick = () => {
    const selected = pickRandom(locations);
    if (!selected) {
      setErrorText("当前没有可用灵感数据。请先检查 Notion 数据库或 mockData.ts。");
      return;
    }

    console.log("P mode selected location:", selected);
    setResultLocation(selected, null);
    if (!errorText.startsWith("Notion 数据请求失败")) {
      setErrorText("");
    }
  };

  const handleFilterPick = () => {
    const matched = locations.filter(
      (item) => item.suitableWeather.includes(weather) && item.suitableTime.includes(time)
    );

    const selected = pickRandom(matched);
    if (!selected) {
      setErrorText("没有符合条件的地点，换个天气或时间再试试。\n");
      return;
    }

    console.log("J mode selected location:", selected);
    setResultLocation(selected, timeLabels[time]);
    if (!errorText.startsWith("Notion 数据请求失败")) {
      setErrorText("");
    }
  };

  const backToModeSelect = () => {
    goToStep("mode-select");
  };

  if (!mode) {
    return (
      <main className="min-h-screen bg-skin-bg px-4 py-6 text-skin-text transition-colors duration-300">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md flex-col items-center justify-center gap-4 rounded-card border border-skin-border bg-skin-surface p-5 shadow-theme md:min-h-[760px]">
          <p className="text-sm opacity-80">尚未选择模式，请先返回问诊台。</p>
          <button
            type="button"
            onClick={backToModeSelect}
            className="rounded-pill border border-skin-border px-4 py-2 text-sm transition hover:bg-skin-bg"
          >
            返回模式选择
          </button>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-skin-bg px-4 py-6 text-skin-text transition-colors duration-300">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md flex-col items-center justify-center rounded-card border border-skin-border bg-skin-surface p-5 text-center shadow-theme md:min-h-[760px]">
          <p className="text-lg font-semibold">正在加载卡片数据...</p>
          <p className="mt-2 text-sm opacity-75">优先连接 Notion 数据中心</p>
        </div>
      </main>
    );
  }

  if (mode === "P") {
    return (
      <main className="min-h-screen bg-skin-bg px-4 py-6 text-skin-text transition-colors duration-300">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md flex-col rounded-card border border-skin-border bg-skin-surface p-5 shadow-theme md:min-h-[760px]">
          <header className="space-y-2">
            <p className="text-xs uppercase tracking-[0.14em] opacity-70">核心交互区 / P 模式</p>
            <h1 className="font-heading text-3xl leading-tight">随机盲盒，立即开抽</h1>
            <p className="text-xs opacity-70">当前数据源：{dataSource === "notion" ? "Notion" : "Mock"}</p>
          </header>

          <div className="my-auto flex items-center justify-center">
            <button
              type="button"
              onClick={handleRandomPick}
              className="flex min-h-[240px] w-full flex-col items-center justify-center gap-4 rounded-card border-2 border-skin-border bg-skin-primary px-6 text-center text-skin-bg transition duration-200 hover:scale-[1.01] hover:shadow-theme active:scale-[0.98]"
            >
              <Dice5 size={38} />
              <span className="font-heading text-3xl">抽取今日灵感</span>
            </button>
          </div>

          <button
            type="button"
            onClick={backToModeSelect}
            className="rounded-pill border border-skin-border px-4 py-2 text-sm transition hover:bg-skin-bg"
          >
            返回模式选择
          </button>

          {errorText ? <p className="mt-3 whitespace-pre-line text-sm text-red-500">{errorText}</p> : null}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-skin-bg px-4 py-6 text-skin-text transition-colors duration-300">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md flex-col rounded-card border border-skin-border bg-skin-surface p-5 shadow-theme md:min-h-[760px]">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.14em] opacity-70">核心交互区 / J 模式</p>
          <h1 className="font-heading text-3xl leading-tight">按条件筛选你的周末处方</h1>
          <p className="text-xs opacity-70">当前数据源：{dataSource === "notion" ? "Notion" : "Mock"}</p>
        </header>

        <div className="mt-6 space-y-4">
          <label className="block text-sm font-semibold">
            天气
            <select
              value={weather}
              onChange={(event) => setWeather(event.target.value as WeatherOption)}
              className="mt-2 w-full rounded-pill border border-skin-border bg-skin-bg px-4 py-3 text-base outline-none transition focus:border-skin-accent"
            >
              <option value="Sunny">{weatherLabels.Sunny}</option>
              <option value="Cloudy">{weatherLabels.Cloudy}</option>
              <option value="Rainy">{weatherLabels.Rainy}</option>
            </select>
          </label>

          <label className="block text-sm font-semibold">
            时间
            <select
              value={time}
              onChange={(event) => setTime(event.target.value as TimeOption)}
              className="mt-2 w-full rounded-pill border border-skin-border bg-skin-bg px-4 py-3 text-base outline-none transition focus:border-skin-accent"
            >
              <option value="Morning">{timeLabels.Morning}</option>
              <option value="Afternoon">{timeLabels.Afternoon}</option>
              <option value="Evening">{timeLabels.Evening}</option>
            </select>
          </label>
        </div>

        <div className="mt-auto space-y-3 pt-6">
          <button
            type="button"
            onClick={handleFilterPick}
            className="inline-flex w-full items-center justify-center gap-2 rounded-pill bg-skin-primary px-4 py-3 font-semibold text-skin-bg transition duration-200 hover:scale-[1.01] active:scale-[0.99]"
          >
            <Filter size={16} />
            生成结构化计划
          </button>

          <button
            type="button"
            onClick={backToModeSelect}
            className="w-full rounded-pill border border-skin-border px-4 py-2 text-sm transition hover:bg-skin-bg"
          >
            返回模式选择
          </button>
        </div>

        {errorText ? <p className="mt-3 whitespace-pre-line text-sm text-red-500">{errorText}</p> : null}
      </div>
    </main>
  );
}

export default InteractionPage;
