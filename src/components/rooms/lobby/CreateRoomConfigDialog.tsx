import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Brain, Clock3, Coins, Dices, Sparkles, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
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
  { value: 30_000 as const, label: "30s" },
  { value: 60_000 as const, label: "60s" },
];

const bettingOptions: Array<{ value: BettingStructure; label: string }> = [
  { value: "noLimit", label: "No Limit" },
  { value: "potLimit", label: "Pot Limit" },
  { value: "fixedLimit", label: "Fixed Limit" },
];

const choiceTileOptions: Array<{ value: ChoiceTileFrequency; label: string }> =
  [
    { value: "low", label: "0-1" },
    { value: "high", label: "2-3" },
  ];

const bonusOptions: Array<{ value: BonusStructure; label: string }> = [
  { value: "classic", label: "Classic" },
  { value: "noRackBonus", label: "No rack" },
  { value: "bigRackBonus", label: "Big rack" },
];

const botDifficultyOptions: Array<{ value: BotDifficulty; label: string }> = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

export function CreateRoomConfigDialog({
  open,
  isCreating,
  onOpenChange,
  onCreateRoom,
  title = "Create room",
  description = "Set the table rules before the first hand is dealt.",
  submitLabel = "Create room",
  submittingLabel = "Creating...",
  showBotDifficulty = false,
  defaultBotDifficulty = "medium",
  showRoomName = true,
  showTableRules = true,
}: CreateRoomConfigDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 640px)", false, {
    getInitialValueInEffect: false,
  });
  const form = (
    <CreateRoomConfigForm
      open={open}
      isCreating={isCreating}
      onCreateRoom={onCreateRoom}
      submitLabel={submitLabel}
      submittingLabel={submittingLabel}
      showBotDifficulty={showBotDifficulty}
      defaultBotDifficulty={defaultBotDifficulty}
      showRoomName={showRoomName}
      showTableRules={showTableRules}
    />
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg border border-gold bg-felt-deep p-0 text-cream sm:max-w-lg">
          <DialogHeader className="px-5 pt-5">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {form}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92svh] border-cream/10 bg-[#080806] text-cream">
        <DrawerHeader className="px-5 pt-5 text-left">
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription className="text-white">
            {description}
          </DrawerDescription>
        </DrawerHeader>
        {form}
      </DrawerContent>
    </Drawer>
  );
}

function CreateRoomConfigForm({
  open,
  isCreating,
  onCreateRoom,
  submitLabel,
  submittingLabel,
  showBotDifficulty,
  defaultBotDifficulty,
  showRoomName,
  showTableRules,
}: Pick<
  CreateRoomConfigDialogProps,
  | "open"
  | "isCreating"
  | "onCreateRoom"
  | "submitLabel"
  | "submittingLabel"
  | "showBotDifficulty"
  | "defaultBotDifficulty"
  | "showRoomName"
  | "showTableRules"
>) {
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
    const resolvedRoomTitle = showRoomName
      ? roomTitle.trim() || generatedRoomTitle
      : undefined;
    const resolvedShowdownTimer = resolveTimerMs(
      customTimerSeconds,
      showdownTimer,
    );
    onCreateRoom({
      roomTitle: resolvedRoomTitle || undefined,
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
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
      <div className="min-h-0 space-y-5 overflow-y-auto px-5 py-4">
        {showRoomName ? (
          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
              Room name
            </span>
            <div className="flex gap-2">
              <Input
                value={roomTitle}
                maxLength={40}
                onChange={(event) => setRoomTitle(event.target.value)}
                placeholder={generatedRoomTitle || "Friday table"}
                className="border-cream/20 bg-cream/5 text-cream placeholder:text-cream/35"
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
                className="shrink-0 border-cream/20 bg-cream/5 text-cream hover:bg-cream/10"
              >
                <Dices />
              </Button>
            </div>
          </label>
        ) : null}

        <TimerOptionGroup
          icon={<Clock3 />}
          label="Turn timer"
          options={timingOptions}
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
          <OptionGroup
            icon={<Brain />}
            label="Bot difficulty"
            options={botDifficultyOptions}
            value={botDifficulty}
            onChange={setBotDifficulty}
          />
        ) : null}
        {showTableRules ? (
          <>
            <OptionGroup
              icon={<Coins />}
              label="Betting"
              options={bettingOptions}
              value={bettingStructure}
              onChange={setBettingStructure}
            />
            <OptionGroup
              icon={<Type />}
              label="Two-letter tiles"
              options={choiceTileOptions}
              value={choiceTileFrequency}
              onChange={setChoiceTileFrequency}
            />
            <OptionGroup
              icon={<Sparkles />}
              label="Bonuses"
              options={bonusOptions}
              value={bonusStructure}
              onChange={setBonusStructure}
            />
          </>
        ) : null}
      </div>

      <DialogFooter className="hidden bg-transparent border-0 mx-0 mb-0 font-sans sm:flex">
        <Button type="submit" variant="primary" disabled={isCreating}>
          {isCreating ? submittingLabel : submitLabel}
        </Button>
      </DialogFooter>
      <DrawerFooter className="sm:hidden">
        <Button type="submit" variant="primary" disabled={isCreating}>
          {isCreating ? submittingLabel : submitLabel}
        </Button>
      </DrawerFooter>
    </form>
  );
}

function parseTimerSeconds(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.max(1, Math.round(parsed));
}

function resolveTimerMs(value: string, fallbackMs: number) {
  const parsedSeconds = parseTimerSeconds(value);
  return parsedSeconds === null ? fallbackMs : parsedSeconds * 1000;
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

function OptionGroup<TValue extends string | number>({
  icon,
  label,
  options,
  value,
  onChange,
}: {
  icon: ReactNode;
  label: string;
  options: Array<{ value: TValue; label: string }>;
  value: TValue;
  onChange: (value: TValue) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-gold">
        <span className="[&_svg]:size-4">{icon}</span>
        {label}
      </legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={String(option.value)}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                "h-10 rounded-lg border px-3 text-sm font-semibold transition-colors",
                selected
                  ? "border-gold-bright bg-gold text-felt-deep"
                  : "border-cream/15 bg-cream/5 text-cream hover:border-cream/30 hover:bg-cream/10",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function TimerOptionGroup({
  icon,
  label,
  options,
  value,
  customSeconds,
  onChange,
  onCustomSecondsChange,
}: {
  icon: ReactNode;
  label: string;
  options: Array<{ value: number; label: string }>;
  value: number;
  customSeconds: string;
  onChange: (value: number) => void;
  onCustomSecondsChange: (value: string) => void;
}) {
  const isPresetSelected = options.some((option) => option.value === value);

  return (
    <fieldset className="space-y-2">
      <legend className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-gold">
        <span className="[&_svg]:size-4">{icon}</span>
        {label}
      </legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={String(option.value)}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                "h-10 rounded-lg border px-3 text-sm font-semibold transition-colors",
                selected
                  ? "border-gold-bright bg-gold text-felt-deep"
                  : "border-cream/15 bg-cream/5 text-cream hover:border-cream/30 hover:bg-cream/10",
              )}
            >
              {option.label}
            </button>
          );
        })}
        <label
          className={cn(
            "flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors",
            isPresetSelected
              ? "border-cream/15 bg-cream/5 text-cream"
              : "border-gold-bright bg-gold text-felt-deep",
          )}
        >
          <span>Custom</span>
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            required
            value={customSeconds}
            onChange={(event) => onCustomSecondsChange(event.target.value)}
            className={cn(
              "h-7 min-w-0 border-0 px-1 py-0 text-right text-sm shadow-none [appearance:textfield] focus-visible:ring-1 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
              isPresetSelected
                ? "bg-transparent text-cream"
                : "bg-transparent text-felt-deep",
            )}
            aria-label="Custom turn timer seconds"
          />
          <span>s</span>
        </label>
      </div>
    </fieldset>
  );
}
