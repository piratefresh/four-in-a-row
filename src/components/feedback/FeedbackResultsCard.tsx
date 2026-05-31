import type { Id } from "../../../convex/_generated/dataModel";
import { FeedbackForm } from "./FeedbackForm";

type FeedbackResultsCardProps = {
  routePath?: string;
  roomId?: Id<"rooms">;
  gameId?: Id<"games">;
};

export function FeedbackResultsCard({
  routePath,
  roomId,
  gameId,
}: FeedbackResultsCardProps) {
  return (
    <section className="rounded-[20px] border border-gold/35 bg-felt p-5 shadow-[0_16px_42px_rgba(0,0,0,0.24)]">
      <h2 className="font-display text-[25px] leading-tight font-bold text-cream">
        How was this hand?
      </h2>
      <div className="mt-4">
        <FeedbackForm
          source="results"
          routePath={routePath}
          roomId={roomId}
          gameId={gameId}
          compact
          initialCollapsed
        />
      </div>
    </section>
  );
}
