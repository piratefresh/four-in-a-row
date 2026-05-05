import { CircleHelp } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type HelpTip = {
  title: string;
  body: string;
  mediaSrc?: string;
  mediaLabel?: string;
  actions?: Array<{
    label: string;
    description: string;
  }>;
};

export const ROOM_HELP_TIPS: HelpTip[] = [
  {
    title: "How do I move letters?",
    body: "Tap any letter to activate it, then drag it into position to form your word.",
    mediaSrc: "/drag%20and%20reorder.gif",
  },
  {
    title: "How do I use the double letter tile?",
    body: "Tap the double letter tile to bring up your choices, then select the letter you want. Changed your mind? Just tap it again to swap it out.",
    mediaSrc: "/multiletter.gif",
  },
  {
    title: "Can I shuffle my letters?",
    body: "Use Shuffle to quickly rearrange your available letters while you hunt for a stronger word. You can still drag letters after shuffling.",
  },
  {
    title: "How does betting work?",
    body: "Each round you've got four moves:",
    actions: [
      { label: "Check", description: "stay in without betting" },
      { label: "Bet", description: "add coins to the pot" },
      { label: "Call", description: "match your opponent's bet" },
      { label: "Fold", description: "bow out of the round" },
    ],
  },
  {
    title: "How is the winner decided?",
    body: "The player with the highest scoring word wins the pot. Build smart!",
  },
];

function HelpMedia({
  src,
  label,
}: {
  src?: string;
  label?: string;
}) {
  return (
    <div className="mt-2 flex aspect-video w-full items-center justify-center rounded-md border border-dashed border-gold/45 bg-black/20 overflow-hidden">
      {src ? (
        <img
          src={src}
          alt={label ?? ""}
          className="h-full w-full object-contain"
        />
      ) : label ? (
        <span className="px-3 text-center font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-gold/75">
          {label}
        </span>
      ) : null}
    </div>
  );
}

export function RoomHelpMenuContent() {
  return (
    <div className="max-h-[min(34rem,calc(100dvh-7rem))] w-[min(21rem,calc(100vw-1.5rem))] overflow-y-auto p-3 font-body text-cream">
      <div className="mb-3">
        <div className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-gold/80">
          Game Help
        </div>
        <h2 className="mt-1 font-serif text-base font-semibold leading-none text-cream">
          Word Poker Tips
        </h2>
      </div>

      <div className="space-y-3">
        {ROOM_HELP_TIPS.map((tip) => (
          <section
            key={tip.title}
            aria-labelledby={`room-help-${tip.title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")}`}
            className="rounded-md border border-cream/10 bg-white/[0.04] p-3"
          >
            <h3
              id={`room-help-${tip.title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")}`}
              className="font-serif text-sm font-semibold leading-snug text-cream"
            >
              {tip.title}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-cream/78">
              {tip.body}
            </p>
            {tip.actions ? (
              <ul className="mt-2 space-y-1 text-xs leading-relaxed text-cream/78">
                {tip.actions.map((action) => (
                  <li key={action.label}>
                    <span className="font-semibold text-gold">
                      {action.label}
                    </span>{" "}
                    - {action.description}
                  </li>
                ))}
              </ul>
            ) : null}
            {tip.mediaSrc || tip.mediaLabel ? (
              <HelpMedia src={tip.mediaSrc} label={tip.mediaLabel} />
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
}

export function RoomHelpMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          id="tutorial-help-menu-button"
          aria-label="Open game help"
          title="Open game help"
          className="inline-grid size-9 place-items-center rounded-full border border-gold/55 bg-felt-deep/90 text-gold shadow-[0_10px_26px_rgba(0,0,0,0.38)] backdrop-blur transition-colors hover:border-gold hover:bg-felt-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-felt-deep"
        >
          <CircleHelp className="size-5" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="bottom"
        sideOffset={10}
        className="border-cream/10 bg-[#0b140d]/95 p-0 text-cream shadow-[0_18px_44px_rgba(0,0,0,0.5)] backdrop-blur-md"
      >
        <RoomHelpMenuContent />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
