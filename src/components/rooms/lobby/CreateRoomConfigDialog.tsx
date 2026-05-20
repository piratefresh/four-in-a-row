import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Brain, Dices } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useMediaQuery } from "@/components/rooms/hooks/useMediaQuery";
import { cn } from "@/lib/utils";

type BettingStructure = "noLimit" | "potLimit" | "fixedLimit";
type ChoiceTileFrequency = "low" | "high";
type BonusStructure = "classic" | "noRackBonus" | "bigRackBonus";
export type BotDifficulty = "easy" | "medium" | "hard";

export type CreateRoomConfigValues = {
  roomTitle?: string;
  botDifficulty?: BotDifficulty;
  config: {
    showdownTimer: number;
    bettingStructure: BettingStructure;
    choiceTileFrequency: ChoiceTileFrequency;
    bonusStructure: BonusStructure;
  };
};

type CreateRoomConfigDialogProps = {
  open: boolean;
  isCreating: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateRoom: (values: CreateRoomConfigValues) => void;
  title?: string;
  description?: string;
  submitLabel?: string;
  submittingLabel?: string;
  showBotDifficulty?: boolean;
  defaultBotDifficulty?: BotDifficulty;
  showRoomName?: boolean;
  showTableRules?: boolean;
};

const timingOptions = [
  { value: 30_000 as const, label: "30" },
  { value: 60_000 as const, label: "60" },
];

const bettingOptions: Array<{
  value: BettingStructure;
  label: string;
  subtitle: string;
}> = [
  { value: "noLimit", label: "No limit", subtitle: "SHOVE ANY TIME" },
  { value: "potLimit", label: "Pot limit", subtitle: "CAP AT POT" },
  { value: "fixedLimit", label: "Fixed", subtitle: "BB INCREMENTS" },
];

const choiceTileOptions: Array<{
  value: ChoiceTileFrequency;
  label: string;
}> = [
  { value: "low", label: "0-1" },
  { value: "high", label: "2-3" },
];

const bonusOptions: Array<{
  value: BonusStructure;
  label: string;
  subtitle: string;
}> = [
  { value: "classic", label: "Classic", subtitle: "7-LETTER +50" },
  { value: "noRackBonus", label: "No rack", subtitle: "NO BONUS" },
  { value: "bigRackBonus", label: "Big rack", subtitle: "FULL RACK +100" },
];

const botDifficultyOptions: Array<{
  value: BotDifficulty;
  label: string;
  subtitle: string;
}> = [
  { value: "easy", label: "Easy", subtitle: "LENIENT" },
  { value: "medium", label: "Medium", subtitle: "BALANCED" },
  { value: "hard", label: "Hard", subtitle: "AGGRESSIVE" },
];

export function CreateRoomConfigDialog({
  open,
  isCreating,
  onOpenChange,
  onCreateRoom,
  title = "Deal a new table",
  description = "Set the table rules. Once dealt, blinds and tempo are locked for the night.",
  submitLabel = "Deal the table",
  submittingLabel = "Dealing...",
  showBotDifficulty = false,
  defaultBotDifficulty = "medium",
  showRoomName = true,
  showTableRules = true,
}: CreateRoomConfigDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 640px)", false, {
    getInitialValueInEffect: false,
  });

  if (isDesktop) {
    return (
      <DesktopDialog
        open={open}
        isCreating={isCreating}
        onOpenChange={onOpenChange}
        onCreateRoom={onCreateRoom}
        title={title}
        description={description}
        submitLabel={submitLabel}
        submittingLabel={submittingLabel}
        showBotDifficulty={showBotDifficulty}
        defaultBotDifficulty={defaultBotDifficulty}
        showRoomName={showRoomName}
        showTableRules={showTableRules}
      />
    );
  }

  return (
    <MobileDrawer
      open={open}
      isCreating={isCreating}
      onOpenChange={onOpenChange}
      onCreateRoom={onCreateRoom}
      title={title}
      description={description}
      submitLabel={submitLabel}
      submittingLabel={submittingLabel}
      showBotDifficulty={showBotDifficulty}
      defaultBotDifficulty={defaultBotDifficulty}
      showRoomName={showRoomName}
      showTableRules={showTableRules}
    />
  );
}

function DesktopDialog({
  open,
  isCreating,
  onOpenChange,
  onCreateRoom,
  title,
  description,
  submitLabel,
  submittingLabel,
  showBotDifficulty,
  defaultBotDifficulty,
  showRoomName,
  showTableRules,
}: CreateRoomConfigDialogProps) {
  const [roomTitle, setRoomTitle] = useState("");
  const [generatedRoomTitle, setGeneratedRoomTitle] = useState("");
  const [showdownTimer, setShowdownTimer] = useState(60_000);
  const [customTimerSeconds, setCustomTimerSeconds] = useState("60");
  const [bettingStructure, setBettingStructure] =
    useState<BettingStructure>("noLimit");
  const [choiceTileFrequency, setChoiceTileFrequency] =
    useState<ChoiceTileFrequency>("low");
  const [bonusStructure, setBonusStructure] =
    useState<BonusStructure>("classic");
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>(
    defaultBotDifficulty ?? "medium",
  );

  const resolvedRoomTitle = showRoomName
    ? roomTitle.trim() || generatedRoomTitle || "New Table"
    : "New Table";

  const resolvedTimerSeconds = Math.round(
    resolveTimerMs(customTimerSeconds, showdownTimer) / 1000,
  );

  const configLine = resolveConfigLine(
    resolvedTimerSeconds,
    bettingStructure,
    choiceTileFrequency,
  );

  const generateRoomTitle = () => {
    void getGeneratedRoomTitle().then((title) => {
      setGeneratedRoomTitle(title);
      setRoomTitle((current) => current.trim() || title);
    });
  };

  useEffect(() => {
    if (!open) return;
    if (!showRoomName) return;
    generateRoomTitle();
  }, [open, showRoomName]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const resolvedShowdownTimer = resolveTimerMs(
      customTimerSeconds,
      showdownTimer,
    );
    onCreateRoom({
      roomTitle: showRoomName
        ? roomTitle.trim() || generatedRoomTitle || undefined
        : undefined,
      botDifficulty: showBotDifficulty ? botDifficulty : undefined,
      config: {
        showdownTimer: resolvedShowdownTimer,
        bettingStructure,
        choiceTileFrequency,
        bonusStructure,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-4xl border border-gold/35 bg-[linear-gradient(rgb(14,40,32)_0%,rgb(8,26,20)_100%)] p-0 text-cream shadow-[0_30px_80px_rgba(0,0,0,0.7),0_0_60px_rgba(212,175,55,0.06)] sm:max-w-4xl"
        style={{ borderRadius: 14 }}
      >
        <form onSubmit={handleSubmit} className="flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-dashed border-gold/25 px-7 py-5">
            <div>
              <div className="font-mono text-[10px] tracking-[0.22em] text-gold">
                NEW TABLE &middot; DEAL SLIP
              </div>
              <DialogTitle className="mt-1 font-serif text-[28px] font-semibold italic leading-none tracking-[-0.01em] text-[rgb(244,228,193)]">
                {title}
              </DialogTitle>
            </div>
            <DialogClose
              render={
                <div className="flex h-[30px] w-[30px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-gold/20 bg-black/30 text-sm text-cream hover:bg-black/50">
                  &times;
                </div>
              }
            />
          </div>

          {/* Body: two columns */}
          <div className="grid grid-cols-[1.15fr_1fr]">
            {/* Left: form fields */}
            <div className="space-y-[18px] border-r border-gold/[0.12] px-7 py-6">
              <p className="font-mono text-[11px] leading-relaxed text-cream/55">
                {description}
              </p>

              {showRoomName ? (
                <div style={{ marginBottom: 18 }}>
                  <FieldLabel
                    icon="A"
                    label="Room name"
                    subtitle="VISIBLE ON THE WIRE"
                  />
                  <div className="flex gap-2">
                    <Input
                      value={roomTitle}
                      maxLength={40}
                      onChange={(event) => setRoomTitle(event.target.value)}
                      placeholder={generatedRoomTitle || "Friday table"}
                      className="flex-1 border-gold/20 bg-black/30 px-[14px] py-[11px] font-sans text-sm text-[rgb(244,228,193)] placeholder:text-cream/30"
                      style={{ borderRadius: 8 }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      onClick={() => {
                        void getGeneratedRoomTitle().then((title) => {
                          setGeneratedRoomTitle(title);
                          setRoomTitle(title);
                        });
                      }}
                      aria-label="Generate room name"
                      className="h-[42px] w-[42px] shrink-0 border-gold/20 bg-black/30 text-cream hover:bg-black/50"
                      style={{ borderRadius: 8 }}
                    >
                      <Dices />
                    </Button>
                  </div>
                </div>
              ) : null}

              <TimerField
                value={showdownTimer}
                customSeconds={customTimerSeconds}
                onChange={(value) => {
                  setShowdownTimer(value);
                  setCustomTimerSeconds(String(value / 1000));
                }}
                onCustomSecondsChange={(value) => {
                  setCustomTimerSeconds(value);
                  const parsed = parseTimerSeconds(value);
                  if (parsed !== null) {
                    setShowdownTimer(parsed * 1000);
                  }
                }}
              />

              {showBotDifficulty ? (
                <div style={{ marginBottom: 18 }}>
                  <FieldLabel
                    icon={<Brain className="size-3.5" />}
                    label="Bot difficulty"
                  />
                  <div className="flex gap-1.5">
                    {botDifficultyOptions.map((option) => {
                      const selected = option.value === botDifficulty;
                      return (
                        <OptionPill
                          key={option.value}
                          label={option.label}
                          subtitle={option.subtitle}
                          selected={selected}
                          onClick={() => setBotDifficulty(option.value)}
                        />
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {showTableRules ? (
                <>
                  <div style={{ marginBottom: 18 }}>
                    <FieldLabel icon="&#9672;" label="Betting structure" />
                    <div className="flex gap-1.5">
                      {bettingOptions.map((option) => {
                        const selected = option.value === bettingStructure;
                        return (
                          <OptionPill
                            key={option.value}
                            label={option.label}
                            subtitle={option.subtitle}
                            selected={selected}
                            onClick={() => setBettingStructure(option.value)}
                          />
                        );
                      })}
                    </div>
                  </div>

                  <div className="mb-[18px] grid grid-cols-2 gap-[18px]">
                    <div>
                      <FieldLabel icon="T" label="Two-letter tiles" />
                      <div className="flex gap-1.5">
                        {choiceTileOptions.map((option) => {
                          const selected = option.value === choiceTileFrequency;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() =>
                                setChoiceTileFrequency(option.value)
                              }
                              className={cn(
                                "flex flex-1 items-center justify-center rounded-lg py-[11px] font-mono text-xs font-semibold tracking-[0.05em] transition-colors",
                                selected
                                  ? "border border-[rgb(128,99,22)] bg-[linear-gradient(rgb(244,211,94)_0%,rgb(212,175,55)_60%,rgb(168,128,31)_100%)] text-[rgb(26,18,8)] shadow-[0_1px_0_rgba(255,255,255,0.4)_inset]"
                                  : "border border-gold/[0.15] bg-black/30 text-cream",
                              )}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: 4 }}>
                    <FieldLabel icon="&#9733;" label="Bonus rules" />
                    <div className="flex gap-1.5">
                      {bonusOptions.map((option) => {
                        const selected = option.value === bonusStructure;
                        return (
                          <OptionPill
                            key={option.value}
                            label={option.label}
                            subtitle={option.subtitle}
                            selected={selected}
                            onClick={() => setBonusStructure(option.value)}
                          />
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {/* Right: preview panel */}
            <div className="flex flex-col gap-1 bg-black/[0.18] px-7 py-6">
              <div className="font-mono text-[9px] leading-none tracking-[0.1em] text-cream/50">
                PREVIEW &middot; ROW ON THE WIRE
              </div>
              <div className="mt-2.5 rounded-[10px] border border-dashed border-gold/40 bg-gold/[0.05] px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold text-[rgb(244,228,193)]">
                    {resolvedRoomTitle}
                  </div>
                  <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold tracking-[0.075em] text-[rgb(158,194,122)]">
                    <span className="inline-block h-[7px] w-[7px] rounded-full bg-[rgb(158,194,122)]" />
                    OPEN
                  </span>
                </div>
                <div className="mt-[3px] font-mono text-[10px] tracking-[0.07em] text-cream/45">
                  {configLine}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold text-[rgb(12,20,16)] font-sans text-[7.6px] font-bold tracking-[-0.03em]"
                      style={{
                        boxShadow: "0 0 0 2px rgb(12, 38, 32)",
                      }}
                    >
                      H
                    </div>
                    <span className="font-mono text-[10px] text-cream/50">
                      1/4
                    </span>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gold/30 bg-gold/[0.12]">
                    <svg width="10" height="10" viewBox="0 0 10 10">
                      <path d="M2 2L8 5L2 8Z" fill="#d4af37" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="mt-5 font-mono text-[9px] leading-none tracking-[0.1em] text-cream/50">
                PREVIEW &middot; OPENING ANNOUNCEMENT
              </div>
              <div className="mt-2.5 flex items-baseline gap-3 rounded-lg border border-gold/[0.12] bg-black/25 px-3.5 py-2.5 font-mono text-[11px]">
                <span className="text-cream/35">NOW</span>
                <span className="text-[rgb(158,194,122)]">&bull;</span>
                <span className="text-cream/55">{resolvedRoomTitle}</span>
                <span className="font-sans text-[rgb(244,228,193)]">
                  You opened the table &middot; {configLine}
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-dashed border-gold/25 bg-black/20 px-7 py-[18px]">
            <div className="font-mono text-[10px] leading-none tracking-[0.0875em] text-cream/50">
              <span className="text-gold">&crarr;</span> RETURN TO DEAL &middot;{" "}
              <span className="opacity-60">ESC TO CANCEL</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Button
                type="button"
                variant="default"
                onClick={() => onOpenChange(false)}
                className="rounded-lg border border-gold/20 bg-transparent px-[18px] py-3 text-[13px] font-semibold text-cream/70 hover:bg-cream/5 hover:text-cream"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isCreating}
                className="flex items-center gap-2.5 rounded-lg border border-[rgb(128,99,22)] bg-[linear-gradient(rgb(244,211,94)_0%,rgb(212,175,55)_60%,rgb(168,128,31)_100%)] px-[22px] py-[13px] text-[13px] font-bold uppercase tracking-[0.0625em] text-[rgb(26,18,8)] shadow-[0_1px_0_rgba(255,255,255,0.4)_inset,0_4px_14px_rgba(0,0,0,0.4)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCreating ? submittingLabel : submitLabel}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MobileDrawer({
  open,
  isCreating,
  onOpenChange,
  onCreateRoom,
  title,
  submitLabel,
  submittingLabel,
  showBotDifficulty,
  defaultBotDifficulty,
  showRoomName,
  showTableRules,
}: CreateRoomConfigDialogProps) {
  const [roomTitle, setRoomTitle] = useState("");
  const [generatedRoomTitle, setGeneratedRoomTitle] = useState("");
  const [showdownTimer, setShowdownTimer] = useState(60_000);
  const [customTimerSeconds, setCustomTimerSeconds] = useState("60");
  const [bettingStructure, setBettingStructure] =
    useState<BettingStructure>("noLimit");
  const [choiceTileFrequency, setChoiceTileFrequency] =
    useState<ChoiceTileFrequency>("low");
  const [bonusStructure, setBonusStructure] =
    useState<BonusStructure>("classic");
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>(
    defaultBotDifficulty ?? "medium",
  );

  const resolvedRoomTitle = showRoomName
    ? roomTitle.trim() || generatedRoomTitle || "New Table"
    : "New Table";

  const resolvedTimerSeconds = Math.round(
    resolveTimerMs(customTimerSeconds, showdownTimer) / 1000,
  );

  const configLine = resolveConfigLine(
    resolvedTimerSeconds,
    bettingStructure,
    choiceTileFrequency,
  );

  const generateRoomTitle = () => {
    void getGeneratedRoomTitle().then((title) => {
      setGeneratedRoomTitle(title);
      setRoomTitle((current) => current.trim() || title);
    });
  };

  useEffect(() => {
    if (!open) return;
    if (!showRoomName) return;
    generateRoomTitle();
  }, [open, showRoomName]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const resolvedShowdownTimer = resolveTimerMs(
      customTimerSeconds,
      showdownTimer,
    );
    onCreateRoom({
      roomTitle: showRoomName
        ? roomTitle.trim() || generatedRoomTitle || undefined
        : undefined,
      botDifficulty: showBotDifficulty ? botDifficulty : undefined,
      config: {
        showdownTimer: resolvedShowdownTimer,
        bettingStructure,
        choiceTileFrequency,
        bonusStructure,
      },
    });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        className="max-h-[92%] border-gold/40 border-t bg-[linear-gradient(rgb(14,40,32)_0%,rgb(8,26,20)_100%)] text-cream shadow-[0_-20px_60px_rgba(0,0,0,0.6)]"
        style={{
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2">
          <div className="h-1 w-10 rounded-full bg-cream/25" />
        </div>

        {/* Header */}
        <div className="space-y-0.5 border-b border-dashed border-gold/[0.22] px-[22px] pb-3.5 pt-3">
          <div className="flex items-baseline justify-between">
            <DrawerTitle className="mt-0.5 font-serif text-2xl font-semibold italic leading-none tracking-[-0.02em] text-[rgb(244,228,193)]">
              {title}
            </DrawerTitle>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="font-mono text-lg text-cream/60"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Form fields */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="flex-1 space-y-4 overflow-auto px-[18px] pt-2 pb-3.5">
            <Accordion className="rounded-[10px] border border-dashed border-gold/35 bg-gold/[0.05] px-3">
              <AccordionItem value="preview" className="border-b-0">
                <AccordionTrigger className="py-2.5">
                  <span className="font-mono text-[8px] tracking-[0.2em] text-cream/55">
                    PREVIEW ON THE WIRE
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="flex items-center justify-between gap-2.5 pb-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <div className="truncate text-[13px] font-semibold text-[rgb(244,228,193)]">
                          {resolvedRoomTitle}
                        </div>
                        <span className="inline-flex shrink-0 items-center gap-1.5 font-mono text-[10px] font-semibold tracking-[0.075em] text-[rgb(158,194,122)]">
                          <span className="inline-block h-[7px] w-[7px] rounded-full bg-[rgb(158,194,122)]" />
                          OPEN
                        </span>
                      </div>
                      <div className="mt-0.5 font-mono text-[9px] tracking-[0.056em] text-cream/50">
                        {configLine}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-mono text-[9px] text-cream/45">
                        1/4 SEATS
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {showRoomName ? (
              <div>
                <FieldLabel icon="A" label="Room name" />
                <div className="flex gap-1.5">
                  <Input
                    value={roomTitle}
                    maxLength={40}
                    onChange={(event) => setRoomTitle(event.target.value)}
                    placeholder={generatedRoomTitle || "Friday table"}
                    className="flex-1 border-gold/20 bg-black/30 px-3 py-[11px] font-sans text-sm text-[rgb(244,228,193)] placeholder:text-cream/30"
                    style={{ borderRadius: 8 }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    onClick={() => {
                      void getGeneratedRoomTitle().then((title) => {
                        setGeneratedRoomTitle(title);
                        setRoomTitle(title);
                      });
                    }}
                    aria-label="Generate room name"
                    className="h-[42px] w-[42px] shrink-0 border-gold/20 bg-black/30 text-cream"
                    style={{ borderRadius: 8 }}
                  >
                    <Dices />
                  </Button>
                </div>
              </div>
            ) : null}

            <TimerField
              value={showdownTimer}
              customSeconds={customTimerSeconds}
              onChange={(value) => {
                setShowdownTimer(value);
                setCustomTimerSeconds(String(value / 1000));
              }}
              onCustomSecondsChange={(value) => {
                setCustomTimerSeconds(value);
                const parsed = parseTimerSeconds(value);
                if (parsed !== null) {
                  setShowdownTimer(parsed * 1000);
                }
              }}
            />

            {showBotDifficulty ? (
              <div>
                <FieldLabel
                  icon={<Brain className="size-3.5" />}
                  label="Bot difficulty"
                />
                <div className="flex gap-1.5">
                  {botDifficultyOptions.map((option) => {
                    const selected = option.value === botDifficulty;
                    return (
                      <OptionPill
                        key={option.value}
                        label={option.label}
                        subtitle={option.subtitle}
                        selected={selected}
                        onClick={() => setBotDifficulty(option.value)}
                      />
                    );
                  })}
                </div>
              </div>
            ) : null}

            {showTableRules ? (
              <>
                <div>
                  <FieldLabel icon="&#9672;" label="Betting" />
                  <div className="flex gap-1.5">
                    {bettingOptions.map((option) => {
                      const selected = option.value === bettingStructure;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setBettingStructure(option.value)}
                          className={cn(
                            "flex flex-1 items-center justify-center rounded-lg px-2 py-[11px] font-sans text-xs font-semibold transition-colors",
                            selected
                              ? "border border-[rgb(128,99,22)] bg-[linear-gradient(rgb(244,211,94)_0%,rgb(212,175,55)_60%,rgb(168,128,31)_100%)] text-[rgb(26,18,8)]"
                              : "border border-gold/[0.15] bg-black/30 text-cream",
                          )}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <FieldLabel icon="T" label="2-letter tiles" />
                    <div className="flex gap-1">
                      {choiceTileOptions.map((option) => {
                        const selected = option.value === choiceTileFrequency;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setChoiceTileFrequency(option.value)}
                            className={cn(
                              "flex flex-1 items-center justify-center rounded-lg py-[11px] font-mono text-xs font-semibold tracking-[0.0375em] transition-colors",
                              selected
                                ? "border border-[rgb(128,99,22)] bg-[linear-gradient(rgb(244,211,94)_0%,rgb(212,175,55)_60%,rgb(168,128,31)_100%)] text-[rgb(26,18,8)] shadow-[0_1px_0_rgba(255,255,255,0.4)_inset]"
                                : "border border-gold/[0.15] bg-black/30 text-cream",
                            )}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div>
                  <FieldLabel icon="&#9733;" label="Bonuses" />
                  <div className="flex gap-1.5">
                    {bonusOptions.map((option) => {
                      const selected = option.value === bonusStructure;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setBonusStructure(option.value)}
                          className={cn(
                            "flex flex-1 items-center justify-center rounded-lg px-1.5 py-[11px] font-sans text-xs font-semibold transition-colors",
                            selected
                              ? "border border-[rgb(128,99,22)] bg-[linear-gradient(rgb(244,211,94)_0%,rgb(212,175,55)_60%,rgb(168,128,31)_100%)] text-[rgb(26,18,8)]"
                              : "border border-gold/[0.15] bg-black/30 text-cream",
                          )}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {/* Footer */}
          <div className="border-t border-dashed border-gold/[0.22] bg-black/20 px-[18px] pb-7 pt-3">
            <Button
              type="submit"
              variant="primary"
              disabled={isCreating}
              className="flex w-full items-center justify-center gap-2.5 rounded-full border border-[rgb(128,99,22)] bg-[linear-gradient(rgb(244,211,94)_0%,rgb(212,175,55)_60%,rgb(168,128,31)_100%)] px-4 py-[15px] text-[13px] font-bold uppercase tracking-[0.077em] text-[rgb(26,18,8)] shadow-[0_1px_0_rgba(255,255,255,0.4)_inset,0_4px_14px_rgba(0,0,0,0.4)] hover:bg-[linear-gradient(rgb(250,220,110)_0%,rgb(220,185,65)_60%,rgb(175,135,35)_100%)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCreating ? submittingLabel : submitLabel}
            </Button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  );
}

/* ---- Helpers ---- */

function parseTimerSeconds(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.max(1, Math.round(parsed));
}

function resolveTimerMs(value: string, fallbackMs: number) {
  const parsedSeconds = parseTimerSeconds(value);
  return parsedSeconds === null ? fallbackMs : parsedSeconds * 1000;
}

function resolveConfigLine(
  seconds: number,
  betting: BettingStructure,
  tiles: ChoiceTileFrequency,
) {
  const bettingLabel =
    betting === "potLimit"
      ? "Pot limit"
      : betting === "fixedLimit"
        ? "Fixed"
        : "No-limit";
  const tilesLabel = tiles === "high" ? "2-3 tiles" : "0-1 tiles";
  return `${seconds}s \u00B7 ${bettingLabel} \u00B7 ${tilesLabel}`;
}

let roomNameWordsPromise: Promise<string[]> | null = null;

function getRoomNameWords() {
  roomNameWordsPromise ??= fetch("/CSW24.txt")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to load CSW24 word list.");
      }
      return response.text();
    })
    .then((text) =>
      text
        .split(/\r?\n/)
        .map((word) => word.trim())
        .filter((word) => /^[A-Z]{4,9}$/.test(word) && !word.endsWith("S")),
    )
    .catch(() => ["BINGO", "QUARTZ", "JUMBLE", "LEXICON", "RACK", "SCORE"]);

  return roomNameWordsPromise;
}

function titleCaseWord(word: string) {
  return word.charAt(0) + word.slice(1).toLowerCase();
}

async function getGeneratedRoomTitle() {
  const words = await getRoomNameWords();
  const word = words[Math.floor(Math.random() * words.length)] ?? "Lexicon";
  return `${titleCaseWord(word)} Table`;
}

/* ---- UI Primitives ---- */

function FieldLabel({
  icon,
  label,
  subtitle,
}: {
  icon: ReactNode;
  label: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-2 flex items-baseline gap-2">
      <span className="font-mono text-[10px] tracking-[0.1em] text-gold">
        {icon}
      </span>
      <span className="flex-1 font-mono text-[10px] uppercase tracking-[0.1125em] text-cream/85">
        {label}
      </span>
      {subtitle ? (
        <span className="ml-auto font-mono text-[9px] tracking-[0.0625em] text-cream/40">
          {subtitle}
        </span>
      ) : null}
    </div>
  );
}

function OptionPill({
  label,
  subtitle,
  selected,
  onClick,
}: {
  label: string;
  subtitle: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 flex-col items-center gap-[3px] rounded-lg px-3 py-2.5 font-sans transition-colors",
        selected
          ? "border border-[rgb(128,99,22)] bg-[linear-gradient(rgb(244,211,94)_0%,rgb(212,175,55)_60%,rgb(168,128,31)_100%)] text-[rgb(26,18,8)]"
          : "border border-gold/[0.15] bg-black/30 text-cream",
      )}
    >
      <span className="text-[13px] font-semibold leading-tight">{label}</span>
      <span
        className={cn(
          "font-mono text-[9px] leading-tight tracking-[0.075em]",
          selected ? "opacity-65" : "opacity-65",
        )}
      >
        {subtitle}
      </span>
    </button>
  );
}

function TimerField({
  value,
  customSeconds,
  onChange,
  onCustomSecondsChange,
}: {
  value: number;
  customSeconds: string;
  onChange: (value: number) => void;
  onCustomSecondsChange: (value: string) => void;
}) {
  const isPresetSelected = timingOptions.some((o) => o.value === value);

  return (
    <div style={{ marginBottom: 18 }}>
      <FieldLabel icon="&#9201;" label="Turn timer" subtitle="PER PLAYER" />
      <div className="flex gap-1.5">
        {timingOptions.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg py-[11px] font-mono text-xs font-semibold tracking-[0.0375em] transition-colors",
                selected
                  ? "border border-[rgb(128,99,22)] bg-[linear-gradient(rgb(244,211,94)_0%,rgb(212,175,55)_60%,rgb(168,128,31)_100%)] text-[rgb(26,18,8)] shadow-[0_1px_0_rgba(255,255,255,0.4)_inset]"
                  : "border border-gold/[0.15] bg-black/30 text-cream",
              )}
            >
              {option.label}
              <span className={selected ? "opacity-70" : "opacity-50"}>s</span>
            </button>
          );
        })}
        <label
          className={cn(
            "flex flex-[2] items-center gap-2 rounded-lg border px-3 font-mono text-[10px] tracking-[0.075em] transition-colors",
            isPresetSelected
              ? "border-gold/[0.15] bg-black/30 text-cream"
              : "border-[rgb(128,99,22)] bg-[linear-gradient(rgb(244,211,94)_0%,rgb(212,175,55)_60%,rgb(168,128,31)_100%)] text-[rgb(26,18,8)]",
          )}
        >
          <span
            className={
              isPresetSelected ? "text-cream/50" : "text-[rgb(26,18,8)]/70"
            }
          >
            CUSTOM
          </span>
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            required
            value={customSeconds}
            onChange={(event) => onCustomSecondsChange(event.target.value)}
            placeholder="&mdash;"
            className={cn(
              "h-full min-w-0 flex-1 border-0 bg-transparent px-0 py-0 text-right font-mono text-[13px] shadow-none [appearance:textfield] focus-visible:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
              isPresetSelected
                ? "text-[rgb(244,228,193)]"
                : "text-[rgb(26,18,8)]",
            )}
            aria-label="Custom turn timer seconds"
          />
          <span
            className={cn(
              "font-mono text-[11px]",
              isPresetSelected ? "text-cream/50" : "text-[rgb(26,18,8)]/70",
            )}
          >
            s
          </span>
        </label>
      </div>
    </div>
  );
}
