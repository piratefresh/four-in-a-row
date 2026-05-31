import { useMutation } from "convex/react";
import { ChevronDown, Send } from "lucide-react";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { FeedbackRating } from "./FeedbackRating";

type FeedbackFormProps = {
  source: "launcher" | "results";
  routePath?: string;
  roomId?: Id<"rooms">;
  gameId?: Id<"games">;
  compact?: boolean;
  initialCollapsed?: boolean;
  onSubmitted?: () => void;
};

export function FeedbackForm({
  source,
  routePath,
  roomId,
  gameId,
  compact,
  initialCollapsed,
  onSubmitted,
}: FeedbackFormProps) {
  const submitFeedback = useMutation(api.feedback.submit);
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [replyEmail, setReplyEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [isExpanded, setIsExpanded] = useState(!initialCollapsed);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messageLength = message.length;
  const canSubmit = rating !== null && !isSubmitting && !submitted;
  const submitLabel = useMemo(() => {
    if (isSubmitting) return "Sending...";
    if (submitted) return "Sent";
    return compact ? "Send" : "Send feedback";
  }, [compact, isSubmitting, submitted]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rating) {
      setError("Choose a rating first.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await submitFeedback({
        rating,
        message: message.trim() || undefined,
        replyEmail: replyEmail.trim() || undefined,
        source,
        routePath,
        roomId,
        gameId,
        userAgent:
          typeof navigator === "undefined" ? undefined : navigator.userAgent,
        honeypot,
      });
      setSubmitted(true);
      onSubmitted?.();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Feedback could not be sent.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(compact ? "space-y-4" : "space-y-7")}
    >
      <div className="space-y-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.42em] text-gold-bright">
          {compact ? "Quick one" : "Rate your last session"}
        </div>
        <FeedbackRating
          value={rating}
          onChange={(nextRating) => {
            setRating(nextRating);
            setError(null);
          }}
          compact={compact}
          disabled={isSubmitting || submitted}
        />
      </div>

      {initialCollapsed ? (
        <button
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.32em] text-gold-bright transition-colors hover:text-cream focus-visible:ring-[3px] focus-visible:ring-gold/35 focus-visible:outline-none"
        >
          Tell us more
          <ChevronDown
            className={cn(
              "size-3 transition-transform",
              isExpanded && "rotate-180",
            )}
          />
        </button>
      ) : null}

      {isExpanded ? (
        <div className={cn("space-y-6", compact && "space-y-4")}>
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(event) => setHoneypot(event.target.value)}
            className="sr-only"
            aria-hidden="true"
            name="website"
          />

          <label className="block space-y-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-cream/68">
              Tell us more
            </span>
            <textarea
              value={message}
              maxLength={600}
              disabled={isSubmitting || submitted}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="What felt great? What tripped you up? Bugs, ideas, anything..."
              className="min-h-32 w-full resize-none rounded-[14px] border border-cream/28 bg-black/34 px-4 py-3 text-base leading-7 text-cream shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] placeholder:text-cream/48 transition-[border-color,box-shadow] focus-visible:border-gold/80 focus-visible:ring-[3px] focus-visible:ring-gold/25 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            />
            <span className="block text-right font-mono text-[10px] text-cream/58">
              {messageLength}/600
            </span>
          </label>

          <label className="block space-y-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-cream/68">
              Email - optional, if we can reply
            </span>
            <Input
              type="email"
              value={replyEmail}
              disabled={isSubmitting || submitted}
              onChange={(event) => setReplyEmail(event.target.value)}
              placeholder="you@example.com"
              className="h-12 rounded-[14px] border-cream/28 bg-black/34 px-4 text-base text-cream placeholder:text-cream/48 focus-visible:border-gold/80 focus-visible:ring-gold/25"
            />
          </label>
        </div>
      ) : null}

      {error ? <p className="text-sm text-[#f0a6a6]">{error}</p> : null}
      {submitted ? (
        <p className="text-sm font-semibold text-gold">
          Thanks. Your feedback was sent.
        </p>
      ) : null}

      <div className="flex justify-end gap-3">
        <Button
          type="submit"
          variant="primary"
          disabled={!canSubmit}
          className={cn(compact && "px-4 py-3 text-sm")}
        >
          <Send className="size-4" />
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
