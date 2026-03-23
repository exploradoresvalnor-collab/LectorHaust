import axios from 'axios';
import { Capacitor } from '@capacitor/core';

const PROXY_URL = 'https://manga-proxy.mchaustman.workers.dev/?url=';

export interface SafebooruPost {
  id: number;
  image: string;
  directory: string;
  tags: string;
  width: number;
  height: number;
  sample_url: string;
  file_url: string;
  preview_url: string;
}

class ArtService {
  private baseUrl = 'https://safebooru.org/index.php';

  /**
   * Fetches a random set of anime-style backgrounds from Safebooru.
   * @param tags Tag string (e.g. "scenery+landscape+rating:safe")
   * @param limit Number of results
   */
  async getRandomBackgrounds(tags: string = 'scenery+landscape+rating:safe', limit: number = 20): Promise<SafebooruPost[]> {
    try {
      const apiUrl = `${this.baseUrl}?page=dapi&s=post&q=index&json=1&tags=${encodeURIComponent(tags)}&limit=${limit}`;
      const requestUrl = Capacitor.isNativePlatform() ? apiUrl : `${PROXY_URL}${encodeURIComponent(apiUrl)}`;

      const response = await axios.get(requestUrl);

      if (!Array.isArray(response.data)) {
        console.warn('[ArtService] No images found or invalid response', response.data);
        return [];
      }

      // Construct and proxy all URLs
      return response.data.map((post: any) => {
        const proxy = (url: string) => {
          if (!url) return '';
          const full = url.startsWith('http') ? url : `https:${url.startsWith('//') ? url.substring(2) : url}`;
          return Capacitor.isNativePlatform() ? full : `${PROXY_URL}${encodeURIComponent(full)}`;
        };

        const imageBase = `https://safebooru.org/images/${post.directory}/${post.image}`;
        // Safebooru usually has consistent naming for thumbnails and samples
        const previewBase = `https://safebooru.org/thumbnails/${post.directory}/thumbnail_${post.image.replace(/\.[^/.]+$/, ".jpg")}`;
        
        return {
          id: post.id,
          image: post.image,
          directory: post.directory,
          tags: post.tags,
          width: post.width,
          height: post.height,
          preview_url: proxy(post.preview_url || previewBase),
          sample_url: proxy(post.sample_url || imageBase), // Fallback to full for sample if missing
          file_url: proxy(post.file_url || imageBase)
        };
      });
    } catch (error) {
      console.error('[ArtService] Failed to fetch backgrounds:', error);
      return [];
    }
  }

  /**
   * Gets a single random background post.
   */
  async getOneRandomBackground(tags: string = 'scenery+landscape+rating:safe'): Promise<SafebooruPost | null> {
    const images = await this.getRandomBackgrounds(tags, 50);
    if (images.length === 0) return null;
    return images[Math.floor(Math.random() * images.length)];
  }
}

export const artService = new ArtService();
