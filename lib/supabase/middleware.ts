import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/** Public paths that don't require authentication */
const PUBLIC_PATHS = ['/login', '/design-system', '/global-demo']

/** Timeout wrapper — prevents auth check from blocking navigation */
function withTimeout<T>(
  promise: Promise<T>,
  ms: number = 5000
): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), ms)
    ),
  ])
}

export async function updateSession(request: NextRequest) {
  // Short-circuit public paths BEFORE creating Supabase client
  // This avoids unnecessary JWT validation on login/design-system pages
  const isPublicPath = PUBLIC_PATHS.some(
    (path) => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(`${path}/`)
  )

  if (isPublicPath) {
    // Still need to check if authenticated user hits login → redirect to home
    // But we can skip this for design-system and global-demo (truly public)
    const isLogin = request.nextUrl.pathname === '/login' || request.nextUrl.pathname.startsWith('/login/')
    if (!isLogin) {
      return NextResponse.next({ request })
    }
  }

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
        detectSessionInUrl: false,
      },
    }
  )

  // Validate session — getUser() validates JWT locally without fetching JWKs
  // Wrapped in timeout so navigation isn't blocked when Supabase is slow/down
  const { data: { user } } = await withTimeout(
    supabase.auth.getUser(),
    3000
  ) ?? { data: { user: null } }

  // Check onboarding status from JWT app_metadata
  // Use !== true so that undefined (missing field) also triggers onboarding
  const appMetadata = user?.app_metadata as Record<string, unknown> | undefined
  const needsOnboarding = appMetadata?.onboarding_completed !== true

  if (!user && !isPublicPath) {
    // Check if session cookies exist — if so, the timeout likely caused a false negative.
    // Prefer letting the request through (false negative) over a redirect loop (false positive).
    const hasSessionCookies = request.cookies.getAll().some(
      (cookie) => cookie.name.includes('-auth-token')
    )
    if (!hasSessionCookies) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  // Redirect authenticated users away from login — to onboarding or home
  if (user && request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone()
    url.pathname = needsOnboarding ? '/onboarding' : '/home'
    return NextResponse.redirect(url)
  }

  // Redirect un-onboarded authenticated users to onboarding
  // (unless they're already on /onboarding)
  if (user && needsOnboarding && !request.nextUrl.pathname.startsWith('/onboarding')) {
    const url = request.nextUrl.clone()
    url.pathname = '/onboarding'
    return NextResponse.redirect(url)
  }

  // Redirect onboarded users away from onboarding page
  if (user && !needsOnboarding && request.nextUrl.pathname.startsWith('/onboarding')) {
    const url = request.nextUrl.clone()
    url.pathname = '/home'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
