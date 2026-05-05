import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../../lib/utils";

const actionButtonVariants = cva(
  "inline-flex min-h-9 items-center justify-center whitespace-nowrap rounded border px-2 py-2 text-center font-mono text-xs uppercase tracking-[0.1em] transition-[background-color,border-color,color,opacity,transform] duration-150 outline-none hover:-translate-y-px active:translate-y-0 disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-45 focus-visible:ring-[3px] focus-visible:ring-gold/35 xs:min-h-10 xs:px-3 sm:min-h-11 sm:px-4",
  {
    variants: {
      variant: {
        check:
          "border-cream/20 bg-cream/10 text-cream hover:border-cream/30 hover:bg-cream/15",
        call: "border-cream/20 bg-cream/10 text-cream hover:border-cream/30 hover:bg-cream/15",
        raise:
          "border-gold-bright bg-gold font-bold text-felt-deep hover:bg-gold-bright",
        fold: "border-game-red/30 bg-game-red/15 text-[#f0a6a6] hover:border-game-red/45 hover:bg-game-red/20",
        submit:
          "border-gold-bright bg-gold font-bold text-felt-deep hover:bg-gold-bright",
      },
      size: {
        default: "min-w-[68px] xs:min-w-[96px] sm:min-w-[112px]",
        wide: "w-full xs:w-auto xs:min-w-[140px] sm:min-w-[156px]",
      },
    },
    defaultVariants: {
      variant: "call",
      size: "default",
    },
  },
);

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof actionButtonVariants> & {
    children: ReactNode;
  };

export function ActionButton({
  variant,
  size,
  className,
  children,
  type = "button",
  ...props
}: ActionButtonProps) {
  return (
    <button
      type={type}
      className={cn(actionButtonVariants({ variant, size }), className)}
      {...props}
    >
      {children}
    </button>
  );
}
