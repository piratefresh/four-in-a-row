import { Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { toast } from 'sonner'

type AuthMode = 'login' | 'register'

export function AuthForm({ mode }: { mode: AuthMode }) {
  const navigate = useNavigate()
  const { data: session, isPending } = authClient.useSession()
  const isRegister = mode === 'register'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-900" />
      </div>
    )
  }

  if (session?.user) {
    return (
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-800/70 p-6">
        <h1 className="text-xl font-semibold text-white">You are signed in</h1>
        <p className="mt-2 text-sm text-slate-300">{session.user.email}</p>
        <button
          type="button"
          className="mt-6 w-full rounded-md bg-cyan-500 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600"
          onClick={() => navigate({ to: '/' })}
        >
          Go to home
        </button>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isRegister) {
        const result = await authClient.signUp.email({ email, password, name })
        if (result.error) {
          setError(result.error.message || 'Registration failed')
          return
        }
        toast.success(
          `Verification email sent to ${email}. Please verify before signing in.`,
        )
        setPassword('')
        return
      } else {
        const result = await authClient.signIn.email({ email, password })
        if (result.error) {
          setError(result.error.message || 'Login failed')
          return
        }
      }
      navigate({ to: '/' })
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-800/70 p-6">
      <h1 className="text-2xl font-bold text-white">
        {isRegister ? 'Create account' : 'Sign in'}
      </h1>
      <p className="mt-1 text-sm text-slate-300">
        {isRegister
          ? 'Register to start joining rooms'
          : 'Sign in to join and create rooms'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {isRegister && (
          <div>
            <label htmlFor="name" className="mb-1 block text-sm text-slate-200">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
            />
          </div>
        )}

        <div>
          <label htmlFor="email" className="mb-1 block text-sm text-slate-200">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1 block text-sm text-slate-200"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
          />
        </div>

        {error && (
          <p className="rounded-md border border-rose-700 bg-rose-900/30 px-3 py-2 text-sm text-rose-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-cyan-500 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-60"
        >
          {loading
            ? 'Please wait...'
            : isRegister
              ? 'Create account'
              : 'Sign in'}
        </button>
      </form>

      <p className="mt-4 text-sm text-slate-300">
        {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
        <Link
          to={isRegister ? '/login' : '/register'}
          className="font-medium text-cyan-300 hover:text-cyan-200"
        >
          {isRegister ? 'Sign in' : 'Register'}
        </Link>
      </p>
    </div>
  )
}
