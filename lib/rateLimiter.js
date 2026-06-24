const MIN_DELAY_MS = 350

export function fixedDelay(ms = MIN_DELAY_MS) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function withBackoff(fn, opts = {}) {
  const maxAttempts = opts.maxAttempts ?? 4
  const baseDelayMs = opts.baseDelayMs ?? 1000
  const label       = opts.label || 'eBay call'

  let lastErr = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fn()

      if (res.ok) return res

      const retryableStatus = [429, 500, 502, 503, 504].includes(res.status)

      if (!retryableStatus || attempt === maxAttempts) {
        return res
      }

      const delay = baseDelayMs * Math.pow(2, attempt - 1)
      console.warn(`[RateLimiter] ${label} returned ${res.status} — retry ${attempt}/${maxAttempts} in ${delay}ms`)
      await fixedDelay(delay)

    } catch (err) {
      lastErr = err
      if (attempt === maxAttempts) throw err

      const delay = baseDelayMs * Math.pow(2, attempt - 1)
      console.warn(`[RateLimiter] ${label} threw "${err.message}" — retry ${attempt}/${maxAttempts} in ${delay}ms`)
      await fixedDelay(delay)
    }
  }

  if (lastErr) throw lastErr
}
