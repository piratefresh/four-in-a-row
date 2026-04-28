import { PokerChipHero } from "@/components/ui/PokerChipHero";

interface LoadingOverlayProps {
  message?: string;
  spinning?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}

export function LoadingOverlay({
  message = "Loading...",
  spinning = true,
  actionLabel,
  onAction,
}: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-felt-deep">
      <div className="flex flex-col items-center gap-6">
        {spinning ? <PokerChipHero tone="gold" size="lg" spinning /> : null}
        <p className="text-lg font-medium text-cream">{message}</p>
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="rounded-md bg-[#114D28] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#176636]"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
