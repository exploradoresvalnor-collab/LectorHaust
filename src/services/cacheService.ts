/**
 * Local Storage wrapper with Time-To-Live (TTL) support.
 */

interface CacheItem<T> {
  data: T;
  expiry: number;
}

export const cacheService = {
  /**
   * Guards data into Local Storage with a specific TTL in hours.
   */
  set: <T>(key: string, data: T, ttlHours: number = 4): void => {
    try {
      const now = new Date().getTime();
      const expiry = now + (ttlHours * 60 * 60 * 1000); // converting hours to ms
      const item: CacheItem<T> = { data, expiry };
      localStorage.setItem(key, JSON.stringify(item));
    } catch (e) {
      console.warn('Error saving to cache:', e);
    }
  },

  /**
   * Retrieves data from Local Storage if it exists and hasn't expired.
   */
  get: <T>(key: string): T | null => {
    try {
      const itemStr = localStorage.getItem(key);
      if (!itemStr) return null;

      const item: CacheItem<T> = JSON.parse(itemStr);
      const now = new Date().getTime();

      // Check if the item is expired
      if (now > item.expiry) {
        localStorage.removeItem(key);
        return null;
      }

      return item.data;
    } catch (e) {
      console.warn('Error reading from cache:', e);
      return null;
    }
  },

  /**
   * Removes a specific item from the cache.
   */
  remove: (key: string): void => {
    localStorage.removeItem(key);
  },

  /**
   * Clears all cached items that match a specific prefix.
   */
  clearByPrefix: (prefix: string): void => {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }
};
