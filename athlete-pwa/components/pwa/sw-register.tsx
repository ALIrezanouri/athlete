"use client"

import { useEffect } from "react"

/**
 * SWRegister — Registers the service worker in production builds only.
 *
 * This component renders nothing to the DOM. Place it in the root layout
 * so it runs once when the app mounts.
 *
 * - In development: SW registration is skipped (Turbopack dev server
 *   doesn't serve the SW file and HMR would conflict with caching).
 * - In production: Registers `/sw.js` from the `public/` directory.
 */
export function SWRegister() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("[SW] Registered successfully, scope:", registration.scope)
        })
        .catch((error) => {
          console.error("[SW] Registration failed:", error)
        })
    }
  }, [])

  return null
}
