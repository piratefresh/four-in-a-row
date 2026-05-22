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
    <div className="mb-5 flex gap-2.5 px-6">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={`flex-1 rounded-lg border border-gold/10 bg-black/30 px-3.5 py-2.5 ${
            stat.isPersonal ? "border-l-2 border-l-gold" : ""
          }`}
        >
          <div className="font-mono text-[9px] uppercase tracking-[1.4px] text-cream/50">
            {stat.label}
          </div>
          <div
            className={`mt-0.5 truncate font-serif text-lg font-semibold leading-tight ${
              stat.isPersonal ? "text-gold" : "text-cream"
            }`}
          >
            {stat.value}
          </div>
          {stat.subtitle ? (
            <div className="truncate font-mono text-[10px] text-cream/40">
              {stat.subtitle}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
