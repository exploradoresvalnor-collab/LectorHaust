/**
 * AniList GraphQL Service
 */

const BASE_URL = 'https://graphql.anilist.co';

const TRENDING_QUERY = `
query ($origin: CountryCode) {
    Page (page: 1, perPage: 12) {
        media (type: MANGA, sort: TRENDING_DESC, countryOfOrigin: $origin) {
            id
            idMal
            title { romaji english }
            format
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
    /**
     * Fetch trending manga from AniList
     */
    async getTrendingManga(origin: string | null = null) {
        const response = await fetch(BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                query: TRENDING_QUERY,
                variables: { origin }
            })
        });

        const data = await response.json();
        return data.data.Page.media;
    },

    /**
     * Fetch detailed manga info by AniList ID
     */
    async getMangaDetails(id: number) {
        const response = await fetch(BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                query: DETAILS_QUERY,
                variables: { id }
            })
        });

        const data = await response.json();
        return data.data.Media;
    },

    /**
     * Search manga by title
     */
    async searchManga(search: string) {
        const query = `
        query ($search: String) {
          Page (page: 1, perPage: 12) {
            media (search: $search, type: MANGA) {
              id
              idMal
              title { romaji english }
              format
              coverImage { large extraLarge }
            }
          }
        }
        `;
        const response = await fetch(BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                query,
                variables: { search }
            })
        });

        const data = await response.json();
        return data.data.Page.media;
    }
};
