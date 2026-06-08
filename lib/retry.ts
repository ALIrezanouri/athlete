export interface RetryOptions {
  maxRetries?: number;    // default: 2
  baseDelayMs?: number;   // default: 500
  maxDelayMs?: number;    // default: 5000
  label?: string;         // for logging, default: 'query'
}

/**
 * Detects whether a Supabase error is transient (worth retrying).
 * Non-transient errors (auth, validation, not-found) are returned immediately.
 */
function isTransientError(error: any): boolean {
  const msg = (error?.message || '').toLowerCase()
  const code = error?.code || ''
  return (
    msg.includes('econnreset') ||
    msg.includes('econnrefused') ||
    msg.includes('failed to fetch') ||
    msg.includes('fetch failed') ||
    msg.includes('timeout') ||
    msg.includes('network') ||
    msg.includes('database connection error') ||
    msg.includes('connection') ||
    code === 'ECONNRESET' ||
    code === 'ECONNREFUSED' ||
    code === 'PGRST000'
  )
}

/**
 * Retry a Supabase query with exponential backoff.
 * Only retries on transient errors (ECONNRESET, ECONNREFUSED, fetch failed, timeout, network, database connection error).
 * Returns the full Supabase response — same shape as the original query, no signature changes needed.
 */
export async function withRetry<T>(
  fn: () => PromiseLike<T>,
  options?: RetryOptions
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 2
  const baseDelayMs = options?.baseDelayMs ?? 500
  const maxDelayMs = options?.maxDelayMs ?? 5000
  const label = options?.label ?? 'query'

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await fn() as any

    // Success — return immediately
    if (!result.error) {
      return result
    }

    // Non-transient error — don't retry
    if (!isTransientError(result.error)) {
      return result
    }

    // Transient error but no retries remaining — return as-is
    if (attempt >= maxRetries) {
      return result
    }

    // Calculate exponential backoff with jitter
    const delay = Math.min(
      baseDelayMs * Math.pow(2, attempt) + Math.random() * baseDelayMs,
      maxDelayMs
    )

    console.warn(
      `[RETRY] ${label} attempt ${attempt + 1}/${maxRetries}: ${result.error.message || result.error}`
    )

    await new Promise((resolve) => setTimeout(resolve, delay))
  }

  // Should never reach here, but satisfy TypeScript
  return null as unknown as T
}
