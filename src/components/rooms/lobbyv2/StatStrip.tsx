interface Stat {
  label: string;
  value: string;
  subtitle?: string;
  isPersonal?: boolean;
}

interface StatStripProps {
  stats: Stat[];
}

export function StatStrip({ stats }: StatStripProps) {
  return (
    <div className="flex gap-2.5 px-6 mb-5">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={`flex-1 px-3.5 py-2.5 rounded-lg bg-black/30 border ${
            stat.isPersonal
              ? "border-brass/10 border-l-2 border-l-brass"
              : "border-brass/10"
          }`}
        >
          <div className="font-mono text-[9px] tracking-[1.4px] text-cream/50 uppercase">
            {stat.label}
          </div>
          <div
            className={`font-serif text-lg font-semibold mt-0.5 leading-tight ${
              stat.isPersonal ? "text-brass" : "text-cream"
            }`}
          >
            {stat.value}
          </div>
          {stat.subtitle ? (
            <div className="font-mono text-[10px] text-cream/40">
              {stat.subtitle}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
