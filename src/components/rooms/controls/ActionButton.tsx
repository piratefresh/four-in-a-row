import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../../lib/utils";

const actionButtonVariants = cva(
  "inline-flex min-h-9 items-center justify-center whitespace-nowrap rounded-xl border px-2.5 py-1 text-[12px] font-semibold tracking-[-0.01em] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_18px_rgba(0,0,0,0.28)] transition-[transform,box-shadow,background-color,border-color,color,opacity] duration-150 outline-none hover:-translate-y-px hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_12px_24px_rgba(0,0,0,0.32)] active:translate-y-0 active:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_6px_14px_rgba(0,0,0,0.24)] disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-45 xs:min-h-10 xs:px-3.5 xs:py-2 xs:text-[14px] sm:min-h-11 sm:px-4 sm:py-2 sm:text-sm",
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
        default: "min-w-[68px] xs:min-w-[96px] sm:min-w-[112px] sm:text-[15px]",
        wide: "w-full xs:w-auto xs:min-w-[140px] sm:min-w-[156px] sm:text-[15px]",
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
