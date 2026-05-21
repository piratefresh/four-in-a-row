import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/../convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { getTutorialGuestId, logTutorialDebug } from "@/lib/tutorial-guest";
import { PickASeatFelt } from "@/components/pickseat/PickASeatFelt";
import { RegisterFeltForm } from "@/components/pickseat/RegisterFeltForm";
import { ActivityMarqueeTicker } from "@/components/home/ActivityMarqueeTicker";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();
  const createTutorialBotRoom = useMutation(api.rooms.createTutorialBotRoom);

  const [selectedOpenSeat, setSelectedOpenSeat] = useState<number>(0);
  const [selectedColor, setSelectedColor] = useState(0);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 639px)");
    setCompact(mql.matches);
    const handler = (e: MediaQueryListEvent) => setCompact(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (isPending) return;
    if (session?.user) {
      toast.info("You are already logged in", {
        description: "Redirecting to the main menu.",
      });
      void navigate({ to: "/" });
    }
  }, [session, isPending, navigate]);

  if (isPending || session?.user) {
    return (
      <main className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-[var(--gradient-wire)]">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-brass)] border-t-transparent" />
      </main>
    );
  }

  const handleGuestStart = async () => {
    setLoading(true);
    setError(null);
    try {
      const guestAuthUserId = getTutorialGuestId() ?? undefined;
      logTutorialDebug("register:guest-start:clicked", {
        guestAuthUserId: guestAuthUserId?.slice(-6) ?? null,
      });
      const room = await createTutorialBotRoom({
        name: name.trim() || "Guest",
        guestAuthUserId,
      });
      logTutorialDebug("register:guest-start:success", {
        code: room.code,
      });
      await navigate({
        to: "/rooms/$code",
        params: { code: room.code },
        search: { tutorial: "intro" },
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to start game.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterAndPlay = async (values: {
    name: string;
    email: string;
    password: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await authClient.signUp.email({
        email: values.email,
        password: values.password,
        name: values.name,
      });
      if (result.error) {
        setError(result.error.message || "Registration failed");
        setLoading(false);
        return;
      }

      const room = await createTutorialBotRoom({
        name: values.name,
      });
      await navigate({
        to: "/rooms/$code",
        params: { code: room.code },
        search: { tutorial: "intro" },
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to start game.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="relative flex flex-1 flex-col overflow-hidden pb-12"
      style={{
        background: "linear-gradient(#0a1d17 0%, #051410 100%)",
        color: "#e8dcc0",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(at 50% 30%, rgba(212,175,55,0.06) 0%, transparent 60%)",
        }}
      />

      <div className="relative z-[1] flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[1.2fr_1fr]">
        <div className="flex flex-col overflow-auto px-[24px] py-[40px] md:px-[48px]">
          <div
            className="font-mono text-[11px] uppercase tracking-[3px]"
            style={{ color: "#d4af37" }}
          >
            NEW HAND &middot; LIVE TABLE WAITING
          </div>
          <h1
            className="mt-[12px] font-serif text-[48px] leading-[0.93] font-semibold tracking-tighter sm:text-[56px]"
            style={{ color: "#f4e4c1" }}
          >
            Pick your <em style={{ color: "#d4af37" }}>seat</em>.
          </h1>
          <div
            className="mt-[12px] max-w-[460px] font-serif text-[15px] italic hidden sm:block"
            style={{ color: "rgba(232,220,192,0.6)" }}
          >
            We&apos;ve held three at The Rookie Room. First hand deals when
            you&apos;re ready &mdash; no chips, no clock pressure, just letters.
          </div>

          <div className="mt-[28px] flex flex-1 items-center justify-center">
            <PickASeatFelt
              selectedOpenSeat={selectedOpenSeat}
              selectedColorIndex={selectedColor}
              playerName={name}
              compact={compact}
              onSelectOpenSeat={setSelectedOpenSeat}
            />
          </div>

          <div
            className="mt-2 flex justify-center gap-[18px] font-mono text-[10px] tracking-[1.4px]"
            style={{ color: "rgba(232,220,192,0.6)" }}
          >
            <span>
              <span style={{ color: "#d4af37" }}>&#9675;</span> YOUR PICK
            </span>
            {!compact && (
              <span>
                <span style={{ color: "rgba(232,220,192,0.3)" }}>&#9675;</span>{" "}
                OPEN
              </span>
            )}
            <span>
              <span style={{ color: "rgba(232,220,192,0.6)" }}>&#9679;</span>{" "}
              TAKEN
            </span>
          </div>
        </div>

        <div
          className="flex flex-col justify-center overflow-auto border-l-0 lg:border-l px-[24px] py-[40px] md:px-[48px]"
          style={{
            background: "rgba(0,0,0,0.25)",
            borderColor: "rgba(212,175,55,0.18)",
          }}
        >
          <RegisterFeltForm
            selectedSeat={selectedOpenSeat}
            selectedColor={selectedColor}
            name={name}
            loading={loading}
            error={error}
            onSubmit={handleRegisterAndPlay}
            onGuestStart={handleGuestStart}
            onNameChange={setName}
            onColorSelect={setSelectedColor}
          />
        </div>
      </div>

      <ActivityMarqueeTicker />
    </main>
  );
}
