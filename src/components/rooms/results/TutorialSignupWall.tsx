import { Coins, Mail } from "lucide-react";

type TutorialSignupWallProps = {
  onCreateAccount: () => void;
  onContinueGuest: () => void;
};

export function TutorialSignupWall({
  onCreateAccount,
  onContinueGuest,
}: TutorialSignupWallProps) {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[#f6efe0] px-5 py-8 text-[#111511]">
      <section
        aria-label="Save your tutorial progress"
        className="w-full max-w-[390px] rounded-[8px] px-2 py-6 text-center"
      >
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-[#0d3b2e] text-[#f5c76a]">
          <Coins className="size-7" strokeWidth={2.25} />
        </div>

        <h1 className="mt-4 font-display text-[28px] font-extrabold leading-tight">
          Save your
          <br />
          progress
        </h1>

        <div className="mt-3 inline-flex items-center rounded-full bg-[#0d3b2e] px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#f5c76a]">
          Keep 50 tutorial coins
        </div>

        <p className="mx-auto mt-4 max-w-[310px] text-sm leading-6 text-[#4f4a3f]">
          Create an account now to save the coins you earned and claim the
          signup bonus before heading back to the main menu.
        </p>

        <div className="mt-7 space-y-3">
          <div className="rounded-[8px] border border-[#0d3b2e]/15 bg-[#0d3b2e]/8 px-4 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0d3b2e]">
            + 200 bonus coins on signup
          </div>

          <button
            type="button"
            onClick={onCreateAccount}
            className="flex w-full items-center justify-center gap-2 rounded-[8px] bg-[#111511] px-4 py-3.5 text-sm font-semibold text-[#f6efe0] transition-colors hover:bg-[#222820]"
          >
            <Mail className="size-4" strokeWidth={2.25} />
            Sign up with Email
          </button>
        </div>

        <button
          type="button"
          onClick={onContinueGuest}
          className="mt-5 text-xs font-medium text-[#8a8778] underline transition-colors hover:text-[#2a2f2a]"
        >
          Continue as guest
        </button>
      </section>
    </main>
  );
}
