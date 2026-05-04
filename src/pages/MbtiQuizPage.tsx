import { useMemo, useState } from "react";
import { Activity, ChevronLeft, Sparkles } from "lucide-react";
import { useTheme, type MbtiType } from "../context/ThemeContext";
import StepProgress from "../components/StepProgress";

type Dimension = "EI" | "SN" | "TF" | "JP";
type AnswerCode = "A" | "B";

type QuizQuestion = {
  id: string;
  dimension: Dimension;
  title: string;
  optionA: string;
  optionB: string;
  aLetter: string;
  bLetter: string;
};

const questions: QuizQuestion[] = [
  {
    id: "q1",
    dimension: "EI",
    title: "周五晚上下班，你感觉自己像个电量只剩 1% 的手机，此时你最想：",
    optionA: "赶紧躲进熟悉的洞穴（回家/去没人的咖啡馆），谢绝一切社交，自己安静充会电。",
    optionB: "冲向热闹的人群或者找朋友喝一杯，借别人的热闹给自己回回血。",
    aLetter: "I",
    bLetter: "E",
  },
  {
    id: "q2",
    dimension: "SN",
    title: "在路边偶然碰到一家没有招牌的小店，促使你推门进去的理由通常是：",
    optionA: "闻到了很香的咖啡味，或者看到了门口摆放得很精致的植物。",
    optionB: "觉得这家店散发着一种有故事的气场，或者单纯觉得它和自己有某种玄学磁场。",
    aLetter: "S",
    bLetter: "N",
  },
  {
    id: "q3",
    dimension: "TF",
    title: "朋友周末约你出门，发来两个备选地点，你做决定的第一直觉是：",
    optionA: "快速看一眼两地的距离、交通便利度或者大众点评分数。",
    optionB: "凭感觉选那个名字更浪漫，或者装修风格更戳你心巴的。",
    aLetter: "T",
    bLetter: "F",
  },
  {
    id: "q4",
    dimension: "JP",
    title: "对于明天的周末出行，你今晚睡前的状态是：",
    optionA: "脑子里已经排好了先去哪、吃什么、下午干嘛的行程串，一切尽在掌握。",
    optionB: "设个睡到自然醒的闹钟，明天出门往左走还是往右走，看心情和天气。",
    aLetter: "J",
    bLetter: "P",
  },
];

const resultToMbti = new Set<MbtiType>([
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
]);

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

function MbtiQuizPage() {
  const { setMbti, goToStep } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerCode>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftMbti, setDraftMbti] = useState<MbtiType | null>(null);

  const currentQuestion = questions[currentIndex];
  const progressText = `${currentIndex + 1}/${questions.length}`;

  const canSubmit = useMemo(() => questions.every((q) => answers[q.id]), [answers]);

  const selectAnswer = (answer: AnswerCode) => {
    if (isSubmitting) return;
    setAnswers((previous) => ({ ...previous, [currentQuestion.id]: answer }));
  };

  const computeMbti = (): MbtiType => {
    const letters = questions.map((q) => (answers[q.id] === "A" ? q.aLetter : q.bLetter)).join("");
    if (resultToMbti.has(letters as MbtiType)) return letters as MbtiType;
    return "INFP";
  };

  const handleSubmit = () => {
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);
    const mbti = computeMbti();
    window.setTimeout(() => {
      setDraftMbti(mbti);
      setIsSubmitting(false);
    }, 1200);
  };

  const handleConfirmMbti = () => {
    if (!draftMbti) return;
    setMbti(draftMbti);
    goToStep("interaction");
  };

  const handleRetake = () => {
    setDraftMbti(null);
    setAnswers({});
    setCurrentIndex(0);
  };

  return (
    <main className="min-h-screen bg-skin-bg px-4 py-6 text-skin-text transition-colors duration-300">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md flex-col rounded-card border border-skin-border bg-skin-surface p-5 shadow-theme md:min-h-[760px]">
        <header className="space-y-3">
          <span className="inline-flex items-center gap-2 rounded-pill border border-skin-border px-3 py-1 text-xs tracking-[0.14em] uppercase">
            <Sparkles size={14} />
            30 秒人格测试
          </span>
          <h1 className="font-brand-title text-3xl leading-tight">周末出街场景测温</h1>
          <p className="text-sm opacity-80">回答 4 道题，自动生成你的 MBTI 档案。</p>
          <StepProgress current={1} />
        </header>

        <section className="mt-5 rounded-card border border-skin-border bg-skin-bg p-4">
          <div className="mb-3 flex items-center justify-between text-xs opacity-70">
            <span>题目进度</span>
            <span>{progressText}</span>
          </div>
          <p className="text-sm font-semibold leading-relaxed">{currentQuestion.title}</p>

          <div className="mt-4 space-y-2">
            <button
              type="button"
              onClick={() => selectAnswer("A")}
              className={`w-full rounded-card border p-3 text-left text-sm leading-relaxed transition ${
                answers[currentQuestion.id] === "A"
                  ? "border-skin-primary bg-skin-primary/10 ring-1 ring-skin-primary/35"
                  : "border-skin-border bg-skin-surface hover:border-skin-accent"
              }`}
            >
              <span className="mb-1 block text-xs font-semibold opacity-65">选项 A</span>
              {currentQuestion.optionA}
            </button>
            <button
              type="button"
              onClick={() => selectAnswer("B")}
              className={`w-full rounded-card border p-3 text-left text-sm leading-relaxed transition ${
                answers[currentQuestion.id] === "B"
                  ? "border-skin-primary bg-skin-primary/10 ring-1 ring-skin-primary/35"
                  : "border-skin-border bg-skin-surface hover:border-skin-accent"
              }`}
            >
              <span className="mb-1 block text-xs font-semibold opacity-65">选项 B</span>
              {currentQuestion.optionB}
            </button>
          </div>
        </section>

        <div className="mt-auto space-y-3 pt-6">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0 || isSubmitting}
              className="inline-flex w-full items-center justify-center gap-1 rounded-pill border border-skin-border bg-skin-surface px-3 py-2 text-sm font-semibold transition disabled:opacity-50"
            >
              <ChevronLeft size={14} />
              上一题
            </button>
            <button
              type="button"
              onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
              disabled={currentIndex === questions.length - 1 || !answers[currentQuestion.id] || isSubmitting}
              className="inline-flex w-full items-center justify-center rounded-pill border border-skin-border bg-skin-surface px-3 py-2 text-sm font-semibold transition disabled:opacity-50"
            >
              下一题
            </button>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-pill bg-skin-primary px-4 py-3 font-semibold text-skin-bg transition hover:scale-[1.01] disabled:opacity-60"
          >
            {isSubmitting ? <Activity size={16} className="animate-pulse" /> : <Sparkles size={16} />}
            {isSubmitting ? "正在生成 MBTI 档案..." : "完成测试并查看档案"}
          </button>

          <button
            type="button"
            onClick={() => goToStep("onboarding")}
            disabled={isSubmitting}
            className="w-full rounded-pill border border-skin-border px-3 py-2 text-sm transition hover:bg-skin-bg disabled:opacity-50"
          >
            返回档案墙
          </button>
        </div>
      </div>

      {draftMbti ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/45 p-4">
          <article className="w-full max-w-md rounded-card border border-skin-border bg-skin-surface p-5 shadow-theme">
            <p className="text-xs uppercase tracking-[0.14em] opacity-65">人格档案已生成</p>
            <h2 className="mt-2 font-brand-title text-3xl leading-tight">{draftMbti}</h2>
            <p className="text-sm opacity-80">{mbtiLabelMap[draftMbti]}</p>
            <p className="mt-3 text-xs opacity-70">如果你觉得不准，可以重测；确认后进入开药台。</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleRetake}
                className="rounded-pill border border-skin-border bg-skin-bg px-3 py-2 text-sm font-semibold transition hover:-translate-y-0.5"
              >
                重新问诊
              </button>
              <button
                type="button"
                onClick={handleConfirmMbti}
                className="rounded-pill bg-skin-primary px-3 py-2 text-sm font-semibold text-skin-bg transition hover:-translate-y-0.5"
              >
                确认并开药
              </button>
            </div>
          </article>
        </div>
      ) : null}
    </main>
  );
}

export default MbtiQuizPage;
