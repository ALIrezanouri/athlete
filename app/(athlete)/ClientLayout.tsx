"use client"

import { usePathname } from "next/navigation"
import { BottomTabNav } from "@/components/layout/bottom-tab-nav"
import { TopProgressBar } from "@/components/layout/top-progress-bar"
import { PageErrorBoundary } from "@/components/layout/page-error-boundary"

/**
 * Client component wrapper for the (athlete) route group layout.
 * Extracted from layout.tsx to allow the layout itself to remain a Server Component.
 *
 * Client-side responsibilities:
 * - usePathname() hook for conditional bottom nav visibility
 * - Rendering client-only UI components (TopProgressBar, BottomTabNav, PageErrorBoundary)
 */
export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isOnboarding = pathname === "/onboarding"
  // Hide bottom nav on detail/sub-pages for immersive experience
  const hideBottomNav = isOnboarding || /^\/gyms\/[^/]+$/.test(pathname) || pathname === "/referral" || pathname === "/wallet"

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <TopProgressBar />
      <main className={`flex-1 ${hideBottomNav ? "" : "pb-20"}`}>
        <PageErrorBoundary>{children}</PageErrorBoundary>
      </main>
      {!hideBottomNav && <BottomTabNav />}
    </div>
  )
}
