import type { Step, Tour } from "nextstepjs";
import { WordTile } from "@/components/rooms/table/word-tile-v2";
import { calculateShowdownPreviewScore } from "@/lib/showdownScore";

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
export const FIRST_BOT_GAME_WORD_BUILDER_WAIT_STEP = 2;
export const FIRST_BOT_GAME_WORD_BUILDER_STEP = 3;
export const FIRST_BOT_GAME_SHOWDOWN_WAIT_STEP = 5;
export const FIRST_BOT_GAME_SHOWDOWN_STEP = 6;
export const FIRST_BOT_GAME_SHOWDOWN_SUBMIT_STEP =
  FIRST_BOT_GAME_SHOWDOWN_STEP + 2;
export const FIRST_BOT_GAME_PAUSEABLE_STEPS: Record<number, number> = {
  [FIRST_BOT_GAME_WORD_BUILDER_WAIT_STEP]: FIRST_BOT_GAME_WORD_BUILDER_STEP,
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

export function getRoomCodeFromPathname(pathname: string) {
  const match = /^\/rooms\/([^/?#]+)/i.exec(pathname);
  return match?.[1]?.toUpperCase() ?? null;
}

const tileValueExampleTiles = [
  { letter: "K", baseValue: 5 },
  { letter: "A", baseValue: 1, multiplier: "2L" as const },
  { letter: "Z", baseValue: 10, multiplier: "3L" as const },
];

const tileValueExampleScore = calculateShowdownPreviewScore(
  tileValueExampleTiles,
);

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
        showControls: true,
        showSkip: true,
      },
      {
        icon: "C",
        title: "Play to the flop",
        content: (
          <>
            You have the basics.
            <br />
            Close the tutorial for now, play the hand normally, and it will pop
            back open when the flop reveals.
          </>
        ),
        selector: "#pot-amount",
        side: "top",
        showControls: true,
        showSkip: true,
      },
      {
        icon: "D",
        title: "Activate, drag, reorder",
        content: (
          <div className="space-y-3">
            <div>
              This is your word builder once the flop starts.
              <br />
              Click a letter to turn it off, drag letters to reorder them, and
              keep refining your best word as more community letters reveal.
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
        showControls: true,
        showSkip: true,
      },
      {
        icon: "E",
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
        selector: "#tutorial-player-hand",
        side: "bottom-right",
        showControls: true,
        showSkip: true,
      },
      {
        icon: "F",
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
        showControls: true,
        showSkip: true,
      },
      {
        icon: "G",
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
        showControls: true,
        showSkip: true,
      },
      {
        icon: "H",
        title: "Tile values",
        content: (
          <div className="space-y-3">
            <div>
              Each tile shows its base value.
              <br />
              `2L` doubles one letter, and `3L` triples one letter.
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <WordTile
                letter="K"
                baseValue={5}
                size="sm"
                className="shrink-0"
              />
              <WordTile
                letter="A"
                baseValue={1}
                multiplier="2L"
                size="sm"
                className="shrink-0"
              />
              <WordTile
                letter="Z"
                baseValue={10}
                multiplier="3L"
                size="sm"
                className="shrink-0"
              />
            </div>
            <div className="rounded-lg bg-slate-950/5 px-3 py-2 text-sm leading-relaxed text-slate-700">
              Example:
              <br />
              Base = {tileValueExampleScore.basePoints}
              <br />
              Bonus = {tileValueExampleScore.multiplierBonus}
              <br />
              Total = {tileValueExampleScore.total}
            </div>
            <div className="text-sm leading-relaxed text-slate-700">
              Here, `A` scores `2` and `Z` scores `30`.
            </div>
          </div>
        ),
        selector: "#tutorial-submit-word",
        side: "top",
        showControls: true,
        showSkip: true,
      },
      {
        icon: "I",
        title: "Submit your word",
        content: (
          <>
            Showdown is the final commit.
            <br />
            Click `Start timer` first, then submit your word here before time
            runs out.
          </>
        ),
        selector: "#tutorial-submit-word",
        side: "top",
        showControls: true,
        showSkip: true,
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
        showControls: true,
      },
      {
        tourKind: "helper",
        icon: "2",
        title: "Your action",
        content: (
          <>
            Check when the price is zero, call to match the current bet, raise
            when you want to pressure the table, or fold to leave the hand.
          </>
        ),
        selector: "#tutorial-room-actions",
        side: "top",
        showControls: true,
      },
      {
        tourKind: "helper",
        icon: "3",
        title: "Waiting",
        content: (
          <>
            This area shows whose turn it is. If a clock is called, the timer
            shows how long the active player has left to act.
          </>
        ),
        selector: "#tutorial-room-actions",
        side: "top",
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
        showControls: true,
      },
    ],
  },
] satisfies TutorialTour[];
