import { createFileRoute } from "@tanstack/react-router";
import { WordTile } from "@/components/rooms/table/WordTile";

export const Route = createFileRoute("/dev/tile-showcase")({
  component: TileShowcase,
  ssr: false,
});

function TileShowcase() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-8 text-white">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-8 text-4xl font-bold">Word Tile Showcase</h1>

        {/* Sizes */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold">Sizes</h2>
          <div className="flex flex-wrap items-end gap-4 rounded-lg bg-white/5 p-6">
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm text-gray-400">xs</span>
              <WordTile letter="A" baseValue={1} size="xs" />
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm text-gray-400">sm</span>
              <WordTile letter="B" baseValue={3} size="sm" />
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm text-gray-400">md</span>
              <WordTile letter="C" baseValue={3} size="md" />
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm text-gray-400">lg</span>
              <WordTile letter="D" baseValue={2} size="lg" />
            </div>
          </div>
        </section>

        {/* Variants */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold">Variants</h2>
          <div className="flex flex-wrap items-start gap-6 rounded-lg bg-white/5 p-6">
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm text-gray-400">default</span>
              <WordTile letter="T" baseValue={1} variant="default" size="lg" />
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm text-gray-400">community</span>
              <WordTile letter="R" baseValue={1} variant="community" size="lg" />
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm text-gray-400">hidden</span>
              <WordTile variant="hidden" size="lg" />
            </div>
          </div>
        </section>

        {/* Multipliers */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold">Multipliers</h2>
          <div className="flex flex-wrap items-start gap-6 rounded-lg bg-white/5 p-6">
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm text-gray-400">2x (default)</span>
              <div className="flex flex-col items-center gap-1">
                <div className="text-[9px] font-bold leading-none text-white/80 sm:text-xs">
                  2x
                </div>
                <WordTile
                  letter="E"
                  baseValue={1}
                  multiplier="2L"
                  variant="default"
                  size="lg"
                />
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm text-gray-400">3x (default)</span>
              <div className="flex flex-col items-center gap-1">
                <div className="text-[9px] font-bold leading-none text-white/80 sm:text-xs">
                  3x
                </div>
                <WordTile
                  letter="S"
                  baseValue={1}
                  multiplier="3L"
                  variant="default"
                  size="lg"
                />
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm text-gray-400">2x (community)</span>
              <div className="flex flex-col items-center gap-1">
                <div className="text-[9px] font-bold leading-none text-white/80 sm:text-xs">
                  2x
                </div>
                <WordTile
                  letter="O"
                  baseValue={1}
                  multiplier="2L"
                  variant="community"
                  size="lg"
                />
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm text-gray-400">3x (community)</span>
              <div className="flex flex-col items-center gap-1">
                <div className="text-[9px] font-bold leading-none text-white/80 sm:text-xs">
                  3x
                </div>
                <WordTile
                  letter="N"
                  baseValue={1}
                  multiplier="3L"
                  variant="community"
                  size="lg"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Choice Cards */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold">Choice Cards</h2>
          <div className="flex flex-wrap items-start gap-6 rounded-lg bg-white/5 p-6">
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm text-gray-400">Unselected</span>
              <WordTile
                letters={["A", "E", "I"]}
                baseValues={[1, 1, 1]}
                isChoice
                variant="default"
                size="lg"
              />
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm text-gray-400">Selected (A)</span>
              <WordTile
                letters={["A", "E", "I"]}
                baseValues={[1, 1, 1]}
                isChoice
                selectedLetter="A"
                variant="default"
                size="lg"
              />
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm text-gray-400">Choice (community)</span>
              <WordTile
                letters={["Q", "U"]}
                baseValues={[10, 1]}
                isChoice
                variant="community"
                size="lg"
              />
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm text-gray-400">Choice + 2x</span>
              <div className="flex flex-col items-center gap-1">
                <div className="text-[9px] font-bold leading-none text-white/80 sm:text-xs">
                  2x
                </div>
                <WordTile
                  letters={["T", "H"]}
                  baseValues={[1, 4]}
                  isChoice
                  multiplier="2L"
                  variant="default"
                  size="lg"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Disabled State */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold">Disabled State</h2>
          <div className="flex flex-wrap items-start gap-6 rounded-lg bg-white/5 p-6">
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm text-gray-400">Disabled</span>
              <WordTile
                letter="X"
                baseValue={8}
                disabled
                variant="default"
                size="lg"
              />
            </div>
          </div>
        </section>

        {/* Complete Example Word */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold">Example Word: "QUEST"</h2>
          <div className="flex flex-col items-center gap-6 rounded-lg bg-white/5 p-6">
            <div className="flex items-start gap-2">
              <div className="flex flex-col items-center gap-1">
                <div className="text-[9px] leading-none opacity-0 sm:text-xs">-</div>
                <WordTile letter="Q" baseValue={10} variant="default" size="lg" />
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="text-[9px] leading-none opacity-0 sm:text-xs">-</div>
                <WordTile letter="U" baseValue={1} variant="community" size="lg" />
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="text-[9px] font-bold leading-none text-white/80 sm:text-xs">
                  2x
                </div>
                <WordTile
                  letter="E"
                  baseValue={1}
                  multiplier="2L"
                  variant="default"
                  size="lg"
                />
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="text-[9px] font-bold leading-none text-white/80 sm:text-xs">
                  3x
                </div>
                <WordTile
                  letter="S"
                  baseValue={1}
                  multiplier="3L"
                  variant="community"
                  size="lg"
                />
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="text-[9px] leading-none opacity-0 sm:text-xs">-</div>
                <WordTile letter="T" baseValue={1} variant="default" size="lg" />
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold tracking-wider">QUEST</div>
              <div className="mt-2 text-xl text-yellow-400">
                Score: 10 + 1 + (1×2) + (1×3) + 1 = 18 points
              </div>
            </div>
          </div>
        </section>

        {/* Value Display States */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold">Value Display</h2>
          <div className="flex flex-wrap items-start gap-6 rounded-lg bg-white/5 p-6">
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm text-gray-400">With value</span>
              <WordTile
                letter="K"
                baseValue={5}
                showValue={true}
                variant="default"
                size="lg"
              />
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm text-gray-400">Without value</span>
              <WordTile
                letter="K"
                baseValue={5}
                showValue={false}
                variant="default"
                size="lg"
              />
            </div>
          </div>
        </section>

        {/* All Letters */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold">Complete Alphabet</h2>
          <div className="flex flex-wrap gap-3 rounded-lg bg-white/5 p-6">
            {[
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
            ].map(({ letter, value }) => (
              <WordTile
                key={letter}
                letter={letter}
                baseValue={value}
                variant="default"
                size="md"
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
