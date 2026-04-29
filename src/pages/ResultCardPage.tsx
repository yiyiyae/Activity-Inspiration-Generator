// Page 4 结果卡：根据 P/J 渲染不同内容，并提供保存弹窗与重诊断。
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Camera, CheckSquare, Link2, RotateCcw, Sparkles, X } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { generateDynamicTimeline, type DynamicTimelineItem } from "../utils/timeCalculator";

function ResultCardPage() {
  const { mode, resultLocation, restartDiagnosis, goToStep, selectedTimeLabel } = useTheme();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [toastText, setToastText] = useState<string | null>(null);

  useEffect(() => {
    if (!resultLocation || !mode) {
      goToStep("mode-select");
    }
  }, [goToStep, mode, resultLocation]);

  useEffect(() => {
    if (!toastText) {
      return;
    }
    const timer = window.setTimeout(() => {
      setToastText(null);
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [toastText]);

  const cardTitle = useMemo(() => {
    if (!resultLocation) {
      return "周末处方";
    }
    return resultLocation.title;
  }, [resultLocation]);

  const normalizedPHookText = useMemo(() => {
    const raw = resultLocation?.p_mode.hook_text?.trim() ?? "";
    if (raw) {
      return raw.replace(/\s+/g, " ");
    }
    return `目的地已锁定：${cardTitle}`;
  }, [cardTitle, resultLocation]);

  const normalizedPActionText = useMemo(() => {
    const raw = resultLocation?.p_mode.action_prompt?.trim() ?? "";
    if (raw) {
      return raw.replace(/\s+/g, " ");
    }
    return "保持随机心态，跟着第一眼的直觉出发。";
  }, [resultLocation]);

  const shareImageSrc = useMemo(() => {
    if (!resultLocation || !mode) {
      return "";
    }

    if (mode === "P") {
      return resultLocation.p_mode.image;
    }

    return "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&q=80&w=1200";
  }, [mode, resultLocation]);

  // J 模式：优先使用 j_activities / J_timeline 字符串 + selectedTime 动态推算时间轴。
  const computedJTimeline: DynamicTimelineItem[] = useMemo(() => {
    if (!resultLocation || mode !== "J") {
      return [];
    }

    const anyLocation = resultLocation as unknown as Record<string, unknown>;
    const activitiesString = [
      resultLocation.j_activities,
      typeof anyLocation.J_timeline === "string" ? (anyLocation.J_timeline as string) : undefined,
      typeof anyLocation.j_timeline === "string" ? (anyLocation.j_timeline as string) : undefined,
    ]
      .find((item) => typeof item === "string" && item.trim().length > 0)
      ?.trim();

    if (activitiesString) {
      return generateDynamicTimeline(activitiesString, selectedTimeLabel ?? "下午");
    }

    // 回退旧结构：若 timeline 本身是 "动作(时长)" 形式，也强制走新解析函数。
    const legacyRaw = resultLocation.j_mode.timeline.join(" | ").trim();
    if (legacyRaw) {
      return generateDynamicTimeline(legacyRaw, selectedTimeLabel ?? "下午");
    }

    return [];
  }, [mode, resultLocation, selectedTimeLabel]);

  if (!resultLocation || !mode) {
    return null;
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-skin-bg/95 px-4 py-6 text-skin-text">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(255,255,255,0.2),transparent_35%),radial-gradient(circle_at_90%_10%,rgba(0,0,0,0.18),transparent_28%)]" />

      <div className="relative mx-auto flex w-full max-w-md flex-col items-center gap-5">
        <section className="w-full rounded-card border border-skin-border bg-skin-surface shadow-theme backdrop-blur-sm">
          <div className="relative overflow-hidden rounded-t-[calc(var(--radius-card)-1px)] border-b border-dashed border-skin-border bg-skin-bg px-5 pb-4 pt-5">
            <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.14em] opacity-70">
              <span>周末处方药</span>
              <span>{mode} MODE</span>
            </div>
            <h1 className="font-heading text-2xl leading-tight">你的专属出gai诊断已生成</h1>
            <p className="mt-2 text-sm opacity-75">由《周末处方药》开出，仅本周末有效。</p>

            <div className="pointer-events-none absolute -bottom-3 left-0 flex w-full justify-between px-3">
              {Array.from({ length: 14 }).map((_, idx) => (
                <span key={idx} className="h-5 w-5 rounded-full border border-skin-border bg-skin-surface" />
              ))}
            </div>
          </div>

          <div className="space-y-5 p-5 pt-8">
            {mode === "P" ? (
              <article className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] opacity-70">本次处方地点</p>
                  <h2 className="mt-1 font-heading text-3xl leading-tight">{cardTitle}</h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {resultLocation.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-pill border border-skin-border bg-skin-bg px-3 py-1 text-xs font-semibold"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="relative h-56 overflow-hidden rounded-card border border-skin-border">
                  <img src={resultLocation.p_mode.image} alt={cardTitle} className="h-full w-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/65 to-transparent" />
                </div>

                <p className="font-heading text-3xl leading-tight">{normalizedPHookText}</p>

                <div className="rounded-card border-2 border-skin-accent bg-skin-bg p-4 shadow-theme">
                  <p className="mb-2 inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] opacity-80">
                    <Sparkles size={14} />
                    神秘行动指令
                  </p>
                  <p className="text-base font-semibold leading-relaxed">{normalizedPActionText}</p>
                </div>
              </article>
            ) : (
              <article className="space-y-5">
                <div>
                  <h2 className="font-heading text-3xl leading-tight">{cardTitle}</h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {resultLocation.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-pill border border-skin-border bg-skin-bg px-3 py-1 text-xs font-semibold"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <section>
                  <h3 className="mb-3 text-sm uppercase tracking-[0.14em] opacity-70">Timeline</h3>
                  <ul className="space-y-4">
                    {computedJTimeline.map((item, index) => (
                      <li key={`${item.time}-${index}`} className="relative pl-7">
                        <span className="absolute left-0 top-[0.58rem] h-2.5 w-2.5 rounded-full bg-skin-primary" />
                        {index < computedJTimeline.length - 1 ? (
                          <span className="absolute left-[4px] top-5 h-[calc(100%+0.45rem)] w-px bg-skin-border" />
                        ) : null}
                        <p className="text-xs font-semibold tracking-wide opacity-65">{item.time}</p>
                        <p className="mt-1 text-sm font-bold leading-relaxed">{item.action}</p>
                      </li>
                    ))}
                  </ul>
                </section>

                <section>
                  <h3 className="mb-3 text-sm uppercase tracking-[0.14em] opacity-70">Checklist</h3>
                  <ul className="space-y-2">
                    {resultLocation.j_mode.checklist.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm">
                        <CheckSquare size={16} className="mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="rounded-card border border-amber-500/60 bg-amber-100/70 p-3 text-amber-900">
                  <p className="mb-1 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em]">
                    <AlertTriangle size={14} />
                    避坑提醒
                  </p>
                  <p className="text-sm leading-relaxed">{resultLocation.j_mode.warning}</p>
                </section>
              </article>
            )}
          </div>
        </section>

        <div className="w-full space-y-3">
          <button
            type="button"
            onClick={restartDiagnosis}
            className="inline-flex w-full items-center justify-center gap-2 rounded-pill border border-skin-border bg-skin-surface px-4 py-3 font-semibold transition hover:-translate-y-0.5 hover:shadow-theme active:scale-[0.99]"
          >
            <RotateCcw size={16} />
            💊 重新诊断
          </button>

          <button
            type="button"
            onClick={() => setShowSaveModal(true)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-pill bg-skin-primary px-4 py-3 font-semibold text-skin-bg transition hover:-translate-y-0.5 hover:shadow-theme active:scale-[0.99]"
          >
            <Camera size={16} />
            ✨ 保存处方
          </button>
        </div>
      </div>

      {showSaveModal ? (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
          onClick={() => setShowSaveModal(false)}
        >
          <div className="w-full max-w-md" onClick={() => setShowSaveModal(false)}>
            <article
              className="relative rounded-[26px] border border-skin-border bg-skin-surface p-4 shadow-[0_24px_70px_rgba(0,0,0,0.45)]"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="absolute right-3 top-3 rounded-full border border-skin-border bg-skin-bg p-1.5 transition hover:scale-105"
                aria-label="关闭"
              >
                <X size={14} />
              </button>

              <p className="text-center text-sm font-semibold tracking-wide">✨ 周末灵感已封装完毕！</p>

              <div className="mx-auto mt-3 w-[92%] rounded-[18px] border border-skin-border bg-white p-3 pb-8 text-zinc-900 shadow-[0_10px_35px_rgba(0,0,0,0.22)]">
                {mode === "P" ? (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">{cardTitle}</p>
                    <div className="h-36 overflow-hidden rounded-[12px] border border-zinc-200">
                      <img src={resultLocation.p_mode.image} alt={cardTitle} className="h-full w-full object-cover" />
                    </div>
                    <h3 className="text-base font-semibold leading-tight">{normalizedPHookText}</h3>
                    <p className="rounded-[10px] border border-zinc-300 bg-zinc-100 p-2 text-xs leading-relaxed">
                      {normalizedPActionText}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <h3 className="text-base font-semibold">{resultLocation.title}</h3>
                    <ul className="space-y-1.5 text-xs">
                      {computedJTimeline.slice(0, 3).map((item, index) => (
                        <li key={`${item.time}-${index}`} className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-900" />
                          <span>
                            {item.time} · {item.action}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <ul className="space-y-1 text-xs">
                      {resultLocation.j_mode.checklist.slice(0, 3).map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center border border-zinc-700 text-[10px]">
                            ✓
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <p className="mt-4 text-sm leading-relaxed opacity-90">
                医生建议：点击按钮，利用系统功能长按此处图片，将你的周末处方保存至相册。
              </p>

              <div className="mt-4 space-y-3">
                <div className="rounded-card border border-skin-border bg-skin-bg p-3">
                  <p className="mb-2 text-sm font-semibold">📸 长按此处保存（利用系统功能）</p>
                  <div className="relative overflow-hidden rounded-card border border-skin-border">
                    <img
                      src={shareImageSrc}
                      alt="保存分享图"
                      className="h-36 w-full object-cover"
                      onClick={() => setToastText("请长按图片，使用系统菜单保存到相册~")}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setToastText("未来功能占位~")}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-pill border border-skin-border bg-skin-surface px-4 py-3 font-semibold transition hover:-translate-y-0.5 hover:shadow-theme active:scale-[0.99]"
                >
                  <Link2 size={16} />
                  🔗 生成分享链接（TODO）
                </button>
              </div>
            </article>
          </div>
        </div>
      ) : null}

      {toastText ? (
        <div className="pointer-events-none fixed bottom-8 left-1/2 z-40 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-pill border border-skin-border bg-skin-surface px-4 py-3 text-center text-sm shadow-theme">
          {toastText}
        </div>
      ) : null}
    </main>
  );
}

export default ResultCardPage;
