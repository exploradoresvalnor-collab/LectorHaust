/**
 * MangaPill Scraping Service
 * 
 * Used as a fallback for titles blocked on MangaDex (e.g. Mashle).
 * Since MangaPill doesn't have an official API, we scrape its HTML.
 */

import { Capacitor } from '@capacitor/core';

const BASE_URL = 'https://mangapill.com';
const PROXY_BASE = 'https://manga-proxy.mchaustman.workers.dev/';

async function fetchHtml(url: string) {
    // ALWAYS use the proxy to bypass CORS, Referer restrictions and ISP blocks
    // This is critical for APK production where carriers might block specific domains.
    const proxyUrl = `${PROXY_BASE}?url=${encodeURIComponent(url)}`;
    const resp = await fetch(proxyUrl);
    if (!resp.ok) {
        // Fallback for native if the proxy is down (emergency only)
        if (Capacitor.isNativePlatform()) {
            const directResp = await fetch(url);
            if (directResp.ok) return directResp.text();
        }
        throw new Error(`Proxy Error: ${resp.status}`);
    }
    return resp.text(); 
}


// Keywords often found in adult/NSFW titles on MangaPill/scrapers
const NSFW_KEYWORDS = ['adult', 'mature', 'smut', 'ecchi', 'hentai', 'uncensored', 'erotica', 'porno', 'nsfw', 'sex', '3d', 'doujinshi'];

function isNSFWTitle(title: string): boolean {
    const t = title.toLowerCase();
    return NSFW_KEYWORDS.some(k => t.includes(k) || t.replace(/\s/g, '').includes(k));
}

export const mangapillService = {
    async searchManga(query: string, allowNSFW = false) {
        const html = await fetchHtml(`${BASE_URL}/search?q=${encodeURIComponent(query)}`);
        
        // Broader regex to capture the whole link block
        const matches = [...html.matchAll(/<a[^>]*href="\/manga\/(\d+)\/([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
        
        const results = matches.map(m => {
            const id = `mp:${m[1]}$${m[2]}`;
            const slug = m[2];
            const innerHtml = m[3];
            
            // Extract cover: look for data-src first (lazy loading), then src
            const imgMatch = innerHtml.match(/data-src\s*=\s*"([^"]+)"/i) || 
                             innerHtml.match(/src\s*=\s*"([^"]+)"/i);
            const coverUrl = imgMatch ? imgMatch[1] : null;

            // Extract title: usually the text inside the div with certain classes
            // We'll take the first non-empty div content
            const titleMatch = innerHtml.match(/<div[^>]*>\s*([^<]+)\s*<\/div>/);
            const title = titleMatch ? titleMatch[1].trim() : slug.replace(/-/g, ' ').toUpperCase();

            if (!allowNSFW && (isNSFWTitle(title) || isNSFWTitle(slug))) {
                return null;
            }

            return {
                id: id,
                attributes: {
                    title: { en: title },
                    description: { en: '' }
                },
                relationships: coverUrl ? [{
                    type: 'cover_art',
                    attributes: { fileName: `${PROXY_BASE}?image=${encodeURIComponent(coverUrl)}` }
                }] : [],
                source: 'mangapill' as const
            };
        }).filter(Boolean) as any[];

        return results;
    },

    async getMangaDetails(id: string, allowNSFW = false) {
        const cleanId = id.startsWith('mp:') ? id.substring(3) : id;
        const [numId, slug] = cleanId.includes('$') ? cleanId.split('$') : cleanId.includes('/') ? cleanId.split('/') : [cleanId, ''];
        const url = `${BASE_URL}/manga/${numId}/${slug}`;
        const html = await fetchHtml(url);

        // Extract Title (H1)
        const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        const title = titleMatch ? titleMatch[1].trim() : slug.replace(/-/g, ' ').toUpperCase();

        if (!allowNSFW && (isNSFWTitle(title) || isNSFWTitle(slug))) {
            throw new Error('Contenido bloqueado por filtro de seguridad.');
        }

        // Extract Description: look for p tag with text-secondary or simple p tags in the info block
        const descMatch = html.match(/<p[^>]*class="[^"]*text-secondary[^"]*"[^>]*>([\s\S]*?)<\/p>/i) ||
                          html.match(/<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
        const description = descMatch ? descMatch[1].trim().replace(/<[^>]+>/g, '') : 'Sin descripción disponible (MangaPill).';

        // Extract Genres
        const genreMatches = [...html.matchAll(/href="\/search\?genre=([^"]+)"[^>]*>([^<]+)<\/a>/gi)];
        const tags = genreMatches.map(g => ({
            id: g[1],
            type: 'tag',
            attributes: { name: { en: g[2].trim() } }
        }));

        // Extract Cover: look for the main image in the header/info area
        // It usually has 'Poster' in alt, but we'll fallback to the first significant img
        const coverMatch = html.match(/<img[^>]*src="([^"]+)"[^>]*alt="[^"]*Poster[^"]*"/i) ||
                           html.match(/<img[^>]*src="([^"]+)"[^>]*class="[^"]*rounded[^"]*"/i) ||
                           html.match(/<img[^>]*src="([^"]+)"/i);
        const coverUrl = coverMatch ? coverMatch[1] : null;

        return {
            data: {
                id: `mp:${id}`,
                type: 'manga',
                attributes: {
                    title: { en: title },
                    description: { en: description },
                    status: 'completed',
                    contentRating: 'safe',
                    originalLanguage: tags.some(t => t.attributes.name.en.toLowerCase() === 'manhwa') ? 'ko' : 
                                     tags.some(t => t.attributes.name.en.toLowerCase() === 'manhua') ? 'zh' : 'ja',
                    tags: tags,
                },
                relationships: coverUrl ? [{
                    type: 'cover_art',
                    attributes: { fileName: `${PROXY_BASE}?image=${encodeURIComponent(coverUrl)}` }
                }] : []
            }
        };
    },



    async getMangaChapters(mangaId: string, _lang: string | null = 'en', _limit = 500, _offset = 0, _order: 'asc' | 'desc' = 'desc') {
        const cleanMangaId = mangaId.startsWith('mp:') ? mangaId.substring(3) : mangaId;
        const [numId, slug] = cleanMangaId.includes('$') ? cleanMangaId.split('$') : cleanMangaId.includes('/') ? cleanMangaId.split('/') : [cleanMangaId, ''];
        const url = `${BASE_URL}/manga/${numId}/${slug}`;
        const html = await fetchHtml(url);
        
        const chapterMatches = [...html.matchAll(/href="\/chapters\/(\d+-\d+)\/([^"]+)"/g)];
        let chapters = chapterMatches.map((m, idx) => ({
            id: `mp:${m[1]}$${m[2]}@${mangaId}`, // Embed slug and mangaId context!
            attributes: {
                chapter: m[2].match(/chapter-(\d+)/)?.[1] || (chapterMatches.length - idx).toString(),
                title: m[2].replace(/-/g, ' '),
                translatedLanguage: 'en'
            },
            relationships: [{ type: 'manga', id: `mp:${mangaId}` }],
            source: 'mangapill' as const
        }));

        // Sort by chapter number
        chapters.sort((a, b) => {
            const numA = parseFloat(a.attributes.chapter);
            const numB = parseFloat(b.attributes.chapter);
            return _order === 'asc' ? numA - numB : numB - numA;
        });

        const total = chapters.length;
        
        // Apply limit and offset for pagination
        if (_offset >= 0 && _limit > 0) {
            chapters = chapters.slice(_offset, _offset + _limit);
        }

        return {
            data: chapters,
            total: total
        };
    },

    async getChapter(chapterId: string) {
        // chapterId is like "5323-10162000"
        // We need to return an object that looks like MangaDex's response
        // chapterId could be "mp:5323-10162000$slug@mangaId"
        const cleanChapterId = chapterId.startsWith('mp:') ? chapterId.substring(3) : chapterId;
        const [coreId, _extra] = cleanChapterId.includes('@') ? cleanChapterId.split('@') : [cleanChapterId, ''];
        const numIdOnly = coreId.includes('$') ? coreId.split('$')[0] : coreId;
        
        return {
            data: {
                id: chapterId,
                type: 'chapter',
                attributes: {
                    chapter: numIdOnly.split('-')[1] || '1',
                    translatedLanguage: 'en'
                },
                relationships: [
                    { type: 'manga', id: _extra ? `mp:${_extra.substring(1)}` : `mp:${numIdOnly.split('-')[0]}` }
                ]
            }
        };
    },

    async getChapterPages(chapterId: string) {
        const rawId = chapterId.startsWith('mp:') ? chapterId.substring(3) : chapterId;
        const cleanChapterId = rawId.includes('@') ? rawId.split('@')[0] : rawId;
        const [numId, chapterSlug] = cleanChapterId.includes('$') ? cleanChapterId.split('$') : [cleanChapterId, 'chapter'];
        const url = `${BASE_URL}/chapters/${numId}/${chapterSlug}`;
        const html = await fetchHtml(url);
        
        // Revised Regex: handles data-src, src, and both single/double quotes
        const imgMatches = [
            ...html.matchAll(/data-src=["']([^"']+)["']/g),
            ...html.matchAll(/<img[^>]*src=["']([^"']+)["'][^>]*class=["'](?:lazy|main-image|rounded)["']/g)
        ];
        
        // Deduplicate and filter out UI icons / small images, then proxy
        const pages = [...new Set(imgMatches.map(m => m[1]))]
            .filter(url => url.includes('/mangap/') || url.includes('chapter'))
            .map(url => {
                // Use PROXY_URL as i0.wp.com is failing with 403 for MangaPill
                return `${PROXY_BASE}?image=${encodeURIComponent(url)}`;
            });

        return {
            pages: pages,
            source: 'mangapill'
        };
    }
};

