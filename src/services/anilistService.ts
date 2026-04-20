/**
 * AniList GraphQL Service
 */
import { postGraphQL } from './apiHelpers';

const BASE_URL = 'https://graphql.anilist.co/';

/**
 * Professional Rate Limiter & Cache for AniList
 */
const CACHE_TTL = 1000 * 60 * 60; // 1 hour
let lastRequestTime = 0;
let requestQueue = Promise.resolve();

async function rateLimitedFetch(query: string, variables: any): Promise<any> {
    // 1. Check Cache
    const raw = query + JSON.stringify(variables);
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const ch = raw.charCodeAt(i);
      hash = ((hash << 5) - hash) + ch;
      hash |= 0;
    }
    const cacheKey = `anilist_${hash}`;
    
    try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_TTL) return data;
        }
    } catch (e) {
        // Almacenamiento bloqueado por el navegador (Tracking Prevention)
    }

    // 2. Queue & Throttle (Strict 1500ms spacing to avoid 429)
    const fetchPromise = requestQueue.then(async () => {
        const elapsed = Date.now() - lastRequestTime;
        if (elapsed < 1500) {
            await new Promise(r => setTimeout(r, 1500 - elapsed));
        }
        
        // Update time BEFORE fetch, preventing concurrent queues from skipping the wait if they somehow leak
        lastRequestTime = Date.now(); 
        
        try {
            const response = await postGraphQL(BASE_URL, query, variables);
            try {
                if (response?.data) {
                    localStorage.setItem(cacheKey, JSON.stringify({ data: response, timestamp: Date.now() }));
                }
            } catch (e) { /* Storage blocked */ }
            return response;
        } catch (err) {
            // El error es esperado si Cloudflare o AniList rechazan la IP/proxy.
            throw err;
        }
    });

    requestQueue = fetchPromise.catch(() => {});
    return fetchPromise;
}

const TRENDING_QUERY = `
query ($origin: CountryCode) {
    Page (page: 1, perPage: 12) {
        media (type: MANGA, sort: TRENDING_DESC, countryOfOrigin: $origin) {
            id
            idMal
            title { romaji english }
            format
            bannerImage
            coverImage { large extraLarge }
            description
            genres
            countryOfOrigin
        }
    }
}`;

const DETAILS_QUERY = `
query ($id: Int) {
  Media (id: $id, type: MANGA) {
    id
    idMal
    title {
      romaji
      english
      native
    }
    bannerImage
    coverImage {
      extraLarge
      large
    }
    description
    format
    status
    startDate { year month day }
    endDate { year month day }
    genres
    averageScore
    popularity
    countryOfOrigin
    characters (sort: [ROLE, RELEVANCE], perPage: 8) {
      edges {
        role
        node {
          id
          name { full }
          image { medium }
        }
      }
    }
    recommendations (perPage: 10, sort: RATING_DESC) {
      edges {
        node {
          mediaRecommendation {
            id
            title { romaji english }
            coverImage { large }
            format
          }
        }
      }
    }
    relations {
      edges {
        relationType
        node {
          id
          idMal
          title { romaji english }
          type
          format
        }
      }
    }
  }
}
`;

export const anilistService = {
    async getTrendingManga(origin: string | null = null) {
        try {
            const data = await rateLimitedFetch(TRENDING_QUERY, { origin });
            return data?.data?.Page?.media || [];
        } catch { return []; }
    },

    async getMangaDetails(id: number) {
        try {
            const data = await rateLimitedFetch(DETAILS_QUERY, { id });
            return data?.data?.Media || null;
        } catch { return null; }
    },

    cleanTitle(title: string) {
        return title
            .replace(/[^\w\s-]/gi, ' ') // Remove special chars but keep spaces and hyphens
            .replace(/\s+/g, ' ')       // Normalize spaces
            .trim();
    },

    async searchManga(search: string) {
        const query = `
        query ($search: String) {
          Page (page: 1, perPage: 12) {
            media (search: $search, type: MANGA) {
              id
              idMal
              title { romaji english native }
              format
              bannerImage
              coverImage { large extraLarge }
              description
              countryOfOrigin
            }
          }
        }
        `;
        try {
            const data = await rateLimitedFetch(query, { search });
            return data?.data?.Page?.media || [];
        } catch {
            return [];
        }
    },

    async getAnimeDetailsByName(search: string) {
        const query = `
        query ($search: String) {
          Media (search: $search, type: ANIME, sort: SEARCH_MATCH) {
             id
             title { romaji english }
             bannerImage
             coverImage { extraLarge large }
             description
             averageScore
          }
        }
        `;
        try {
           const data = await rateLimitedFetch(query, { search });
           return data?.data?.Media || null;
        } catch {
           return null;
        }
    },

    async getTrendingAnime() {
        const query = `
        query {
          Page (page: 1, perPage: 12) {
            media (type: ANIME, sort: TRENDING_DESC) {
              id
              title { romaji english }
              bannerImage
              coverImage { extraLarge large }
              description
              averageScore
            }
          }
        }
        `;
        try {
            const data = await rateLimitedFetch(query, {});
            return data?.data?.Page?.media || [];
        } catch { return []; }
    }
};
