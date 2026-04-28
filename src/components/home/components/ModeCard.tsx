import { forwardRef, type HTMLAttributes, type ReactNode, type Ref } from "react";
import { cn } from "@/lib/utils";

type ModeCardTone = "default" | "recommended" | "warm";

type ModeCardProps = {
  icon: ReactNode;
  label: string;
  description: string;
  badge?: string;
  tone?: ModeCardTone;
  disabled?: boolean;
  interactive?: boolean;
  actions?: ReactNode;
  onSelect?: () => void;
} & Omit<HTMLAttributes<HTMLElement>, "onSelect">;

const toneStyles: Record<ModeCardTone, string> = {
  default:
    "border-cream/15 bg-cream/8 text-cream hover:border-gold-bright/45 hover:bg-cream/12",
  recommended:
    "border-gold-bright bg-gold text-felt-deep shadow-lg shadow-gold/25 hover:border-gold-bright hover:bg-gold-bright",
  warm:
    "border-gold/25 bg-cream/8 text-cream hover:border-gold/45 hover:bg-gold/10",
};

export const ModeCard = forwardRef<HTMLElement, ModeCardProps>(
  function ModeCard(
    {
      icon,
      label,
      description,
      badge,
      tone = "default",
      disabled = false,
      interactive = false,
      actions,
      onSelect,
      className,
      ...props
    },
    ref,
  ) {
    const content = (
      <>
        {badge ? (
          <span
            className={cn(
              "absolute right-3 top-0 -translate-y-1/2 rounded-sm px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.15em]",
              tone === "recommended"
                ? "bg-ink text-cream"
                : "bg-gold text-felt-deep",
            )}
          >
            {badge}
          </span>
        ) : null}

        <span className="grid size-10 shrink-0 place-items-center" aria-hidden="true">
          {icon}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{label}</span>
          <span
            className={cn(
              "mt-1 block text-xs leading-4",
              tone === "recommended" ? "text-felt-deep/75" : "text-cream/75",
            )}
          >
            {description}
          </span>
        </span>

        {actions ? (
          <span className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {actions}
          </span>
        ) : null}
      </>
    );

    const modeCardClassName = cn(
      "relative flex w-full items-center gap-3 rounded-[10px] border p-3 text-left transition duration-200 sm:p-4",
      toneStyles[tone],
      (onSelect || interactive) && "cursor-pointer hover:-translate-y-0.5",
      disabled && "cursor-not-allowed opacity-65 hover:translate-y-0",
      className,
    );

    if (onSelect || interactive) {
      return (
        <button
          {...props}
          ref={ref as Ref<HTMLButtonElement>}
          type="button"
          disabled={disabled}
          onClick={onSelect}
          className={modeCardClassName}
        >
          {content}
        </button>
      );
    }

    return (
      <div
        {...props}
        ref={ref as Ref<HTMLDivElement>}
        className={modeCardClassName}
      >
        {content}
      </div>
    );
  },
);
