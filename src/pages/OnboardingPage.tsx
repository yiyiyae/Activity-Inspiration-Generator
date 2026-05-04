import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, BrainCircuit, Compass, Handshake, Shield } from "lucide-react";
import { type MbtiType, useTheme } from "../context/ThemeContext";
import StepProgress from "../components/StepProgress";

type MbtiFamily = "NT" | "NF" | "SJ" | "SP";

type MbtiCard = {
  mbti: MbtiType;
  label: string;
  family: MbtiFamily;
  vibe: string;
  toneClassName: string;
};

const mbtiCards: MbtiCard[] = [
  { mbti: "INTJ", label: "建筑师", family: "NT", vibe: "冷静布局", toneClassName: "from-slate-200/90 via-sky-100/70 to-cyan-100/50" },
  { mbti: "INTP", label: "逻辑学家", family: "NT", vibe: "好奇解构", toneClassName: "from-slate-200/90 via-indigo-100/70 to-cyan-100/50" },
  { mbti: "ENTJ", label: "指挥官", family: "NT", vibe: "强执行", toneClassName: "from-slate-200/90 via-sky-100/70 to-emerald-100/40" },
  { mbti: "ENTP", label: "辩论家", family: "NT", vibe: "点子爆发", toneClassName: "from-slate-200/90 via-blue-100/70 to-violet-100/50" },
  { mbti: "INFJ", label: "提倡者", family: "NF", vibe: "温柔洞察", toneClassName: "from-rose-100/90 via-fuchsia-100/70 to-indigo-100/45" },
  { mbti: "INFP", label: "调停者", family: "NF", vibe: "情绪疗愈", toneClassName: "from-pink-100/90 via-rose-100/70 to-amber-100/40" },
  { mbti: "ENFJ", label: "主人公", family: "NF", vibe: "社交引力", toneClassName: "from-rose-100/90 via-orange-100/60 to-fuchsia-100/45" },
  { mbti: "ENFP", label: "竞选者", family: "NF", vibe: "热情冒险", toneClassName: "from-amber-100/90 via-pink-100/70 to-orange-100/50" },
  { mbti: "ISTJ", label: "物流师", family: "SJ", vibe: "秩序稳态", toneClassName: "from-stone-200/90 via-amber-100/60 to-lime-100/40" },
  { mbti: "ISFJ", label: "守卫者", family: "SJ", vibe: "可靠照护", toneClassName: "from-stone-200/90 via-yellow-100/60 to-emerald-100/40" },
  { mbti: "ESTJ", label: "总经理", family: "SJ", vibe: "节奏掌控", toneClassName: "from-stone-200/90 via-orange-100/60 to-yellow-100/40" },
  { mbti: "ESFJ", label: "执政官", family: "SJ", vibe: "氛围组织", toneClassName: "from-stone-200/90 via-amber-100/60 to-rose-100/40" },
  { mbti: "ISTP", label: "鉴赏家", family: "SP", vibe: "即兴动手", toneClassName: "from-emerald-100/90 via-sky-100/65 to-teal-100/45" },
  { mbti: "ISFP", label: "探险家", family: "SP", vibe: "感官漫游", toneClassName: "from-emerald-100/90 via-lime-100/65 to-cyan-100/45" },
  { mbti: "ESTP", label: "企业家", family: "SP", vibe: "现场破局", toneClassName: "from-amber-100/90 via-emerald-100/65 to-yellow-100/45" },
  { mbti: "ESFP", label: "表演者", family: "SP", vibe: "快乐上头", toneClassName: "from-orange-100/90 via-pink-100/65 to-yellow-100/45" },
];

const familyIconMap: Record<MbtiFamily, typeof BrainCircuit> = {
  NT: BrainCircuit,
  NF: Handshake,
  SJ: Shield,
  SP: Compass,
};

const familyLabelMap: Record<MbtiFamily, string> = {
  NT: "分析家",
  NF: "外交家",
  SJ: "守护者",
  SP: "探险家",
};

function OnboardingPage() {
  const { selectedMbti, activeTheme, setMbti, goToStep } = useTheme();
  const [isCardTransitioning, setIsCardTransitioning] = useState(false);
  const timerRef = useRef<number | null>(null);
  const selectedCard = useMemo(() => mbtiCards.find((item) => item.mbti === selectedMbti) ?? null, [selectedMbti]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const handleSelectCard = (mbti: MbtiType) => {
    if (isCardTransitioning) return;
    setMbti(mbti);
    setIsCardTransitioning(true);
    timerRef.current = window.setTimeout(() => {
      setIsCardTransitioning(false);
      goToStep("interaction");
    }, 900);
  };

  return (
    <main className="min-h-screen bg-skin-bg px-4 py-6 text-skin-text transition-colors duration-300">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md flex-col rounded-card border border-skin-border bg-skin-surface p-5 shadow-theme md:min-h-[760px]">
        <header className="space-y-3">
          <span className="inline-flex items-center gap-2 rounded-pill border border-skin-border px-3 py-1 text-xs tracking-[0.14em] uppercase">
            <BrainCircuit size={14} />
            周末处方药
          </span>
          <h1 className="font-brand-title text-3xl leading-tight">建立你的就诊档案</h1>
          <p className="text-sm opacity-80">左右滑动档案墙，点击人格卡可直接进入问诊。</p>
          <StepProgress current={1} />
        </header>

        <section className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm tracking-wide uppercase opacity-75">MBTI 磨砂档案墙</h2>
            <p className="text-[11px] opacity-60">左右滑动查看更多</p>
          </div>
          <div className="mbti-wall-scroll -mx-5 overflow-x-auto px-5 pb-2">
            <div className="flex w-max gap-3">
              {mbtiCards.map((card) => {
                const FamilyIcon = familyIconMap[card.family];
                const isActive = selectedMbti === card.mbti;
                return (
                  <button
                    key={card.mbti}
                    type="button"
                    onClick={() => handleSelectCard(card.mbti)}
                    disabled={isCardTransitioning}
                    className={[
                      "glass-card relative min-h-[170px] w-[260px] snap-start overflow-hidden rounded-[24px] border p-4 text-left transition-all duration-200",
                      `bg-gradient-to-br ${card.toneClassName}`,
                      isActive
                        ? "-translate-y-0.5 border-skin-primary ring-2 ring-skin-primary/45 shadow-theme"
                        : "border-skin-border/70 shadow-card hover:-translate-y-0.5 hover:shadow-theme",
                      isCardTransitioning ? "opacity-75" : "",
                    ].join(" ")}
                  >
                    <div className="relative z-10 flex h-full flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <p className="inline-flex items-center gap-1 rounded-pill border border-white/55 bg-white/35 px-2 py-1 text-[11px] font-semibold">
                          <FamilyIcon size={12} />
                          {familyLabelMap[card.family]}
                        </p>
                        <p className="text-xs opacity-70">#{card.family}</p>
                      </div>
                      <div>
                        <p className="font-brand-title text-4xl leading-none tracking-wide">{card.mbti}</p>
                        <p className="mt-1 text-sm font-semibold opacity-80">{card.label}</p>
                        <p className="mt-2 text-xs opacity-75">{card.vibe}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <p className="mt-2 text-xs opacity-75">
            {selectedCard ? `已选档案：${selectedCard.mbti} · ${selectedCard.label}（${selectedCard.vibe}）` : "暂未选档案"}
          </p>
        </section>

        <section className="mt-5 rounded-card border border-dashed border-skin-border p-4">
          <p className="text-sm font-semibold">没有预设人格？</p>
          <p className="mt-1 text-xs opacity-75">做 4 道场景题，30 秒自动生成你的 MBTI 档案。</p>
          <button
            type="button"
            onClick={() => goToStep("mbti-quiz")}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-pill bg-skin-primary px-4 py-3 font-semibold text-skin-bg transition hover:scale-[1.01]"
          >
            <Activity size={16} className="animate-pulse" />
            开始 30 秒人格测试
          </button>
          {isCardTransitioning ? <p className="mt-2 text-xs opacity-70">正在建立档案，准备进入问诊...</p> : null}
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
