import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../../lib/utils";

const actionButtonVariants = cva(
  "inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-xl border px-4 py-2 text-sm font-semibold tracking-[-0.01em] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_18px_rgba(0,0,0,0.28)] transition-[transform,box-shadow,background-color,border-color,color,opacity] duration-150 outline-none hover:-translate-y-px hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_12px_24px_rgba(0,0,0,0.32)] active:translate-y-0 active:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_6px_14px_rgba(0,0,0,0.24)] disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-45",
  {
    variants: {
      variant: {
        check:
          "border-[#1f5f46] bg-[linear-gradient(180deg,#1d4f3d_0%,#123026_100%)] text-[#b9f2d0]",
        call: "border-[#d7ae2b] bg-[linear-gradient(180deg,#f4d45d_0%,#b88917_100%)] text-[#2b1d08]",
        raise:
          "border-[#404247] bg-[linear-gradient(180deg,#2f3034_0%,#1f2023_100%)] text-[#f6f3ee]",
        fold:
          "border-[#6f2222] bg-[linear-gradient(180deg,#291414_0%,#140b0b_100%)] text-[#ef6767]",
        submit:
          "border-[#d9bf68] bg-[linear-gradient(180deg,#f4e4ac_0%,#d7b85e_100%)] text-[#241708]",
      },
      size: {
        default: "min-w-[98px] text-[15px] sm:min-w-[112px]",
        wide: "w-full text-[15px] sm:w-auto sm:min-w-[156px]",
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
