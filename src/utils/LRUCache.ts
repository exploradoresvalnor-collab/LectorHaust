/**
 * LRU (Least Recently Used) Cache with TTL expiration.
 * 
 * Professional-grade in-memory cache that:
 * - Evicts the oldest unused entries when capacity is reached
 * - Auto-expires entries after a configurable TTL
 * - Provides O(1) get/set operations via Map ordering
 * 
 * Used to replace raw Map() caches across the app for
 * bounded memory usage and automatic staleness handling.
 */
export class LRUCache<K, V> {
  private cache = new Map<K, { value: V; timestamp: number }>();
  private readonly maxSize: number;
  private readonly maxAge: number;

  /**
   * @param maxSize Maximum number of entries before eviction (default: 30)
   * @param maxAgeMs Time-to-live in milliseconds (default: 10 minutes)
   */
  constructor(maxSize = 30, maxAgeMs = 10 * 60 * 1000) {
    this.maxSize = maxSize;
    this.maxAge = maxAgeMs;
  }

  /**
   * Get a cached value. Returns undefined if not found or expired.
   * Accessing a key promotes it to "most recently used".
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Check TTL expiration
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      return undefined;
    }

    // Promote to most-recently-used by re-inserting
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  /**
   * Store a value. Evicts the least-recently-used entry if at capacity.
   */
  set(key: K, value: V): void {
    // Remove existing to refresh position
    this.cache.delete(key);

    // Evict LRU entry if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) this.cache.delete(oldestKey);
    }

    this.cache.set(key, { value, timestamp: Date.now() });
  }

  /**
   * Check if a non-expired entry exists for the key.
   */
  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Check if an entry exists but may be stale (past TTL).
   * Useful for stale-while-revalidate patterns.
   */
  getStale(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    return entry.value;
  }

  /**
   * Get the age of an entry in milliseconds. Returns Infinity if not found.
   */
  getAge(key: K): number {
    const entry = this.cache.get(key);
    if (!entry) return Infinity;
    return Date.now() - entry.timestamp;
  }

  delete(key: K): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}
