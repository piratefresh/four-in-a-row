import { createFileRoute } from '@tanstack/react-router'
import { AuthForm } from '@/components/AuthForm'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 px-6 py-12">
      <div className="mx-auto flex max-w-4xl items-center justify-center">
        <AuthForm mode="login" />
      </div>
    </div>
  )
}
