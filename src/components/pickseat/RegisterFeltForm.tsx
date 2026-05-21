import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { SeatColorPicker } from "./SeatColorPicker";

const SEAT_LABELS = ["SOUTH", "NORTHWEST", "EAST"] as const;
const SEAT_NUMBERS = [1, 3, 6] as const;

interface RegisterFeltFormProps {
  selectedSeat: number;
  selectedColor: number;
  name: string;
  loading: boolean;
  error: string | null;
  onSubmit: (values: { name: string; email: string; password: string }) => void;
  onGuestStart: () => void;
  onNameChange: (name: string) => void;
  onColorSelect: (index: number) => void;
}

function FormField({
  label,
  type = "text",
  placeholder,
  icon,
  value,
  onChange,
}: {
  label: string;
  type?: string;
  placeholder: string;
  icon: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <div
        className="mb-[6px] flex items-baseline justify-between font-mono text-[9px] tracking-[2px]"
        style={{ color: "rgba(232,220,192,0.6)" }}
      >
        {label}
      </div>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          placeholder={placeholder}
          className="w-full rounded-[6px] border px-[14px] py-[12px] font-sans text-[14px] tracking-[0.2px] outline-none"
          style={{
            paddingLeft: 38,
            background: "rgba(0,0,0,0.35)",
            color: "#f4e4c1",
            borderColor: "rgba(212,175,55,0.18)",
          }}
        />
        <span
          className="absolute left-[12px] top-1/2 -translate-y-1/2 font-mono text-[13px]"
          style={{ color: "rgba(232,220,192,0.3)" }}
        >
          {icon}
        </span>
      </div>
    </label>
  );
}

export function RegisterFeltForm({
  selectedSeat,
  selectedColor,
  name,
  loading,
  error,
  onSubmit,
  onGuestStart,
  onNameChange,
  onColorSelect,
}: RegisterFeltFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const seatNumber = SEAT_NUMBERS[selectedSeat] ?? 3;
  const seatLabel = SEAT_LABELS[selectedSeat] ?? "NORTHWEST";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, email, password });
  };

  return (
    <div>
      <div
        className="font-mono text-[11px] uppercase tracking-[2.2px]"
        style={{ color: "#d4af37" }}
      >
        SEAT {seatNumber} &middot; {seatLabel}
      </div>
      <div
        className="mt-2 font-serif text-[32px] italic font-semibold tracking-tighter"
        style={{ color: "#f4e4c1" }}
      >
        Welcome, stranger.
      </div>
      <div
        className="mt-[6px] max-w-[360px] font-serif text-[13px] italic"
        style={{ color: "rgba(232,220,192,0.6)" }}
      >
        The room introduces itself when you sit. Just a name and how to reach
        you.
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mt-[22px] flex flex-col gap-[12px]">
          <FormField
            label="DISPLAY NAME"
            placeholder="What should we call you?"
            icon="◐"
            value={name}
            onChange={onNameChange}
          />
          <FormField
            label="EMAIL"
            type="email"
            placeholder="you@example.com"
            icon="@"
            value={email}
            onChange={setEmail}
          />
          <FormField
            label="PASSWORD"
            type="password"
            placeholder="8+ characters"
            icon="●"
            value={password}
            onChange={setPassword}
          />
        </div>

        <div className="mt-[14px]">
          <div
            className="font-mono text-[9px] uppercase tracking-[2.2px]"
            style={{ color: "#d4af37" }}
          >
            SEAT COLOR &middot; YOU CAN CHANGE THIS LATER
          </div>
          <div className="mt-2">
            <SeatColorPicker
              selected={selectedColor}
              onSelect={onColorSelect}
            />
          </div>
        </div>

        {error && (
          <p
            className="mt-3 rounded-[6px] border px-3 py-2 font-sans text-[13px]"
            style={{
              borderColor: "rgba(194,61,61,0.3)",
              background: "rgba(194,61,61,0.08)",
              color: "#f0a0a0",
            }}
          >
            {error}
          </p>
        )}

        <div className="mt-[22px]">
          <button
            type="submit"
            disabled={loading}
            className="flex w-full cursor-pointer flex-col items-center gap-[1px] rounded-[6px] border-none px-[22px] pt-[11px] pb-[13px] leading-none disabled:opacity-60"
            style={{ background: "#d4af37", color: "#1a1208" }}
          >
            <span className="font-mono text-[8px] tracking-[2px] opacity-60">
              ↳ SIT DOWN
            </span>
            <span className="font-sans text-[14px] font-bold tracking-[0.5px]">
              Take seat {seatNumber} at The Rookie Room
            </span>
          </button>
        </div>
      </form>

      <div
        className="my-[14px] flex items-center gap-[12px]"
        style={{ color: "rgba(232,220,192,0.3)" }}
      >
        <div
          className="h-px flex-1"
          style={{ background: "rgba(212,175,55,0.18)" }}
        />
        <div className="font-mono text-[9px] tracking-[2px] text-[rgba(232,220,192,0.3)]">
          OR
        </div>
        <div
          className="h-px flex-1"
          style={{ background: "rgba(212,175,55,0.18)" }}
        />
      </div>

      <button
        type="button"
        onClick={onGuestStart}
        className="w-full cursor-pointer rounded-[6px] border px-[18px] py-[11px] font-sans text-[13px] font-medium"
        style={{
          background: "rgba(0,0,0,0.25)",
          color: "#e8dcc0",
          borderColor: "rgba(212,175,55,0.18)",
        }}
      >
        {"\u2666"} Play without an account
      </button>

      <div
        className="mt-[18px] font-sans text-[12px] leading-[1.5]"
        style={{ color: "rgba(232,220,192,0.6)" }}
      >
        Already in?{" "}
        <Link
          to="/login"
          className="font-semibold"
          style={{ color: "#d4af37" }}
        >
          Sign in instead
        </Link>
        <br />
        Not ready to make an account?{" "}
        <button
          type="button"
          onClick={onGuestStart}
          className="underline"
          style={{ color: "#e8dcc0" }}
        >
          Continue as guest
        </button>{" "}
        &mdash; your seat won&apos;t be saved.
      </div>
    </div>
  );
}
