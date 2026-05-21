export const SEAT_COLORS = [
  "#e6b450",
  "#d97757",
  "#9ec27a",
  "#7ec4cf",
  "#a78bfa",
  "#f0a8c0",
  "#c8a878",
  "#b8a6f0",
] as const;

interface SeatColorPickerProps {
  selected: number;
  onSelect: (index: number) => void;
}

export function SeatColorPicker({ selected, onSelect }: SeatColorPickerProps) {
  return (
    <div className="flex gap-[6px]">
      {SEAT_COLORS.map((color, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(i)}
          className="cursor-pointer rounded-full"
          style={{
            width: 26,
            height: 26,
            background: color,
            boxShadow:
              i === selected
                ? `0 0 0 2px #051410, 0 0 0 3px #d4af37, 0 0 12px rgba(212,175,55,0.3)`
                : `0 0 0 2px #051410`,
          }}
        />
      ))}
    </div>
  );
}
