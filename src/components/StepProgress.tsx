type StepProgressProps = {
  current: 1 | 2 | 3;
  labels?: [string, string, string];
};

const defaultLabels: [string, string, string] = ["人格", "问诊", "模式"];

function StepProgress({ current, labels = defaultLabels }: StepProgressProps) {
  return (
    <section className="space-y-2" aria-label={`问诊进度 ${current}/3`}>
      <div className="flex items-center justify-between text-[11px] tracking-[0.08em]">
        <span className="uppercase opacity-65">问诊进度</span>
        <span className="font-semibold">{current}/3</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {labels.map((label, index) => {
          const step = index + 1;
          const isDone = step <= current;
          return (
            <div key={label} className="space-y-1">
              <div className={`h-1.5 rounded-pill transition ${isDone ? "bg-skin-primary" : "bg-skin-border/65"}`} />
              <p className={`text-[11px] ${isDone ? "opacity-90" : "opacity-55"}`}>{label}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default StepProgress;
