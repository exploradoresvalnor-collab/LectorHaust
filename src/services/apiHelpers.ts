/**
 * Shared HTTP helpers for secondary APIs (AniList, Jikan, Kitsu).
 * MangaDex uses its own apiFetch with rate-limiting and retries — DO NOT replace it.
 */

/**
 * GET request with JSON parsing and error handling.
 */
export async function fetchJSON<T = any>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${url}`);
  }

  return response.json();
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
