export function TypingIndicator({ className = "" }: { className?: string }) {
  return (
    <div className={`flex h-5 items-center justify-center gap-0.5 ${className}`}>
      <span className="animate-bounce text-lg leading-none [animation-delay:-0.3s]">
        .
      </span>
      <span className="animate-bounce text-lg leading-none [animation-delay:-0.15s]">
        .
      </span>
      <span className="animate-bounce text-lg leading-none">.</span>
    </div>
  );
}
