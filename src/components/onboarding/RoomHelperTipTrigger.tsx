import { useCallback } from "react";
import { CircleHelp } from "lucide-react";
import { useNextStep } from "nextstepjs";
import { cn } from "@/lib/utils";
import { IN_GAME_HELPER_TOUR } from "./wordPokerTours";

type RoomHelperTipTriggerProps = {
  step: number;
  className?: string;
};

export function RoomHelperTipTrigger({
  step,
  className,
}: RoomHelperTipTriggerProps) {
  const { setCurrentStep, startNextStep } = useNextStep();

  const openTip = useCallback(() => {
    startNextStep(IN_GAME_HELPER_TOUR);
    setCurrentStep(step, 0);
  }, [setCurrentStep, startNextStep, step]);

  return (
    <button
      type="button"
      aria-label="Show helper tip"
      title="Show helper tip"
      onClick={openTip}
      onFocus={openTip}
      onMouseEnter={openTip}
      className={cn(
        "inline-grid size-6 shrink-0 place-items-center rounded-full border border-gold/55 bg-felt-deep/85 text-gold shadow-[0_4px_12px_rgba(0,0,0,0.3)] transition-colors hover:border-gold hover:bg-felt-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-felt-deep",
        className,
      )}
    >
      <CircleHelp className="size-3.5" aria-hidden="true" />
    </button>
  );
}
