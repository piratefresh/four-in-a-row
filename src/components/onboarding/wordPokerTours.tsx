import type { Step, Tour } from "nextstepjs";
import { WordTile } from "@/components/rooms/table/word-tile-v2";
import { calculateShowdownPreviewScore } from "@/lib/showdownScore";

export const TUTORIAL_TARGET_WORD = "STRONG";

export type TutorialStep = Step & {
  tourKind?: "tutorial" | "helper";
  cardClassName?: string;
  titleClassName?: string;
  contentClassName?: string;
  iconClassName?: string;
  progressClassName?: string;
  controlsClassName?: string;
  hideNext?: boolean;
};

type TutorialTour = Omit<Tour, "steps"> & {
  steps: TutorialStep[];
};

export const FIRST_BOT_GAME_TOUR = "first-bot-game";
export const IN_GAME_HELPER_TOUR = "in-game-helper";
export const IN_GAME_HELPER_STEPS = {
  ready: 0,
  betting: 1,
  waiting: 2,
  wordBuilder: 3,
  communityReveal: 4,
  tileDetails: 5,
  showdown: 6,
} as const;
export const FIRST_BOT_GAME_WORD_BUILDER_WAIT_STEP = 3;
export const FIRST_BOT_GAME_SHUFFLE_STEP = 4;
export const FIRST_BOT_GAME_WORD_BUILDER_STEP = 5;
export const FIRST_BOT_GAME_SHOWDOWN_WAIT_STEP = 8;
export const FIRST_BOT_GAME_SHOWDOWN_STEP = 9;
export const FIRST_BOT_GAME_SHOWDOWN_SUBMIT_STEP = 11;
export const FIRST_BOT_GAME_PAUSEABLE_STEPS: Record<number, number> = {
  [FIRST_BOT_GAME_WORD_BUILDER_WAIT_STEP]: FIRST_BOT_GAME_SHUFFLE_STEP,
  [FIRST_BOT_GAME_SHOWDOWN_WAIT_STEP]: FIRST_BOT_GAME_SHOWDOWN_STEP,
};

export function getTourCompletionStorageKey(
  tourName: string,
  roomCode?: string | null,
) {
  const normalizedRoomCode = roomCode?.trim().toUpperCase();
  return normalizedRoomCode
    ? `word-poker.tour.completed.${tourName}.${normalizedRoomCode}`
    : `word-poker.tour.completed.${tourName}`;
}

export function getTourPausedStepStorageKey(
  tourName: string,
  roomCode?: string | null,
) {
  const normalizedRoomCode = roomCode?.trim().toUpperCase();
  return normalizedRoomCode
    ? `word-poker.tour.paused-step.${tourName}.${normalizedRoomCode}`
    : `word-poker.tour.paused-step.${tourName}`;
}

export function getTourStepStorageKey(
  tourName: string,
  stepName: string,
  roomCode?: string | null,
) {
  const normalizedRoomCode = roomCode?.trim().toUpperCase();
  return normalizedRoomCode
    ? `word-poker.tour.step.${tourName}.${stepName}.${normalizedRoomCode}`
    : `word-poker.tour.step.${tourName}.${stepName}`;
}

export function getRoomCodeFromPathname(pathname: string) {
  const match = /^\/rooms\/([^/?#]+)/i.exec(pathname);
  return match?.[1]?.toUpperCase() ?? null;
}

const strongExampleTiles = [
  { letter: "S", baseValue: 1 },
  { letter: "T", baseValue: 1 },
  { letter: "R", baseValue: 1, multiplier: "2L" as const },
  { letter: "O", baseValue: 1 },
  { letter: "N", baseValue: 1 },
  { letter: "G", baseValue: 2, multiplier: "3L" as const },
];

const strongExampleScore = calculateShowdownPreviewScore(strongExampleTiles);

export const wordPokerTours = [
  {
    tour: FIRST_BOT_GAME_TOUR,
    steps: [
      {
        icon: "A",
        title: "Ready",
        content: (
          <>Click the ready button to start the game when you are ready.</>
        ),
        selector: "#tutorial-room-actions",
        side: "top",
        pointerPadding: 0,
        pointerRadius: 0,
        hideNext: true,
      },
      {
        icon: "B",
        title: "Action buttons",
        content: (
          <>
            Your betting controls appear here when it is your turn.
            <br />
            `Check` passes when no extra chips are needed, `Call` matches the
            current bet, `Raise` increases the price, and `Fold` gives up the
            hand.
          </>
        ),
        selector: "#tutorial-room-actions",
        side: "top",
        pointerPadding: 0,
        pointerRadius: 0,
        showControls: true,
      },
      {
        icon: "C",
        title: "Phase flow",
        content: (
          <>
            Every hand follows the same rhythm: flop, turn, river, then
            showdown.
            <br />
            Each new reveal can change the best word available, so keep adapting
            as the community letters open up.
          </>
        ),
        selector: "#tutorial-phase-title",
        side: "bottom",
        pointerPadding: 0,
        pointerRadius: 0,
        showControls: true,
      },
      {
        icon: "D",
        title: "Play to the turn",
        content: (
          <>
            You have the basics.
            <br />
            Close the tutorial for now, play the hand normally, and it will pop
            back open when the turn reveals the letters you need.
          </>
        ),
        selector: "#tutorial-phase-title",
        side: "bottom",
        pointerPadding: 0,
        pointerRadius: 0,
        showControls: true,
      },
      {
        icon: "E",
        title: "Shuffle your tiles",
        content: (
          <>
            Stuck on your letters? Hit Shuffle and your tiles will rearrange
            randomly - sometimes a fresh layout is all you need to spot a great
            word!
          </>
        ),
        selector: "#tutorial-shuffle-button",
        side: "top",
        pointerPadding: 0,
        pointerRadius: 0,
        showControls: true,
      },
      {
        icon: "F",
        title: "Activate, drag, reorder",
        content: (
          <div className="space-y-3">
            <div>
              The turn has given you everything you need.
              <br />
              Activate the right letters, then drag them into order until your
              word spells <strong>{TUTORIAL_TARGET_WORD}</strong>.
              <br />
              This step will continue once your active word is exactly{" "}
              <strong>{TUTORIAL_TARGET_WORD}</strong>.
            </div>
            <img
              src="/activate_reorder.gif"
              alt="Activating, dragging, and reordering letters in the word builder."
              className="max-h-52 w-full rounded-xl border border-white/10 object-cover"
            />
          </div>
        ),
        selector: "#tutorial-player-hand",
        side: "top",
        pointerPadding: 70,
        pointerRadius: 16,
        showControls: true,
        hideNext: true,
      },
      {
        icon: "G",
        title: "Opponent thinking",
        content: (
          <>
            While your opponent is thinking, use that time to plan your best
            possible word!
          </>
        ),
        selector: "#tutorial-room-actions",
        side: "top",
        pointerPadding: 0,
        pointerRadius: 0,
        showControls: true,
      },
      {
        icon: "H",
        title: "FAQ and tips",
        content: <>Tap the ? below anytime to pull up the FAQ.</>,
        selector: "#tutorial-help-menu-button",
        side: "left",
        pointerPadding: 8,
        pointerRadius: 18,
        cardClassName: "max-w-[18rem]",
        showControls: true,
      },
      {
        icon: "I",
        title: "Play to showdown",
        content: (
          <>
            Close the tutorial again and keep betting through the turn and
            river.
            <br />
            It will return automatically at showdown when the submit button is
            available.
          </>
        ),
        selector: "#tutorial-player-hand",
        side: "top",
        pointerPadding: 0,
        pointerRadius: 0,
        showControls: true,
      },
      {
        icon: "J",
        title: "How you win",
        content: (
          <>
            The best submitted word wins the pot.
            <br />
            Good betting and good word-building both matter, because the best
            final score takes the chips.
          </>
        ),
        selector: "#tutorial-player-hand",
        side: "top",
        pointerPadding: 70,
        pointerRadius: 16,
        showControls: true,
      },
      {
        icon: "K",
        title: "Tile values",
        content: (
          <div className="space-y-3">
            <div>
              Your tutorial word is <strong>{TUTORIAL_TARGET_WORD}</strong>.
              Each tile shows its base value.
              <br />
              `2L` doubles one letter, and `3L` triples one letter.
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {strongExampleTiles.map((tile, index) => (
                <WordTile
                  key={`${tile.letter}-${index}`}
                  letter={tile.letter}
                  baseValue={tile.baseValue}
                  multiplier={tile.multiplier}
                  size="sm"
                  className="shrink-0"
                />
              ))}
            </div>
            <div className="rounded-lg bg-slate-950/5 px-3 py-2 text-sm leading-relaxed text-slate-700">
              {TUTORIAL_TARGET_WORD}:
              <br />
              Base = {strongExampleScore.basePoints}
              <br />
              Bonus = {strongExampleScore.multiplierBonus}
              <br />
              Total = {strongExampleScore.total}
            </div>
            <div className="text-sm leading-relaxed text-slate-700">
              Here, `R` is a `2L` tile, so it scores `2` instead of `1`.
              `G` is a `3L` tile, so it scores `6` instead of `2`.
            </div>
          </div>
        ),
        selector: "#tutorial-submit-word",
        side: "top",
        pointerPadding: 0,
        pointerRadius: 0,
        showControls: true,
      },
      {
        icon: "L",
        title: "Submit your word",
        content: (
          <>
            Showdown is the final commit.
            <br />
            Submit your strongest word here to score and win the pot.
          </>
        ),
        selector: "#tutorial-submit-word",
        side: "top",
        pointerPadding: 0,
        pointerRadius: 0,
        showControls: true,
      },
    ],
  },
  {
    tour: IN_GAME_HELPER_TOUR,
    steps: [
      {
        tourKind: "helper",
        icon: "1",
        title: "Ready up",
        content: (
          <>
            Use the ready button when you want the table to deal. The hand
            starts once everyone is ready.
          </>
        ),
        selector: "#tutorial-room-actions",
        side: "top",
        pointerPadding: 80,
        pointerRadius: 16,
        showControls: true,
      },
      {
        tourKind: "helper",
        icon: "2",
        title: "Your action",
        content: (
          <>
            Check when the price is zero, call to match the current bet, raise
            when you want to pressure the table, or fold to leave the hand. When
            Shuffle appears, use it to quickly rearrange your available letters
            before choosing your action.
          </>
        ),
        selector: "#tutorial-room-actions",
        side: "top",
        pointerPadding: 80,
        pointerRadius: 16,
        showControls: true,
      },
      {
        tourKind: "helper",
        icon: "3",
        title: "Waiting",
        content: (
          <>
            This area shows whose turn it is. The timer above the community
            letters shows how long the active player has left to act.
          </>
        ),
        selector: "#tutorial-room-actions",
        side: "top",
        pointerPadding: 80,
        pointerRadius: 16,
        showControls: true,
      },
      {
        tourKind: "helper",
        icon: "4",
        title: "Build your word",
        content: (
          <>
            Activate letters by clicking them, drag active letters to reorder
            your word, and keep refining as more community letters appear.
          </>
        ),
        selector: "#tutorial-player-hand",
        side: "top",
        pointerPadding: 70,
        pointerRadius: 16,
        showControls: true,
      },
      {
        tourKind: "helper",
        icon: "5",
        title: "Community letters",
        content: (
          <>
            Flop, turn, and river reveal shared letters. Each reveal can change
            your best word and your betting decision.
          </>
        ),
        selector: "#tutorial-community-letters",
        side: "bottom",
        pointerPadding: 60,
        pointerRadius: 16,
        showControls: true,
      },
      {
        tourKind: "helper",
        icon: "6",
        title: "Special tiles",
        content: (
          <>
            Tile values score directly. `2L` and `3L` multiply one letter, and
            choice tiles need a letter picked before you submit.
          </>
        ),
        selector: "#tutorial-player-hand",
        side: "top",
        pointerPadding: 70,
        pointerRadius: 16,
        showControls: true,
      },
      {
        tourKind: "helper",
        icon: "7",
        title: "Showdown",
        content: (
          <>
            Showdown is the final commit. Start the timer when required, then
            submit your strongest word before time expires.
          </>
        ),
        selector: "#tutorial-player-hand",
        side: "top",
        pointerPadding: 70,
        pointerRadius: 16,
        showControls: true,
      },
    ],
  },
] satisfies TutorialTour[];
