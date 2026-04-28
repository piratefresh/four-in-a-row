import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/AuthForm";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

function RegisterPage() {
  return (
    <main className="relative flex min-h-[calc(100vh-72px)] items-center justify-center overflow-hidden bg-[#f6efe0] px-8 py-12 text-[#111511]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,#d4a54a_0%,transparent_35%)] opacity-[0.06]"
      />
      <div className="relative z-10 mx-auto flex w-full max-w-4xl items-center justify-center">
        <AuthForm mode="register" />
      </div>
    </main>
  );
}
