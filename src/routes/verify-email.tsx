import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { AlertTriangle, CheckCircle2, Home, LogIn, Mail } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/verify-email")({
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { error?: string };
  const { data: session } = authClient.useSession();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const errorFromServer = search.error;
  const isVerified = session?.user?.emailVerified === true;

  const handleResend = async () => {
    if (!session?.user?.email) return;
    setSending(true);
    try {
      const result = await authClient.sendVerificationEmail({
        email: session.user.email,
        callbackURL: "/verify-email",
      });
      if (result.error) {
        toast.error(result.error.message || "Failed to send verification email");
      } else {
        toast.success("Verification email sent! Check your inbox.");
        setSent(true);
      }
    } catch {
      toast.error("Failed to send verification email");
    } finally {
      setSending(false);
    }
  };

  if (errorFromServer) {
    return (
      <VerifyEmailShell>
        <VerifyEmailCard
          icon={<AlertTriangle className="size-6" strokeWidth={2.25} />}
          title="Verification failed"
          badge="Link expired"
        >
          <p className="mt-2 text-sm leading-6 text-game-red">
            The verification link is invalid or has expired. Please request a new one.
          </p>
          <ResendButton onClick={handleResend} sending={sending} sent={sent} />
          <AuthLink to="/login" icon={<LogIn className="size-3.5" />}>
            Go to login
          </AuthLink>
        </VerifyEmailCard>
      </VerifyEmailShell>
    );
  }

  if (isVerified) {
    return (
      <VerifyEmailShell>
        <VerifyEmailCard
          icon={<CheckCircle2 className="size-6" strokeWidth={2.25} />}
          title="Email verified!"
          badge="Ready to play"
        >
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            Your email has been verified. You now have full access to all features.
          </p>
          <button
            type="button"
            onClick={() => navigate({ to: "/" })}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-felt px-4 py-3 font-semibold text-cream transition-colors hover:bg-felt-light"
          >
            <Home className="size-4" aria-hidden />
            Go to home
          </button>
        </VerifyEmailCard>
      </VerifyEmailShell>
    );
  }

  return (
    <VerifyEmailShell>
      <VerifyEmailCard
        icon={<Mail className="size-6" strokeWidth={2.25} />}
        title="Verify your email"
        badge="Check your inbox"
      >
        {session?.user ? (
          <>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              We sent a verification email to{" "}
              <span className="font-semibold text-ink">{session.user.email}</span>.
              Check your inbox and click the link to verify.
            </p>
            <ResendButton onClick={handleResend} sending={sending} sent={sent} />
          </>
        ) : (
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            Please sign in to resend a verification email.
          </p>
        )}
        <AuthLink to="/login" icon={<LogIn className="size-3.5" />}>
          Go to login
        </AuthLink>
      </VerifyEmailCard>
    </VerifyEmailShell>
  );
}

function VerifyEmailShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-[calc(100vh-72px)] items-center justify-center overflow-hidden bg-cream px-8 py-12 text-ink">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,#d4a54a_0%,transparent_35%)] opacity-[0.06]"
      />
      <div className="relative z-10 mx-auto flex w-full max-w-4xl items-center justify-center">
        {children}
      </div>
    </main>
  );
}

function VerifyEmailCard({
  icon,
  title,
  badge,
  children,
}: {
  icon: ReactNode;
  title: string;
  badge: string;
  children: ReactNode;
}) {
  return (
    <section className="w-full max-w-md rounded-2xl bg-paper p-8 text-center shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)]">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-felt text-cream">
        {icon}
      </div>
      <h1 className="mt-4 font-display text-[22px] font-extrabold leading-tight text-ink">
        {title}
      </h1>
      <div className="mt-3 inline-flex rounded-full bg-felt px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-widest text-white">
        {badge}
      </div>
      {children}
    </section>
  );
}

function ResendButton({
  onClick,
  sending,
  sent,
}: {
  onClick: () => void;
  sending: boolean;
  sent: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={sending || sent}
      className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-felt px-4 py-3 font-semibold text-cream transition-colors hover:bg-felt-light disabled:opacity-60"
    >
      <Mail className="size-4" aria-hidden />
      {sending ? "Sending..." : sent ? "Email sent" : "Resend verification email"}
    </button>
  );
}

function AuthLink({
  to,
  icon,
  children,
}: {
  to: "/login";
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <p className="mt-4 text-sm text-game-muted">
      <Link
        to={to}
        className="inline-flex items-center justify-center gap-1.5 font-semibold text-felt hover:underline"
      >
        {icon}
        {children}
      </Link>
    </p>
  );
}
