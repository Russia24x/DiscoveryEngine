// Shared fetch helper with timeout — so free API calls fail fast and the engine
// falls back to the bundled dataset when the network is unreachable.
export async function fetchWithTimeout(
  url: string,
  opts: RequestInit = {},
  timeoutMs = 4000
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}
