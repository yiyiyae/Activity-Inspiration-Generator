import { useEffect, useState } from "react";
import { Compass, WandSparkles } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { getRecommendation, type RecommendResult } from "../services/locationService";
import { getRuntimeContext, toChineseTimeLabel, type RuntimeContext } from "../services/runtimeContext";
import { trackEvent } from "../services/analytics";

function toSocialIntensity(mode: "独处" | "双人" | "朋友" | "UNKNOWN"): "low" | "medium" | "high" {
  if (mode === "独处") return "low";
  if (mode === "双人" || mode === "UNKNOWN") return "medium";
  return "high";
}

function toChineseWeather(weather: "Sunny" | "Cloudy" | "Rainy"): "晴天" | "阴天" | "雨天" {
  if (weather === "Sunny") return "晴天";
  if (weather === "Cloudy") return "阴天";
  return "雨天";
}

function ModeSelectPage() {
  const { mode, selectedMbti, setMode, userIntent, setResultLocation, goToStep } = useTheme();
  const [submittingMode, setSubmittingMode] = useState<"P" | "J" | null>(null);
  const [errorText, setErrorText] = useState("");
  const [runtimeContext, setRuntimeContext] = useState<RuntimeContext | null>(null);

  useEffect(() => {
    let mounted = true;
    getRuntimeContext().then((ctx) => {
      if (mounted) setRuntimeContext(ctx);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleSelectMode = async (selectedMode: "P" | "J") => {
    if (!userIntent) {
      goToStep("interaction");
      return;
    }

    trackEvent("presentation", "mode_selected", {
      selectedMode,
      mbti: selectedMbti,
      hasIntent: true,
    });

    setSubmittingMode(selectedMode);
    try {
      const context = runtimeContext ?? (await getRuntimeContext());
      trackEvent("recommendation", "recommendation_requested", {
        selectedMode,
        weather: context.weather,
        time: context.time,
        moodIntent: userIntent.moodIntent,
        partyMode: userIntent.partyMode,
        energyLevel: userIntent.energyLevel,
        socialIntensity: toSocialIntensity(userIntent.partyMode),
        departurePreset: userIntent.departurePreset,
      });

      const recommendationStartAt = performance.now();
      let results: RecommendResult[];
      try {
        results = await getRecommendation({
          weather: context.weather,
          time: context.time,
          moodIntent: userIntent.moodIntent,
          partyMode: userIntent.partyMode,
          energyLevel: userIntent.energyLevel,
          socialIntensity: toSocialIntensity(userIntent.partyMode),
          limit: 3,
        });
        trackEvent("recommendation", "recommendation_latency_ms", {
          selectedMode,
          latencyMs: Math.round(performance.now() - recommendationStartAt),
          success: true,
        });
      } catch (error) {
        trackEvent("recommendation", "recommendation_latency_ms", {
          selectedMode,
          latencyMs: Math.round(performance.now() - recommendationStartAt),
          success: false,
        });
        throw error;
      }

      const top = results[0];
      if (!top) {
        trackEvent("recommendation", "recommendation_empty", {
          selectedMode,
          weather: context.weather,
          time: context.time,
          moodIntent: userIntent.moodIntent,
          partyMode: userIntent.partyMode,
          energyLevel: userIntent.energyLevel,
        });
        throw new Error("当前条件下暂时没有可执行处方");
      }

      trackEvent("recommendation", "recommendation_received", {
        selectedMode,
        resultCount: results.length,
        topId: top.id,
        topTitle: top.title,
        topScore: top.score,
      });

      setMode(selectedMode);
      setResultLocation(top.location, toChineseTimeLabel(context.time), top.explain);
      setErrorText("");
    } catch (error) {
      trackEvent("recommendation", "recommendation_failed", {
        selectedMode,
        reason: error instanceof Error ? error.message : "unknown_error",
      });
      setErrorText(error instanceof Error ? error.message : "推荐失败，请稍后重试");
    } finally {
      setSubmittingMode(null);
    }
  };

  return (
    <main className="min-h-screen bg-skin-bg px-4 py-6 text-skin-text transition-colors duration-300">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md flex-col gap-4 rounded-card border border-skin-border bg-skin-surface p-5 shadow-theme md:min-h-[760px]">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.14em] opacity-70">模式选择</p>
          <h1 className="font-heading text-3xl leading-tight">这会儿你想怎么出门？</h1>
          <p className="text-sm opacity-80">已识别人格：{selectedMbti}</p>
          <p className="text-xs opacity-70">你已完成问诊，P/J 只是不同呈现方式，可随时切换。</p>
          <p className="text-xs opacity-70">
            当前上下文：
            {runtimeContext
              ? `${toChineseWeather(runtimeContext.weather)} / ${toChineseTimeLabel(runtimeContext.time)}（${runtimeContext.sourceText}）`
              : "正在获取实时天气与时段..."}
          </p>
        </header>

        <button
          type="button"
          onClick={() => handleSelectMode("P")}
          disabled={submittingMode !== null}
          className="group flex min-h-[220px] flex-col items-start justify-between rounded-card border-2 border-skin-border bg-skin-bg p-5 text-left transition duration-200 hover:-translate-y-1 hover:shadow-theme active:scale-[0.99] disabled:opacity-70"
        >
          <WandSparkles className="transition-transform group-hover:rotate-6" size={28} />
          <div>
            <p className="text-xs uppercase tracking-[0.14em] opacity-70">选项 A / P 模式</p>
            <h2 className="mt-2 font-heading text-3xl leading-tight">
              {submittingMode === "P" ? "开方中..." : "脑子宕机了，随便给我个地方"}
            </h2>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleSelectMode("J")}
          disabled={submittingMode !== null}
          className="group flex min-h-[220px] flex-col items-start justify-between rounded-card border-2 border-skin-border bg-skin-bg p-5 text-left transition duration-200 hover:-translate-y-1 hover:shadow-theme active:scale-[0.99] disabled:opacity-70"
        >
          <Compass className="transition-transform group-hover:-rotate-6" size={28} />
          <div>
            <p className="text-xs uppercase tracking-[0.14em] opacity-70">选项 B / J 模式</p>
            <h2 className="mt-2 font-heading text-3xl leading-tight">
              {submittingMode === "J" ? "开方中..." : "我有特定需求，帮我匹配计划"}
            </h2>
          </div>
        </button>

        <button
          type="button"
          onClick={() => goToStep("interaction")}
          className="rounded-pill border border-skin-border px-4 py-2 text-sm transition hover:bg-skin-bg"
        >
          修改本次症状
        </button>

        <footer className="mt-auto text-xs opacity-70">当前模式：{mode ?? "未选择"}</footer>
        {errorText ? <p className="text-sm text-red-500">{errorText}</p> : null}
      </div>
    </main>
  );
}

export default ModeSelectPage;
