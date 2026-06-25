import { MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { useMediaQuery } from "@/components/rooms/hooks/useMediaQuery";
import { authClient } from "@/lib/auth-client";
import { FeedbackForm } from "./FeedbackForm";

type FeedbackLauncherProps = {
  routePath?: string;
};

export function FeedbackLauncher({ routePath }: FeedbackLauncherProps) {
  const { data: session, isPending } = authClient.useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [hasBlockingOverlay, setHasBlockingOverlay] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)", false, {
    getInitialValueInEffect: false,
  });
  const bottomOffsetClass =
    routePath === "/"
      ? "bottom-[max(4.5rem,calc(env(safe-area-inset-bottom)+4.5rem))]"
      : "bottom-[max(1.5rem,env(safe-area-inset-bottom))]";

  useEffect(() => {
    const updateBlockingOverlayState = () => {
      setHasBlockingOverlay(
        Boolean(
          document.querySelector(
            "[data-loading-overlay='true'], [data-splash-screen='true']",
          ),
        ),
      );
    };

    updateBlockingOverlayState();

    const observer = new MutationObserver(updateBlockingOverlayState);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  if (isPending || !session?.user || hasBlockingOverlay) {
    return null;
  }

  const form = (
    <FeedbackForm
      source="launcher"
      routePath={routePath}
      onSubmitted={() => {
        window.setTimeout(() => setIsOpen(false), 900);
      }}
    />
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`fixed right-[max(1.5rem,env(safe-area-inset-right))] ${bottomOffsetClass} z-40 inline-flex items-center gap-2 rounded-full border border-gold/60 bg-felt-light px-5 py-3 font-display text-sm font-extrabold text-gold shadow-[0_16px_44px_rgba(0,0,0,0.45),0_0_20px_rgba(212,165,74,0.15)] transition-[background-color,border-color,transform] hover:border-gold-bright hover:bg-felt focus-visible:ring-[3px] focus-visible:ring-gold/35 focus-visible:outline-none active:scale-[0.98]`}
      >
        <MessageCircle className="size-4" />
        {isDesktop ? "Feedback" : null}
      </button>

      {isDesktop ? (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent
            className="max-h-[min(820px,calc(100dvh-2rem))] w-[min(1040px,calc(100vw-3rem))] max-w-none overflow-y-auto rounded-[22px] border border-gold/35 bg-[radial-gradient(circle_at_72%_0%,rgba(20,82,63,0.98),#07140f_58%)] p-10 text-cream shadow-[0_24px_90px_rgba(0,0,0,0.58)] sm:max-w-none"
            showCloseButton
          >
            <div className="max-w-[680px] space-y-2 pr-10">
              <div className="font-mono text-[10px] uppercase tracking-[0.46em] text-gold">
                Your table, your call
              </div>
              <DialogTitle className="font-display text-[42px] leading-tight font-bold text-cream">
                How are we playing?
              </DialogTitle>
              <DialogDescription className="max-w-[520px] text-lg leading-8 text-cream/72">
                A quick note from the felt helps us deal a better game. It takes
                20 seconds.
              </DialogDescription>
            </div>
            {form}
          </DialogContent>
        </Dialog>
      ) : (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetContent
            side="bottom"
            className="max-h-[88dvh] overflow-y-auto rounded-t-[24px] border-gold/35 bg-[radial-gradient(circle_at_70%_0%,rgba(20,82,63,0.98),#07140f_58%)] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 text-cream shadow-[0_-18px_70px_rgba(0,0,0,0.62)]"
          >
            <div className="mx-auto mb-1 h-1 w-11 rounded-full bg-cream/20" />
            <div className="space-y-2 pr-10">
              <div className="font-mono text-[10px] uppercase tracking-[0.38em] text-gold">
                Your table, your call
              </div>
              <SheetTitle className="font-display text-[32px] leading-tight font-bold text-cream">
                How are we playing?
              </SheetTitle>
              <SheetDescription className="text-base leading-7 text-cream/72">
                A quick note from the felt helps us deal a better game.
              </SheetDescription>
            </div>
            {form}
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}
