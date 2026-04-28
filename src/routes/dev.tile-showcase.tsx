import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { WordTile as WordTileV1 } from "@/components/rooms/table/WordTile";
import { WordTile as WordTileV2 } from "@/components/rooms/table/word-tile-v2";

export const Route = createFileRoute("/dev/tile-showcase")({
  component: TileShowcase,
  ssr: false,
});

const alphabet = [
  { letter: "A", value: 1 },
  { letter: "B", value: 3 },
  { letter: "C", value: 3 },
  { letter: "D", value: 2 },
  { letter: "E", value: 1 },
  { letter: "F", value: 4 },
  { letter: "G", value: 2 },
  { letter: "H", value: 4 },
  { letter: "I", value: 1 },
  { letter: "J", value: 8 },
  { letter: "K", value: 5 },
  { letter: "L", value: 1 },
  { letter: "M", value: 3 },
  { letter: "N", value: 1 },
  { letter: "O", value: 1 },
  { letter: "P", value: 3 },
  { letter: "Q", value: 10 },
  { letter: "R", value: 1 },
  { letter: "S", value: 1 },
  { letter: "T", value: 1 },
  { letter: "U", value: 1 },
  { letter: "V", value: 4 },
  { letter: "W", value: 4 },
  { letter: "X", value: 8 },
  { letter: "Y", value: 4 },
  { letter: "Z", value: 10 },
];

function ShowcaseSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 shadow-2xl shadow-black/20 sm:p-6 xl:p-8">
      <div className="mb-5 flex flex-col gap-1 sm:mb-6">
        <h2 className="font-display text-2xl font-extrabold tracking-tight text-cream sm:text-3xl">
          {title}
        </h2>
        {description ? <p className="max-w-3xl text-sm leading-6 text-cream/65">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function TileCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center gap-4 rounded-xl border border-white/10 bg-black/20 p-5">
      <div className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-gold">
        {label}
      </div>
      <div className="flex min-h-36 items-center justify-center">{children}</div>
    </div>
  );
}

function ComparisonCard({ label, v1, v2 }: { label: string; v1: ReactNode; v2: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="mb-4 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-gold">
        {label}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex min-h-44 flex-col items-center justify-center gap-3 rounded-lg bg-white/[0.04] p-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-cream/45">v1</span>
          {v1}
        </div>
        <div className="flex min-h-44 flex-col items-center justify-center gap-3 rounded-lg bg-felt-deep/60 p-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-cream/45">v2</span>
          {v2}
        </div>
      </div>
    </div>
  );
}

function MultiplierLabel({ value }: { value?: "2L" | "3L" }) {
  return (
    <div className={`font-mono text-[10px] font-bold leading-none text-cream/70 ${value ? "" : "opacity-0"}`}>
      {value === "2L" ? "2x" : value === "3L" ? "3x" : "-"}
    </div>
  );
}

function TileWithMultiplier({ children, multiplier }: { children: ReactNode; multiplier?: "2L" | "3L" }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <MultiplierLabel value={multiplier} />
      {children}
    </div>
  );
}

function TileShowcase() {
  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_50%_0%,rgba(20,82,63,0.9),#072419_45%,#030806_100%)] px-4 py-6 text-cream sm:px-8 lg:px-12 xl:px-16">
      <div className="mx-auto flex max-w-[1800px] flex-col gap-8">
        <header className="rounded-3xl border border-gold/25 bg-black/20 p-6 shadow-2xl shadow-black/25 sm:p-8 xl:p-10">
          <div className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-gold">
            Dev endpoint
          </div>
          <h1 className="mt-3 font-display text-4xl font-black tracking-tight text-cream sm:text-6xl xl:text-7xl">
            Word Tile Showcase
          </h1>
          <p className="mt-4 max-w-4xl text-base leading-7 text-cream/70 sm:text-lg">
            V2 is an additive redesign inspired by the WordPoker UX flow: cream paper tiles, Fraunces letters, mono value marks, dashed empty slots, fresh gold tiles, and responsive large-screen comparisons.
          </p>
        </header>

        <ShowcaseSection title="V1 vs V2" description="Same scenarios side by side so the new tile language is visible on desktop and wide screens.">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-4">
            <ComparisonCard
              label="Default tile"
              v1={<WordTileV1 letter="A" baseValue={1} size="lg" />}
              v2={<WordTileV2 letter="A" baseValue={1} size="lg" />}
            />
            <ComparisonCard
              label="Community tile"
              v1={<WordTileV1 letter="S" baseValue={1} variant="community" size="lg" />}
              v2={<WordTileV2 letter="S" baseValue={1} variant="community" size="lg" />}
            />
            <ComparisonCard
              label="Empty slot"
              v1={<WordTileV1 variant="hidden" size="lg" />}
              v2={<WordTileV2 variant="empty" size="lg" />}
            />
            <ComparisonCard
              label="Choice tile"
              v1={<WordTileV1 letters={["A", "E", "I"]} baseValues={[1, 1, 1]} isChoice size="lg" />}
              v2={<WordTileV2 letters={["A", "E", "I"]} baseValues={[1, 1, 1]} isChoice size="lg" />}
            />
          </div>
        </ShowcaseSection>

        <ShowcaseSection title="V2 Key States" description="New states from the UX flow doc: empty slots are dashed, fresh community cards turn gold, and dragging cards lift off the table.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <TileCard label="default"><WordTileV2 letter="T" baseValue={1} size="lg" /></TileCard>
            <TileCard label="new / fresh"><WordTileV2 letter="N" baseValue={1} isNew size="lg" /></TileCard>
            <TileCard label="dragging"><WordTileV2 letter="R" baseValue={1} isDragging size="lg" /></TileCard>
            <TileCard label="empty"><WordTileV2 variant="empty" size="lg" /></TileCard>
          </div>
        </ShowcaseSection>

        <ShowcaseSection title="V2 Sizes" description="The larger sizes intentionally scale up on big screens so the new tile form remains readable in the showcase.">
          <div className="flex flex-wrap items-end justify-center gap-5 rounded-xl bg-black/20 p-5 sm:gap-8 xl:gap-12 xl:p-8">
            {(["xs", "sm", "md", "lg"] as const).map((size, index) => (
              <div key={size} className="flex flex-col items-center gap-3">
                <span className="font-mono text-xs uppercase tracking-[0.16em] text-cream/50">{size}</span>
                <WordTileV2 letter={["A", "B", "C", "D"][index]} baseValue={[1, 3, 3, 2][index]} size={size} />
              </div>
            ))}
          </div>
        </ShowcaseSection>

        <ShowcaseSection title="V2 Value Placement" description="Values are inline by default on every size. Set inlineValue={false} to use the compact below-tile metadata slot.">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <TileCard label="inline values (default)">
              <div className="flex flex-wrap items-end justify-center gap-4">
                {(["xs", "sm", "md", "lg"] as const).map((size) => (
                  <WordTileV2 key={size} letter="K" baseValue={5} size={size} />
                ))}
              </div>
            </TileCard>
            <TileCard label="inlineValue false">
              <div className="flex flex-wrap items-end justify-center gap-4">
                {(["xs", "sm", "md", "lg"] as const).map((size) => (
                  <WordTileV2 key={size} letter="K" baseValue={5} size={size} inlineValue={false} />
                ))}
              </div>
            </TileCard>
          </div>
        </ShowcaseSection>

        <ShowcaseSection title="V2 Variants">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <TileCard label="default"><WordTileV2 letter="P" baseValue={3} variant="default" size="lg" /></TileCard>
            <TileCard label="community"><WordTileV2 letter="O" baseValue={1} variant="community" size="lg" /></TileCard>
            <TileCard label="community + new"><WordTileV2 letter="G" baseValue={2} variant="community" isNew size="lg" /></TileCard>
            <TileCard label="empty"><WordTileV2 variant="empty" size="lg" /></TileCard>
          </div>
        </ShowcaseSection>

        <ShowcaseSection title="V2 Multipliers">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <TileCard label="2x default">
              <TileWithMultiplier multiplier="2L"><WordTileV2 letter="E" baseValue={1} multiplier="2L" size="lg" /></TileWithMultiplier>
            </TileCard>
            <TileCard label="3x default">
              <TileWithMultiplier multiplier="3L"><WordTileV2 letter="S" baseValue={1} multiplier="3L" size="lg" /></TileWithMultiplier>
            </TileCard>
            <TileCard label="2x community">
              <TileWithMultiplier multiplier="2L"><WordTileV2 letter="L" baseValue={1} multiplier="2L" variant="community" size="lg" /></TileWithMultiplier>
            </TileCard>
            <TileCard label="3x new">
              <TileWithMultiplier multiplier="3L"><WordTileV2 letter="G" baseValue={2} multiplier="3L" isNew size="lg" /></TileWithMultiplier>
            </TileCard>
          </div>
        </ShowcaseSection>

        <ShowcaseSection title="V2 Choice Cards">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <TileCard label="unselected"><WordTileV2 letters={["A", "E", "I"]} baseValues={[1, 1, 1]} isChoice size="lg" /></TileCard>
            <TileCard label="selected"><WordTileV2 letters={["A", "E", "I"]} baseValues={[1, 1, 1]} isChoice selectedLetter="E" size="lg" /></TileCard>
            <TileCard label="community choice"><WordTileV2 letters={["Q", "U"]} baseValues={[10, 1]} isChoice variant="community" size="lg" /></TileCard>
            <TileCard label="choice + 2x"><WordTileV2 letters={["T", "H"]} baseValues={[1, 4]} isChoice multiplier="2L" size="lg" /></TileCard>
          </div>
        </ShowcaseSection>

        <ShowcaseSection title="V2 Example Word">
          <div className="flex flex-col items-center gap-8 rounded-xl bg-black/20 p-6 xl:p-10">
            <div className="flex flex-wrap items-start justify-center gap-3 sm:gap-4 xl:gap-5">
              <TileWithMultiplier><WordTileV2 letter="Q" baseValue={10} size="lg" /></TileWithMultiplier>
              <TileWithMultiplier><WordTileV2 letter="U" baseValue={1} variant="community" size="lg" /></TileWithMultiplier>
              <TileWithMultiplier multiplier="2L"><WordTileV2 letter="E" baseValue={1} multiplier="2L" size="lg" /></TileWithMultiplier>
              <TileWithMultiplier multiplier="3L"><WordTileV2 letter="S" baseValue={1} multiplier="3L" variant="community" isNew size="lg" /></TileWithMultiplier>
              <TileWithMultiplier><WordTileV2 letter="T" baseValue={1} size="lg" /></TileWithMultiplier>
            </div>
            <div className="text-center">
              <div className="font-display text-4xl font-black tracking-[0.18em] text-cream sm:text-5xl">QUEST</div>
              <div className="mt-3 font-mono text-sm font-bold uppercase tracking-[0.16em] text-gold">Score preview: 18 points</div>
            </div>
          </div>
        </ShowcaseSection>

        <ShowcaseSection title="V2 Alphabet">
          <div className="grid grid-cols-4 gap-3 rounded-xl bg-black/20 p-4 sm:grid-cols-6 md:grid-cols-9 lg:grid-cols-[repeat(13,minmax(0,1fr))]">
            {alphabet.map(({ letter, value }) => (
              <div key={letter} className="flex justify-center">
                <WordTileV2 letter={letter} baseValue={value} size="md" />
              </div>
            ))}
          </div>
        </ShowcaseSection>

        <ShowcaseSection title="Original V1 Reference" description="The existing component remains here for quick regression checks while v2 adoption is opt-in.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <TileCard label="default"><WordTileV1 letter="T" baseValue={1} variant="default" size="lg" /></TileCard>
            <TileCard label="community"><WordTileV1 letter="R" baseValue={1} variant="community" size="lg" /></TileCard>
            <TileCard label="hidden"><WordTileV1 variant="hidden" size="lg" /></TileCard>
            <TileCard label="choice"><WordTileV1 letters={["A", "E", "I"]} baseValues={[1, 1, 1]} isChoice size="lg" /></TileCard>
          </div>
        </ShowcaseSection>
      </div>
    </main>
  );
}
