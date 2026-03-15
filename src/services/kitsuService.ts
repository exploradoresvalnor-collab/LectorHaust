/**
 * Kitsu API Service
 */

const BASE_URL = 'https://kitsu.io/api/edge';

export const kitsuService = {
    /**
     * Search manga on Kitsu
     */
    async searchManga(slug: string) {
        try {
            const response = await fetch(`${BASE_URL}/manga?filter[slug]=${slug}`);
            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error('Error fetching Kitsu manga:', error);
            return [];
        }
    },

    /**
     * Get characters by Kitsu ID
     */
    async getCharacters(kitsuId: string) {
        try {
            const response = await fetch(`${BASE_URL}/manga/${kitsuId}/characters?include=character`);
            const data = await response.json();
            return data.included || [];
        } catch (error) {
            console.error('Error fetching Kitsu characters:', error);
            return [];
        }
    }
};
