'use client'

import { useState, useEffect } from 'react'
import { signInWithEmail, signOut } from '@/app/actions/auth'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, Lock, LogIn, AlertCircle, Loader2, LogOut } from 'lucide-react'

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: 'شما دسترسی به پنل مدیریت ندارید. لطفاً با حساب کاربری مجاز وارد شوید.',
  no_profile: 'حساب کاربری یافت نشد. لطفاً با حساب دیگری وارد شوید.',
}

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlError = searchParams.get('error')

  useEffect(() => {
    if (urlError && ERROR_MESSAGES[urlError]) {
      setError(ERROR_MESSAGES[urlError])
    }
  }, [urlError])

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await signOut()
      // signOut() redirects to /login, so we just need to clear the error
      setError('')
    } catch {
      setError('خطا در خروج از حساب')
      setSigningOut(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signInWithEmail(email, password)

      if (result.error) {
        setError(result.error)
        return
      }

      if (result.success) {
        router.push('/dashboard')
      }
    } catch {
      setError('خطا در اتصال به سرور')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <LogIn className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">پنل مدیریت رویداد فیت</h1>
          <p className="text-muted-foreground mt-2">برای ورود ایمیل و رمز عبور خود را وارد کنید</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
              {/* Show sign-out button when error comes from URL (user is authenticated but unauthorized) */}
              {urlError && (
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="mt-2 w-full py-2 bg-destructive/20 text-destructive rounded-lg font-medium transition-all hover:bg-destructive/30 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {signingOut ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>در حال خروج...</span>
                    </>
                  ) : (
                    <>
                      <LogOut className="w-4 h-4" />
                      <span>خروج از حساب و ورود با حساب دیگر</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Email Field */}
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              ایمیل
            </label>
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@rokhdad.fit"
                required
                dir="ltr"
                className="w-full pr-10 pl-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              رمز عبور
            </label>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                dir="ltr"
                className="w-full pr-10 pl-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>در حال ورود...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>ورود</span>
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          پنل مدیریت رویداد فیت — نسخه ۱.۰
        </p>
      </div>
    </div>
  )
}