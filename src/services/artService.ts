import axios from 'axios';

export interface SafebooruPost {
  id: number;
  image: string;
  directory: string;
  tags: string;
  width: number;
  height: number;
  sample_url?: string;
  file_url?: string;
}

class ArtService {
  private baseUrl = 'https://safebooru.org/index.php';

  /**
   * Fetches a random set of anime-style backgrounds from Safebooru.
   * @param tags Tag string (e.g. "scenery+landscape+rating:safe")
   * @param limit Number of results
   */
  async getRandomBackgrounds(tags: string = 'scenery+landscape+rating:safe', limit: number = 20): Promise<string[]> {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          page: 'dapi',
          s: 'post',
          q: 'index',
          json: 1,
          tags: tags,
          limit: limit
        }
      });

      if (!Array.isArray(response.data)) {
        console.warn('[ArtService] No images found or invalid response', response.data);
        return [];
      }

      // Construct full URLs
      // Safebooru images are stored at https://safebooru.org/images/{directory}/{image}
      return response.data.map((post: SafebooruPost) => {
        // Prefer file_url if available, else construct manually
        if (post.file_url) return post.file_url.startsWith('http') ? post.file_url : `https:${post.file_url}`;
        return `https://safebooru.org/images/${post.directory}/${post.image}`;
      });
    } catch (error) {
      console.error('[ArtService] Failed to fetch backgrounds:', error);
      return [];
    }
  }

  /**
   * Gets a single random background URL.
   */
  async getOneRandomBackground(tags: string = 'scenery+landscape+rating:safe'): Promise<string | null> {
    const images = await this.getRandomBackgrounds(tags, 50);
    if (images.length === 0) return null;
    return images[Math.floor(Math.random() * images.length)];
  }
}

export const artService = new ArtService();
