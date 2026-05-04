import { ClipboardPlus, Pill, RefreshCcw } from "lucide-react";
import { useMemo } from "react";
import { useTheme, type MbtiType } from "../context/ThemeContext";

const mbtiLabelMap: Record<MbtiType, string> = {
  INTJ: "建筑师",
  INTP: "逻辑学家",
  ENTJ: "指挥官",
  ENTP: "辩论家",
  INFJ: "提倡者",
  INFP: "调停者",
  ENFJ: "主人公",
  ENFP: "竞选者",
  ISTJ: "物流师",
  ISFJ: "守卫者",
  ESTJ: "总经理",
  ESFJ: "执政官",
  ISTP: "鉴赏家",
  ISFP: "探险家",
  ESTP: "企业家",
  ESFP: "表演者",
};

function getFamily(mbti: MbtiType): "NT" | "NF" | "SJ" | "SP" {
  if (["INTJ", "INTP", "ENTJ", "ENTP"].includes(mbti)) return "NT";
  if (["INFJ", "INFP", "ENFJ", "ENFP"].includes(mbti)) return "NF";
  if (["ISTJ", "ISFJ", "ESTJ", "ESFJ"].includes(mbti)) return "SJ";
  return "SP";
}

const familyVisualMap: Record<"NT" | "NF" | "SJ" | "SP", string> = {
  NT: "from-slate-700/80 via-sky-700/65 to-indigo-700/50",
  NF: "from-rose-200/95 via-fuchsia-200/88 to-violet-200/82",
  SJ: "from-amber-100/95 via-emerald-100/84 to-lime-100/74",
  SP: "from-amber-100/95 via-orange-100/88 to-yellow-100/78",
};

const familyTextMap: Record<"NT" | "NF" | "SJ" | "SP", string> = {
  NT: "text-slate-50",
  NF: "text-[#4A3B4C]",
  SJ: "text-[#2F4C3A]",
  SP: "text-[#4D3A2A]",
};

const familySubtleTextMap: Record<"NT" | "NF" | "SJ" | "SP", string> = {
  NT: "text-slate-100/80",
  NF: "text-[#4A3B4C]/80",
  SJ: "text-[#2F4C3A]/82",
  SP: "text-[#4D3A2A]/82",
};

const familyInfoCardMap: Record<"NT" | "NF" | "SJ" | "SP", string> = {
  NT: "border-slate-100/22 bg-white/12",
  NF: "border-[#8b6b8f]/22 bg-white/22",
  SJ: "border-[#527357]/35 bg-[#f3f0dc]/48",
  SP: "border-[#9e704a]/34 bg-[#faefd9]/54",
};

function ReturningPatientPage() {
  const { selectedMbti, patientProfile, startQuickRevisit, restartRegistration } = useTheme();
  const mbti = (selectedMbti ?? "INFJ") as MbtiType;
  const label = mbtiLabelMap[mbti];
  const family = getFamily(mbti);

  const lastIntentText = useMemo(() => {
    const snapshot = patientProfile?.lastIntent;
    if (!snapshot) return "暂无上次问诊记录";
    return `上次处方：${snapshot.partyMode} · ${snapshot.energyLevel} · ${snapshot.departurePreset}`;
  }, [patientProfile?.lastIntent]);

  return (
    <main className="min-h-screen bg-skin-bg px-4 py-6 text-skin-text transition-colors duration-300">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md flex-col rounded-card border border-skin-border bg-skin-surface p-5 shadow-theme md:min-h-[760px]">
        <header className="space-y-3">
          <span className="inline-flex items-center gap-2 rounded-pill border border-skin-border px-3 py-1 text-xs tracking-[0.14em] uppercase">
            <ClipboardPlus size={14} />
            你的数字病历本
          </span>
          <h1 className="font-brand-title text-3xl leading-tight">欢迎回来，今天继续开药</h1>
          <p className="text-sm opacity-80">已识别你的身份档案，可直接复诊，也可重新挂号。</p>
        </header>

        <section
          className={`glass-card relative mt-5 min-h-[240px] overflow-hidden rounded-[28px] border border-white/30 bg-gradient-to-br ${familyVisualMap[family]} p-6 shadow-theme ${familyTextMap[family]}`}
        >
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
          <div className="absolute -left-10 bottom-0 h-36 w-36 rounded-full bg-black/12 blur-2xl" />

          <div className="relative z-10 flex h-full flex-col justify-between">
            <div className={`flex items-center justify-between text-[11px] uppercase tracking-[0.16em] ${familySubtleTextMap[family]}`}>
              <span>Patient Card</span>
              <span>Weekend Rx</span>
            </div>

            <div>
              <p
                className={[
                  "font-brand-title text-[40px] leading-[1.02] tracking-[0.01em] md:text-[42px]",
                  family === "NT" ? "metallic-text" : "",
                ].join(" ")}
              >
                Patient: {mbti}
              </p>
              <p className={`mt-2 text-sm font-semibold leading-relaxed ${familySubtleTextMap[family]}`}>{label}</p>
              <p className={`mt-1 text-[12px] leading-relaxed ${familySubtleTextMap[family]}`}>{lastIntentText}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <article className={`rounded-xl border px-3 py-2 backdrop-blur-sm ${familyInfoCardMap[family]}`}>
                <p className={`text-[10px] uppercase tracking-[0.12em] ${familySubtleTextMap[family]}`}>档案号</p>
                <p className={`mt-1 text-xs font-semibold ${familyTextMap[family]}`}>{patientProfile?.patientId.slice(-8) ?? "未生成"}</p>
              </article>
              <article className={`rounded-xl border px-3 py-2 backdrop-blur-sm ${familyInfoCardMap[family]}`}>
                <p className={`text-[10px] uppercase tracking-[0.12em] ${familySubtleTextMap[family]}`}>最近更新</p>
                <p className={`mt-1 text-xs font-semibold ${familyTextMap[family]}`}>{patientProfile?.updatedAt.slice(0, 10) ?? "-"}</p>
              </article>
            </div>
          </div>
        </section>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={startQuickRevisit}
            className="inline-flex w-full items-center justify-center gap-2 rounded-pill bg-skin-primary px-4 py-3 font-semibold text-skin-bg transition duration-200 hover:scale-[1.01] active:scale-[0.99]"
          >
            <Pill size={16} />
            💊 照旧开药（一键复诊）
          </button>
          <button
            type="button"
            onClick={restartRegistration}
            className="inline-flex w-full items-center justify-center gap-2 rounded-pill border border-skin-border bg-skin-bg px-4 py-3 font-semibold transition hover:-translate-y-0.5"
          >
            <RefreshCcw size={16} />
            重新挂号
          </button>
        </div>
      </div>
    </main>
  );
}

export default ReturningPatientPage;
