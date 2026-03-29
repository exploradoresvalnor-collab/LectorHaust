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

async function rateLimitedFetch(query: string, variables: any): Promise<any> {
    // 1. Check Cache
    const raw = query + JSON.stringify(variables);
    // Use a proper hash to avoid cache collisions from truncated base64
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const ch = raw.charCodeAt(i);
      hash = ((hash << 5) - hash) + ch;
      hash |= 0; // Convert to 32-bit int
    }
    const cacheKey = `anilist_${hash}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL) return data;
    }

    // 2. Throttling (100ms between calls)
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    if (elapsed < 100) {
        await new Promise(r => setTimeout(r, 100 - elapsed));
    }
    
    // 3. Network Fetch
    try {
        const response = await postGraphQL(BASE_URL, query, variables);
        if (response?.data) {
            localStorage.setItem(cacheKey, JSON.stringify({ data: response, timestamp: Date.now() }));
        }
        lastRequestTime = Date.now();
        return response;
    } catch (err) {
        lastRequestTime = Date.now();
        throw err;
    }
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
        const data = await rateLimitedFetch(TRENDING_QUERY, { origin });
        return data.data.Page.media;
    },

    async getMangaDetails(id: number) {
        const data = await rateLimitedFetch(DETAILS_QUERY, { id });
        return data.data.Media;
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
        const data = await rateLimitedFetch(query, {});
        return data.data.Page.media;
    }
};
