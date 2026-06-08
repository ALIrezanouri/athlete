import ClientLayout from "./ClientLayout"

/**
 * Server Component layout for the (athlete) route group.
 *
 * All client-side concerns (usePathname, conditional bottom nav, progress bar,
 * error boundary) are delegated to ClientLayout.tsx, keeping this as a thin
 * server component wrapper. This allows child pages that are Server Components
 * to benefit from RSC — previously the "use client" boundary here forced all
 * 27+ child pages into client-side rendering.
 */
export default function AthleteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ClientLayout>{children}</ClientLayout>
}
