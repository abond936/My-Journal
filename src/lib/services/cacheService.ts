import { Entry } from '@/lib/types/entry';
import { Tag } from '@/lib/types/tag';

interface CacheConfig {
  ttl: number;  // Time to live in seconds
  maxSize: number;  // Maximum number of items
}

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

class CacheService {
  private cache: Map<string, CacheItem<any>>;
  private config: CacheConfig;

  constructor(config: CacheConfig) {
    this.cache = new Map();
    this.config = config;
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > this.config.ttl * 1000) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data as T;
  }

  set<T>(key: string, data: T): void {
    if (this.cache.size >= this.config.maxSize) {
      // Remove oldest item
      const oldestKey = Array.from(this.cache.keys())[0];
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Helper method to generate cache keys
  static generateKey(prefix: string, params: Record<string, any>): string {
    return `${prefix}:${JSON.stringify(params)}`;
  }
}

// Create singleton instances for different data types
export const entryCache = new CacheService({
  ttl: 300, // 5 minutes
  maxSize: 100 // Maximum 100 entries
});

export const tagCache = new CacheService({
  ttl: 600, // 10 minutes
  maxSize: 50 // Maximum 50 tags
});

export default CacheService; 