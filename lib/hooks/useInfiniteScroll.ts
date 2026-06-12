"use client"

import { useEffect, useRef, useCallback } from "react"

interface UseInfiniteScrollOptions {
  /** Whether more data is currently being loaded */
  loading: boolean
  /** Whether there are more items to load */
  hasMore: boolean
  /** Callback to load the next page */
  onLoadMore: () => void
  /** Root margin for intersection observer (default: "200px") */
  rootMargin?: string
  /** Threshold for intersection (default: 0.1) */
  threshold?: number
}

/**
 * Reusable infinite scroll hook using IntersectionObserver.
 * Place the returned sentinel ref at the bottom of your list.
 * When the sentinel becomes visible, onLoadMore is called.
 */
export function useInfiniteScroll({
  loading,
  hasMore,
  onLoadMore,
  rootMargin = "200px",
  threshold = 0.1,
}: UseInfiniteScrollOptions) {
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const onLoadMoreRef = useRef(onLoadMore)

  // Keep callback ref up to date
  useEffect(() => {
    onLoadMoreRef.current = onLoadMore
  }, [onLoadMore])

  const disconnect = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect()
      observerRef.current = null
    }
  }, [])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    disconnect()

    if (!hasMore || loading) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting && !loading && hasMore) {
          onLoadMoreRef.current()
        }
      },
      { rootMargin, threshold }
    )

    observerRef.current.observe(sentinel)

    return disconnect
  }, [hasMore, loading, disconnect, rootMargin, threshold])

  return { sentinelRef }
}
