import { createFileRoute } from '@tanstack/react-router'
import { AuthForm } from '@/components/AuthForm'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  return (
    <main className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-[#252525] px-8 py-12 text-white">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-center">
        <AuthForm mode="login" />
      </div>
    </main>
  )
}
