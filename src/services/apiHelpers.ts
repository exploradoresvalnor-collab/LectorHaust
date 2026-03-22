/**
 * Shared HTTP helpers for secondary APIs (AniList, Jikan, Kitsu, Consumet).
 * MangaDex uses its own apiFetch with rate-limiting and retries — DO NOT replace it.
 */

/**
 * GET request with JSON parsing, error handling, and configurable timeout.
 */
export async function fetchJSON<T = any>(url: string, options?: RequestInit & { timeoutMs?: number }): Promise<T> {
  const { timeoutMs = 12000, ...fetchOptions } = options || {};
  
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      ...fetchOptions,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${url}`);
    }

    return response.json();
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error(`Timeout (${timeoutMs}ms): ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * POST a GraphQL query (for AniList).
 */
export async function postGraphQL<T = any>(
  url: string,
  query: string,
  variables: Record<string, any> = {}
): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL HTTP ${response.status}: ${url}`);
  }

  return response.json();
}
