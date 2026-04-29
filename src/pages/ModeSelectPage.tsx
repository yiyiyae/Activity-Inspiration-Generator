// Page 2 问诊台：选择 P(随机) 或 J(筛选) 交互模式。
import { Compass, WandSparkles } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

function ModeSelectPage() {
  const { mode, selectedMbti, setMode } = useTheme();

  return (
    <main className="min-h-screen bg-skin-bg px-4 py-6 text-skin-text transition-colors duration-300">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md flex-col gap-4 rounded-card border border-skin-border bg-skin-surface p-5 shadow-theme md:min-h-[760px]">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.14em] opacity-70">情绪问诊台</p>
          <h1 className="font-heading text-3xl leading-tight">这会儿你想怎么出门？</h1>
          <p className="text-sm opacity-80">已识别人格：{selectedMbti}</p>
        </header>

        <button
          type="button"
          onClick={() => setMode("P")}
          className="group flex min-h-[220px] flex-col items-start justify-between rounded-card border-2 border-skin-border bg-skin-bg p-5 text-left transition duration-200 hover:-translate-y-1 hover:shadow-theme active:scale-[0.99]"
        >
          <WandSparkles className="transition-transform group-hover:rotate-6" size={28} />
          <div>
            <p className="text-xs uppercase tracking-[0.14em] opacity-70">选项 A / P 模式</p>
            <h2 className="mt-2 font-heading text-3xl leading-tight">脑子宕机了，随便给我个地方</h2>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setMode("J")}
          className="group flex min-h-[220px] flex-col items-start justify-between rounded-card border-2 border-skin-border bg-skin-bg p-5 text-left transition duration-200 hover:-translate-y-1 hover:shadow-theme active:scale-[0.99]"
        >
          <Compass className="transition-transform group-hover:-rotate-6" size={28} />
          <div>
            <p className="text-xs uppercase tracking-[0.14em] opacity-70">选项 B / J 模式</p>
            <h2 className="mt-2 font-heading text-3xl leading-tight">我有特定需求，帮我匹配</h2>
          </div>
        </button>

        <footer className="mt-auto text-xs opacity-70">当前模式：{mode ?? "未选择"}</footer>
      </div>
    </main>
  );
}

export default ModeSelectPage;

