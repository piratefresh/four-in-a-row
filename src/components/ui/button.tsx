import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap outline-none transition-[background-color,border-color,color,opacity,transform] duration-150 disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-[3px] focus-visible:ring-gold/35 [&>svg]:pointer-events-none [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "rounded-lg border border-cream/30 bg-transparent px-3 py-3 font-body text-[13px] text-cream hover:border-cream/45 hover:bg-cream/5",
        primary:
          "gap-2 rounded-[14px] border border-[#f3d66f]/55 bg-[linear-gradient(180deg,#f7da61_0%,#d6ac24_100%)] px-4 py-3.5 font-display text-base font-extrabold text-[#241700] shadow-[0_0_0_1px_rgba(255,235,163,0.12),0_12px_28px_rgba(0,0,0,0.45),0_0_22px_rgba(243,214,111,0.22)] transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]",
        secondary:
          "rounded-lg border border-cream/30 bg-transparent px-3 py-3 font-body text-[13px] text-cream hover:border-cream/45 hover:bg-cream/5",
        action:
          "rounded border border-cream/20 bg-cream/10 px-0.5 py-2 font-mono text-[9px] uppercase tracking-[0.1em] text-cream hover:border-cream/30 hover:bg-cream/15",
        actionPrimary:
          "rounded border border-gold-bright bg-gold px-0.5 py-2 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-felt-deep hover:bg-gold-bright",
        danger:
          "rounded border border-game-red/30 bg-game-red/15 px-0.5 py-2 font-mono text-[9px] uppercase tracking-[0.1em] text-[#f0a6a6] hover:border-game-red/45 hover:bg-game-red/20",
        auth: "gap-2.5 rounded-lg border border-transparent bg-ink px-3 py-3 font-body text-[13px] font-semibold text-cream hover:bg-ink-soft",
        authGoogle:
          "gap-2.5 rounded-lg border border-black/15 bg-cream px-3 py-3 font-body text-[13px] font-semibold text-ink hover:bg-paper",
        authEmail:
          "gap-2.5 rounded-lg border border-transparent bg-felt px-3 py-3 font-body text-[13px] font-semibold text-cream hover:bg-felt-light",
      },
      size: {
        default: "",
        sm: "px-2.5 py-2 text-xs",
        lg: "px-5 py-4 text-lg",
        full: "w-full",
        icon: "size-9 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
