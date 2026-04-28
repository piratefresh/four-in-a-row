import type { HTMLAttributes, ReactNode } from "react";
import type { WordTileMultiplier, WordTileSize, WordTileVariant } from "./types";

type TileMultiplierProps = {
  children: ReactNode;
  className?: string;
  multiplier?: WordTileMultiplier;
  size: WordTileSize;
  variant: WordTileVariant;
} & HTMLAttributes<HTMLDivElement>;

export function TileMultiplier({ children, className, multiplier, size, variant, ...divProps }: TileMultiplierProps) {
  if (!multiplier || variant === "empty") return <>{children}</>;

  if (multiplier === "3L") {
    return (
      <div className={`relative flex items-center justify-center rounded-[7px] p-[3px] ${className ?? ""}`} {...divProps}>
        <div className="absolute inset-0 rounded-[7px] animate-[spin_2s_linear_infinite] bg-[linear-gradient(135deg,#8b5cf6,#ec4899,#f5c76a,#8b5cf6)] bg-[length:400%_400%]" />
        <div className="relative flex h-full w-full items-center justify-center rounded-[5px]">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative flex items-center justify-center rounded-[7px] p-[3px] ${className ?? ""}`} {...divProps}>
      <svg className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
        <rect x="1.5" y="1.5" width="calc(100% - 3px)" height="calc(100% - 3px)" rx="6" fill="none" stroke="#f5c76a" strokeWidth="3" strokeDasharray="8 6" style={{ filter: "drop-shadow(0 0 10px rgba(245, 199, 106, 0.45))" }} />
      </svg>
      <div className="relative flex h-full w-full items-center justify-center rounded-[5px]">
        {children}
      </div>
    </div>
  );
}
