/**
 * Kitsu API Service
 */
import { fetchJSON } from './apiHelpers';

const BASE_URL = 'https://kitsu.io/api/edge';

export const kitsuService = {
    async searchManga(slug: string) {
        try {
            const data = await fetchJSON(`${BASE_URL}/manga?filter[slug]=${slug}`);
            return data.data;
        } catch {
            return [];
        }
    },

    async getCharacters(kitsuId: string) {
        try {
            const data = await fetchJSON(`${BASE_URL}/manga/${kitsuId}/characters?include=character`);
            return data.included || [];
        } catch {
            return [];
        }
    }
};
