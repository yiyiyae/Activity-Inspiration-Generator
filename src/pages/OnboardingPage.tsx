// Page 1 新手村：选择 MBTI 后进入问诊台。
import { BrainCircuit, Sparkles } from "lucide-react";
import { type MbtiType, useTheme } from "../context/ThemeContext";

const mbtiList: MbtiType[] = [
  "INTJ",
  "INTP",
  "ENTJ",
  "ENTP",
  "INFJ",
  "INFP",
  "ENFJ",
  "ENFP",
  "ISTJ",
  "ISFJ",
  "ESTJ",
  "ESFJ",
  "ISTP",
  "ISFP",
  "ESTP",
  "ESFP",
];

function OnboardingPage() {
  const { selectedMbti, activeTheme, setMbti } = useTheme();

  return (
    <main className="min-h-screen bg-skin-bg px-4 py-6 text-skin-text transition-colors duration-300">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md flex-col rounded-card border border-skin-border bg-skin-surface p-5 shadow-theme md:min-h-[760px]">
        <header className="space-y-3">
          <span className="inline-flex items-center gap-2 rounded-pill border border-skin-border px-3 py-1 text-xs tracking-[0.14em] uppercase">
            <BrainCircuit size={14} />
            周末处方药
          </span>
          <h1 className="font-heading text-3xl leading-tight">长沙出gai灵感，新手村</h1>
          <p className="text-sm opacity-80">先认领你的人格身份，再进入 3 题冷启动问诊。</p>
        </header>

        <section className="mt-5">
          <h2 className="mb-3 text-sm tracking-wide uppercase opacity-75">方式一：直接选择 MBTI</h2>
          <div className="grid grid-cols-4 gap-2">
            {mbtiList.map((mbti) => {
              const isActive = selectedMbti === mbti;

              return (
                <button
                  key={mbti}
                  type="button"
                  onClick={() => setMbti(mbti)}
                  className={[
                    "h-11 rounded-pill border px-2 text-sm font-semibold transition-all duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-skin-accent",
                    isActive
                      ? "border-transparent bg-skin-primary text-skin-bg shadow-theme"
                      : "border-skin-border bg-transparent hover:-translate-y-0.5 hover:border-skin-accent",
                  ].join(" ")}
                >
                  {mbti}
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-5 rounded-card border border-dashed border-skin-border p-4">
          <h2 className="mb-2 text-sm tracking-wide uppercase opacity-75">方式二：做 3 道极简题</h2>
          <button
            type="button"
            className="inline-flex w-full items-center justify-center gap-2 rounded-pill bg-skin-primary px-4 py-3 font-semibold text-skin-bg transition-transform duration-200 hover:scale-[1.01]"
          >
            <Sparkles size={16} />
            开始 30 秒人格测温
          </button>
          <p className="mt-2 text-xs opacity-70">MVP 第二步仍为占位入口，后续再补齐答题流。</p>
        </section>

        <footer className="mt-auto pt-6 text-xs opacity-70">
          <p>当前皮肤：{activeTheme}</p>
          <p>已选择人格：{selectedMbti ?? "未选择"}</p>
        </footer>
      </div>
    </main>
  );
}

export default OnboardingPage;

