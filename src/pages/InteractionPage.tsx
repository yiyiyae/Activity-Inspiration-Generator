import { useEffect, useState } from "react";
import { Stethoscope } from "lucide-react";
import { type UserIntent, useTheme } from "../context/ThemeContext";
import { trackEvent } from "../services/analytics";
import StepProgress from "../components/StepProgress";

function getCurrentTimeRounded(stepMinutes = 5) {
  const now = new Date();
  const total = now.getHours() * 60 + now.getMinutes();
  const rounded = Math.round(total / stepMinutes) * stepMinutes;
  const hh = Math.floor(rounded / 60) % 24;
  const mm = rounded % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function InteractionPage() {
  const { mode, userIntent, setUserIntent, goToStep } = useTheme();
  const [moodIntent, setMoodIntent] = useState<UserIntent["moodIntent"]>(userIntent?.moodIntent ?? "治愈");
  const [partyMode, setPartyMode] = useState<UserIntent["partyMode"]>(userIntent?.partyMode ?? "UNKNOWN");
  const [energyLevel, setEnergyLevel] = useState<UserIntent["energyLevel"]>(userIntent?.energyLevel ?? "medium");
  const [departurePreset, setDeparturePreset] = useState<UserIntent["departurePreset"]>(userIntent?.departurePreset ?? "now");
  const [customDepartureTime, setCustomDepartureTime] = useState<string>(getCurrentTimeRounded());

  useEffect(() => {
    if (!userIntent) return;
    setMoodIntent(userIntent.moodIntent);
    setPartyMode(userIntent.partyMode);
    setEnergyLevel(userIntent.energyLevel);
    setDeparturePreset(userIntent.departurePreset);
    if (userIntent.customDepartureTime) {
      setCustomDepartureTime(userIntent.customDepartureTime);
    }
  }, [userIntent]);

  const handleSubmit = () => {
    trackEvent("presentation", "intent_submitted", {
      moodIntent,
      partyMode,
      energyLevel,
      departurePreset,
      hasCustomDepartureTime: departurePreset === "custom",
    });

    setUserIntent({
      moodIntent,
      partyMode,
      energyLevel,
      departurePreset,
      customDepartureTime: departurePreset === "custom" ? customDepartureTime : undefined,
    });
    goToStep("mode-select");
  };

  return (
    <main className="min-h-screen bg-skin-bg px-4 py-6 text-skin-text transition-colors duration-300">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md flex-col rounded-card border border-skin-border bg-skin-surface p-5 shadow-theme md:min-h-[760px]">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.14em] opacity-70">周末开药台</p>
          <h1 className="font-brand-title text-3xl leading-tight">点 3 下，直接开药</h1>
          <p className="text-xs opacity-70">本轮只需一次问诊，后续可自由切换 P/J。</p>
          <StepProgress current={2} />
        </header>

        <div className="mt-6 space-y-5">
          <section>
            <p className="mb-2 text-sm font-semibold">今天啥症状？</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["治愈", "😮‍💨 精神缺氧"],
                ["新鲜感", "🧨 无聊发作"],
                ["随便走走", "🏙️ 城市过敏"],
                ["热闹一点", "🔥 社交低烧"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMoodIntent(value as UserIntent["moodIntent"])}
                  className={`inline-flex items-center justify-center gap-1 rounded-pill border px-3 py-2 text-sm transition ${
                    moodIntent === value ? "border-skin-primary bg-skin-primary text-skin-bg" : "border-skin-border bg-skin-bg"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <p className="mb-2 text-sm font-semibold">今天怎么服用？</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["独处", "🧍 独自服用"],
                ["双人", "🫶 双人疗程"],
                ["朋友", "👯 朋友合剂"],
                ["UNKNOWN", "🎲 先看药效"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPartyMode(value as UserIntent["partyMode"])}
                  className={`inline-flex items-center justify-center gap-1 rounded-pill border px-3 py-2 text-sm transition ${
                    partyMode === value ? "border-skin-primary bg-skin-primary text-skin-bg" : "border-skin-border bg-skin-bg"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <p className="mb-2 text-sm font-semibold">你能扛几剂量？</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                ["low", "🍃 低剂量"],
                ["medium", "🚶 标准剂量"],
                ["high", "⚡ 猛药"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setEnergyLevel(value as UserIntent["energyLevel"])}
                  className={`inline-flex items-center justify-center gap-1 rounded-pill border px-3 py-2 text-sm transition ${
                    energyLevel === value ? "border-skin-primary bg-skin-primary text-skin-bg" : "border-skin-border bg-skin-bg"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <p className="mb-2 text-sm font-semibold">可选：你想几点出发？</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["now", "🕒 现在出发"],
                ["plus30", "⏱️ 30 分钟后"],
                ["plus60", "⌛ 1 小时后"],
                ["tonight", "🌙 今晚"],
                ["custom", "🛠️ 自定义时间"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDeparturePreset(value as UserIntent["departurePreset"])}
                  className={`inline-flex items-center justify-center gap-1 rounded-pill border px-3 py-2 text-sm transition ${
                    departurePreset === value ? "border-skin-primary bg-skin-primary text-skin-bg" : "border-skin-border bg-skin-bg"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {departurePreset === "custom" ? (
              <label className="mt-3 block text-sm">
                <span className="mb-1 block opacity-75">选择出发时间</span>
                <input
                  type="time"
                  step={300}
                  value={customDepartureTime}
                  onChange={(event) => setCustomDepartureTime(event.target.value)}
                  className="w-full rounded-pill border border-skin-border bg-skin-bg px-3 py-2 outline-none focus:border-skin-primary"
                />
              </label>
            ) : (
              <p className="mt-2 text-xs opacity-70">不想选也没关系，默认按当前时间开方。</p>
            )}
          </section>
        </div>

        <div className="mt-auto space-y-3 pt-6">
          <button
            type="button"
            onClick={handleSubmit}
            className="inline-flex w-full items-center justify-center gap-2 rounded-pill bg-skin-primary px-4 py-3 font-semibold text-skin-bg transition duration-200 hover:scale-[1.01] active:scale-[0.99]"
          >
            <Stethoscope size={16} />
            进入选模式
          </button>
          {mode ? <p className="text-center text-xs opacity-70">你可以随时切模式，不用重填问诊。</p> : null}
        </div>
      </div>
    </main>
  );
}

export default InteractionPage;
