export function FeedPlaceholder() {
  return (
    <aside className="flex flex-col items-center justify-center border-l border-cream/10 px-6 py-20 text-center">
      <div className="text-brass/30 font-serif text-lg italic">Live feed</div>
      <div className="text-cream/15 font-mono text-xs mt-2 uppercase tracking-wider">
        Coming soon
      </div>
      <div className="mt-6 flex flex-col gap-3 w-full max-w-xs opacity-20">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-10 rounded-lg bg-cream/[0.03] border border-cream/5"
          />
        ))}
      </div>
    </aside>
  );
}
