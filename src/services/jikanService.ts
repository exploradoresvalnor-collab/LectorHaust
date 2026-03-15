/**
 * Jikan API Service (MyAnimeList wrapper)
 */

const BASE_URL = 'https://api.jikan.moe/v4';

export const jikanService = {
    /**
     * Get anime related to a manga by MAL ID
     */
    async getRelatedAnime(malId: number) {
        try {
            const response = await fetch(`${BASE_URL}/manga/${malId}/relations`);
            const data = await response.json();
            // Filter only anime relations
            return data.data.filter((rel: any) => rel.relation === 'Adaptation' || rel.relation === 'Other');
        } catch (error) {
            console.error('Error fetching Jikan relations:', error);
            return [];
        }
    },

    /**
     * Get characters of a manga by MAL ID
     */
    async getCharacters(malId: number) {
        try {
            const response = await fetch(`${BASE_URL}/manga/${malId}/characters`);
            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error('Error fetching Jikan characters:', error);
            return [];
        }
    },

    /**
     * Get external links (Official, etc.)
     */
    async getExternalLinks(malId: number) {
        try {
            const response = await fetch(`${BASE_URL}/manga/${malId}/external`);
            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error('Error fetching Jikan external links:', error);
            return [];
        }
    }
};
