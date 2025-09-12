// Request Deduplication and Caching System

import { QueueRequest, CacheEntry, DeduplicationConfig } from '../types';

export class RequestCache {
  private cache: Map<string, CacheEntry> = new Map();
  private deduplicationMap: Map<string, Set<string>> = new Map();
  private deduplicationConfig: DeduplicationConfig;
  private maxCacheSize: number;
  private defaultTTL: number;
  private cleanupInterval: number;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(
    maxCacheSize = 10000,
    defaultTTL = 300000, // 5 minutes
    cleanupInterval = 60000, // 1 minute
    deduplicationConfig: DeduplicationConfig = {
      enabled: true,
      windowSize: 60000, // 1 minute
      keyGenerator: (request) => `${request.type}:${JSON.stringify(request.payload)}`
    }
  ) {
    this.maxCacheSize = maxCacheSize;
    this.defaultTTL = defaultTTL;
    this.cleanupInterval = cleanupInterval;
    this.deduplicationConfig = deduplicationConfig;
    
    this.startCleanupTimer();
  }

  /**
   * Check if request is a duplicate and should be deduplicated
   */
  isDuplicate(request: QueueRequest): boolean {
    if (!this.deduplicationConfig.enabled) {
      return false;
    }

    const dedupeKey = this.deduplicationConfig.keyGenerator(request);
    const now = Date.now();
    const windowStart = now - this.deduplicationConfig.windowSize;

    // Get all request IDs for this deduplication key
    const requestIds = this.deduplicationMap.get(dedupeKey);
    if (!requestIds || requestIds.size === 0) {
      return false;
    }

    // Check if any recent requests match
    for (const requestId of requestIds) {
      const cachedEntry = this.cache.get(requestId);
      if (cachedEntry && cachedEntry.createdAt > windowStart) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get cached result for a request
   */
  get(request: QueueRequest): any | null {
    const cacheKey = this.generateCacheKey(request);
    const entry = this.cache.get(cacheKey);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (this.isExpired(entry, now)) {
      this.cache.delete(cacheKey);
      this.removeFromDeduplication(cacheKey);
      return null;
    }

    // Update access information
    entry.accessCount++;
    entry.lastAccessed = now;

    return entry.value;
  }

  /**
   * Store result in cache
   */
  set(request: QueueRequest, result: any, ttl?: number): void {
    if (!request.metadata.cacheable) {
      return;
    }

    const cacheKey = this.generateCacheKey(request);
    const now = Date.now();
    const effectiveTTL = ttl || request.metadata.cacheTTL || this.defaultTTL;

    const entry: CacheEntry = {
      key: cacheKey,
      value: result,
      ttl: effectiveTTL,
      createdAt: now,
      accessCount: 1,
      lastAccessed: now
    };

    // Ensure cache size limit
    if (this.cache.size >= this.maxCacheSize) {
      this.evictLeastRecentlyUsed();
    }

    this.cache.set(cacheKey, entry);
    this.addToDeduplication(request, cacheKey);
  }

  /**
   * Remove entry from cache
   */
  delete(request: QueueRequest): boolean {
    const cacheKey = this.generateCacheKey(request);
    const deleted = this.cache.delete(cacheKey);
    
    if (deleted) {
      this.removeFromDeduplication(cacheKey);
    }

    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.deduplicationMap.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let expiredCount = 0;
    let totalAccessCount = 0;
    let totalSize = 0;

    for (const entry of this.cache.values()) {
      if (this.isExpired(entry, now)) {
        expiredCount++;
      }
      totalAccessCount += entry.accessCount;
      totalSize += this.estimateEntrySize(entry);
    }

    const hitRate = this.calculateHitRate();
    
    return {
      totalEntries: this.cache.size,
      expiredEntries: expiredCount,
      activeEntries: this.cache.size - expiredCount,
      totalAccessCount,
      averageAccessCount: this.cache.size > 0 ? totalAccessCount / this.cache.size : 0,
      estimatedSizeBytes: totalSize,
      hitRate,
      deduplicationKeys: this.deduplicationMap.size,
      maxCacheSize: this.maxCacheSize,
      utilizationPercentage: (this.cache.size / this.maxCacheSize) * 100
    };
  }

  /**
   * Get cache entries matching a pattern
   */
  findEntries(pattern: RegExp): CacheEntry[] {
    const matches: CacheEntry[] = [];
    const now = Date.now();

    for (const entry of this.cache.values()) {
      if (!this.isExpired(entry, now) && pattern.test(entry.key)) {
        matches.push(entry);
      }
    }

    return matches;
  }

  /**
   * Warm up cache with pre-computed values
   */
  warmUp(entries: Array<{ request: QueueRequest; result: any; ttl?: number }>): void {
    for (const { request, result, ttl } of entries) {
      this.set(request, result, ttl);
    }
  }

  /**
   * Export cache for persistence
   */
  export(): Array<{ key: string; entry: CacheEntry }> {
    const now = Date.now();
    const exports: Array<{ key: string; entry: CacheEntry }> = [];

    for (const [key, entry] of this.cache) {
      if (!this.isExpired(entry, now)) {
        exports.push({ key, entry: { ...entry } });
      }
    }

    return exports;
  }

  /**
   * Import cache from exported data
   */
  import(data: Array<{ key: string; entry: CacheEntry }>): void {
    const now = Date.now();

    for (const { key, entry } of data) {
      if (!this.isExpired(entry, now)) {
        this.cache.set(key, entry);
      }
    }
  }

  /**
   * Manually trigger cleanup
   */
  cleanup(): void {
    this.performCleanup();
  }

  /**
   * Stop cache cleanup timer
   */
  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Generate cache key for request
   */
  private generateCacheKey(request: QueueRequest): string {
    if (request.metadata.cacheKey) {
      return request.metadata.cacheKey;
    }

    // Generate key based on request type and payload
    const payloadHash = this.hashObject(request.payload);
    return `${request.type}:${payloadHash}`;
  }

  /**
   * Add request to deduplication tracking
   */
  private addToDeduplication(request: QueueRequest, cacheKey: string): void {
    if (!this.deduplicationConfig.enabled) {
      return;
    }

    const dedupeKey = this.deduplicationConfig.keyGenerator(request);
    
    if (!this.deduplicationMap.has(dedupeKey)) {
      this.deduplicationMap.set(dedupeKey, new Set());
    }

    this.deduplicationMap.get(dedupeKey)!.add(cacheKey);
  }

  /**
   * Remove from deduplication tracking
   */
  private removeFromDeduplication(cacheKey: string): void {
    for (const [dedupeKey, requestIds] of this.deduplicationMap) {
      requestIds.delete(cacheKey);
      if (requestIds.size === 0) {
        this.deduplicationMap.delete(dedupeKey);
      }
    }
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CacheEntry, now: number): boolean {
    return (now - entry.createdAt) > entry.ttl;
  }

  /**
   * Evict least recently used entries
   */
  private evictLeastRecentlyUsed(): void {
    if (this.cache.size === 0) return;

    // Find the entry with the oldest lastAccessed time
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.removeFromDeduplication(oldestKey);
    }
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, this.cleanupInterval);
  }

  /**
   * Perform cache cleanup
   */
  private performCleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    // Find expired entries
    for (const [key, entry] of this.cache) {
      if (this.isExpired(entry, now)) {
        expiredKeys.push(key);
      }
    }

    // Remove expired entries
    for (const key of expiredKeys) {
      this.cache.delete(key);
      this.removeFromDeduplication(key);
    }

    // Clean up empty deduplication sets
    for (const [dedupeKey, requestIds] of this.deduplicationMap) {
      if (requestIds.size === 0) {
        this.deduplicationMap.delete(dedupeKey);
      }
    }
  }

  /**
   * Calculate cache hit rate
   */
  private calculateHitRate(): number {
    // This would require tracking hits and misses over time
    // For now, return a simple estimation based on access counts
    let totalAccess = 0;
    let totalEntries = 0;

    for (const entry of this.cache.values()) {
      totalAccess += entry.accessCount;
      totalEntries++;
    }

    if (totalEntries === 0) return 0;
    
    // Estimate hit rate (this is a simplified calculation)
    const averageAccess = totalAccess / totalEntries;
    return Math.min(1, averageAccess / 2); // Rough estimate
  }

  /**
   * Estimate size of cache entry in bytes
   */
  private estimateEntrySize(entry: CacheEntry): number {
    try {
      const serialized = JSON.stringify(entry);
      return serialized.length * 2; // Rough estimate (2 bytes per character)
    } catch {
      return 1024; // Default estimate for non-serializable objects
    }
  }

  /**
   * Generate hash for object
   */
  private hashObject(obj: any): string {
    try {
      const str = JSON.stringify(obj, Object.keys(obj).sort());
      return this.simpleHash(str);
    } catch {
      return this.simpleHash(String(obj));
    }
  }

  /**
   * Simple string hash function
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

// Cache warming strategies
export class CacheWarmingStrategy {
  private cache: RequestCache;
  private warmupInterval?: NodeJS.Timeout;

  constructor(cache: RequestCache) {
    this.cache = cache;
  }

  /**
   * Start periodic cache warming
   */
  startPeriodicWarming(
    warmupFn: () => Promise<Array<{ request: QueueRequest; result: any }>>,
    interval = 300000 // 5 minutes
  ): void {
    this.warmupInterval = setInterval(async () => {
      try {
        const entries = await warmupFn();
        this.cache.warmUp(entries);
      } catch (error) {
        console.error('Cache warming failed:', error);
      }
    }, interval);
  }

  /**
   * Stop periodic warming
   */
  stopPeriodicWarming(): void {
    if (this.warmupInterval) {
      clearInterval(this.warmupInterval);
      this.warmupInterval = undefined;
    }
  }

  /**
   * Warm cache with popular requests
   */
  async warmPopularRequests(
    requestHistory: QueueRequest[],
    topN = 100
  ): Promise<void> {
    // Analyze request patterns
    const requestFrequency = new Map<string, number>();
    
    for (const request of requestHistory) {
      const key = `${request.type}:${JSON.stringify(request.payload)}`;
      requestFrequency.set(key, (requestFrequency.get(key) || 0) + 1);
    }

    // Get top N most frequent requests
    const sortedRequests = Array.from(requestFrequency.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, topN);

    // Pre-compute and cache results for popular requests
    const warmupEntries: Array<{ request: QueueRequest; result: any }> = [];
    
    for (const [requestKey] of sortedRequests) {
      // Find a sample request for this pattern
      const sampleRequest = requestHistory.find(req => 
        `${req.type}:${JSON.stringify(req.payload)}` === requestKey
      );
      
      if (sampleRequest && sampleRequest.result) {
        warmupEntries.push({
          request: sampleRequest,
          result: sampleRequest.result
        });
      }
    }

    this.cache.warmUp(warmupEntries);
  }
}