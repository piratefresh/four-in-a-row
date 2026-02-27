import { createFileRoute } from '@tanstack/react-router'
import { AuthForm } from '@/components/AuthForm'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  return (
    <main className="relative flex min-h-[calc(100vh-72px)] items-center justify-center overflow-hidden bg-[#252525] px-8 py-12 text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,#114D28_0%,#114D28_30%,#252525_72%)] opacity-45"
      />
      <div className="relative z-10 mx-auto flex w-full max-w-4xl items-center justify-center">
        <AuthForm mode="login" />
      </div>
    </main>
  )
}
