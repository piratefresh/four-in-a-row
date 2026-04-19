interface StatCardProps {
  title: string;
  subtitle: string;
}
export function StatCard({ title, subtitle }: StatCardProps) {
  return (
    <div className="relative rounded-lg bg-[linear-gradient(135deg,rgba(76,58,15,0.3),rgba(37,37,37,0.95))] py-1 px-4 min-w-36 border border-amber-400/60 shadow-lg shadow-amber-900/20">
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[#f4d27a]/70 to-transparent" />
      <div className="text-sm text-slate-300">{title}</div>
      <div className="tracking-wider font-sans font-bold text-amber-50">{subtitle}</div>
    </div>
  );
}
