import { Spinner } from "@/components/ui/spinner";

type OnboardingSetupStage = "auth" | "room" | "bots" | "deal";

const STEP_ORDER: OnboardingSetupStage[] = ["auth", "room", "bots", "deal"];

const STEP_COPY: Record<
  OnboardingSetupStage,
  { label: string; detail: string }
> = {
  auth: {
    label: "Linking your player profile",
    detail: "Making sure your fresh account is ready for a live table.",
  },
  room: {
    label: "Opening your starter table",
    detail: "Creating a private room for your first learning game.",
  },
  bots: {
    label: "Seating beginner bots",
    detail: "Dropping in a soft table so the first hand stays approachable.",
  },
  deal: {
    label: "Dealing the first hand",
    detail: "Starting the game and getting the tutorial ready.",
  },
};

export function OnboardingSetupScreen({
  stage,
}: {
  stage: OnboardingSetupStage;
}) {
  const activeIndex = STEP_ORDER.indexOf(stage);

  return (
    <main className="relative flex min-h-[calc(100vh-72px)] overflow-hidden bg-[#07120f] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(214,171,76,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(18,95,71,0.28),transparent_36%),linear-gradient(165deg,#0b1712_0%,#060907_45%,#020303_100%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f4d27a]/70 to-transparent" />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-10 px-6 py-12 sm:px-10 lg:flex-row lg:items-center lg:gap-16">
        <section className="max-w-xl">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-black/20 px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-[#d5b35f]">
            First Table Setup
          </div>
          <h1 className="mt-6 font-serif text-4xl tracking-tight text-[#fbf5e8] sm:text-5xl">
            Setting up your first bot game.
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-6 text-[#d4d0c5] sm:text-base">
            The app is creating a beginner-friendly table and preparing a short
            guided walkthrough so the first hand teaches the basics instead of
            throwing you straight into the deep end.
          </p>

          <div className="mt-8 flex items-center gap-4 rounded-[1.75rem] border border-white/10 bg-black/20 px-5 py-4 shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
            <Spinner size="lg" className="text-[#f3deb0]" />
            <div>
              <div className="text-sm font-semibold text-[#fcf7ea]">
                {STEP_COPY[stage].label}
              </div>
              <div className="mt-1 text-sm text-[#c9c2b4]">
                {STEP_COPY[stage].detail}
              </div>
            </div>
          </div>
        </section>

        <section className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(49,28,12,0.88),rgba(11,10,8,0.94))] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.4)] sm:p-6">
          <div className="text-[11px] uppercase tracking-[0.28em] text-[#f2a165]">
            Progress
          </div>
          <div className="mt-5 space-y-4">
            {STEP_ORDER.map((step, index) => {
              const isComplete = index < activeIndex;
              const isActive = index === activeIndex;

              return (
                <div
                  key={step}
                  className={`rounded-2xl border px-4 py-4 transition-colors ${
                    isActive
                      ? "border-[#f2a165]/45 bg-[#3a2314]/70"
                      : isComplete
                        ? "border-[#4a8c6a]/35 bg-[#112319]/70"
                        : "border-white/8 bg-black/20"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                        isActive
                          ? "bg-[#f2a165] text-[#2b1708]"
                          : isComplete
                            ? "bg-[#2d6a4f] text-white"
                            : "bg-white/10 text-[#b8b19a]"
                      }`}
                    >
                      {isComplete ? "OK" : index + 1}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#fbf5e8]">
                        {STEP_COPY[step].label}
                      </div>
                      <div className="mt-1 text-sm text-[#c9c2b4]">
                        {STEP_COPY[step].detail}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
