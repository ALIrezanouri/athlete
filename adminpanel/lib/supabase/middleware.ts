import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/** Public paths that don't require authentication */
const PUBLIC_PATHS = ['/login']

/** Timeout wrapper — prevents auth fetch from blocking middleware */
function withTimeout<T>(promise: Promise<T>, ms: number = 5000): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ])
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  // Validate session — getUser() validates JWT locally
  // Wrapped in 5s timeout so middleware never hangs if Supabase is down
  const userResult = await withTimeout(
    supabase.auth.getUser(),
    5000
  )

  const user = userResult?.data?.user ?? null

  const isPublicPath = PUBLIC_PATHS.some(
    (path) => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(`${path}/`)
  )

  const isDashboardRoute = request.nextUrl.pathname.startsWith('/dashboard')

  // Redirect unauthenticated users to login (except public paths)
  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from login to dashboard
  // BUT: if there's an error query param, let them stay on login
  // (e.g. access_denied means their role isn't allowed in the dashboard)
  if (user && request.nextUrl.pathname.startsWith('/login') && !request.nextUrl.searchParams.has('error')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}