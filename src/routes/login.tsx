import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/AuthForm";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  return (
    <main className="relative flex min-h-[calc(100dvh-4rem)] flex-1 items-center justify-center overflow-hidden bg-[#f6efe0] px-8 text-[#111511]">
      <div className="relative z-10 mx-auto flex w-full max-w-4xl items-center justify-center">
        <AuthForm mode="login" />
      </div>
    </main>
  );
}
