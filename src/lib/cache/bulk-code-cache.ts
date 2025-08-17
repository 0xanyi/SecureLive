/**
 * Bulk Code Caching Layer
 * 
 * Implements in-memory caching for frequently accessed bulk code data
 * to reduce database load during high-capacity usage scenarios.
 */

interface BulkCodeCacheEntry {
  id: string
  code: string
  type: 'bulk'
  name: string
  usage_count: number
  max_usage_count: number
  is_active: boolean
  expires_at: string | null
  created_at: string
  last_updated: number // Timestamp when cache entry was last updated
}

interface BulkCodeUsageCache {
  code_id: string
  current_usage: number
  max_capacity: number
  active_sessions: number
  capacity_percentage: number
  is_near_capacity: boolean
  is_expired: boolean
  time_remaining_minutes: number
  last_updated: number
}

class BulkCodeCache {
  private static instance: BulkCodeCache
  private codeCache = new Map<string, BulkCodeCacheEntry>()
  private usageCache = new Map<string, BulkCodeUsageCache>()
  private codeByIdCache = new Map<string, string>() // Maps code string to ID
  
  // Cache configuration
  private readonly CACHE_TTL_MS = 30 * 1000 // 30 seconds for code data
  private readonly USAGE_CACHE_TTL_MS = 5 * 1000 // 5 seconds for usage data
  private readonly MAX_CACHE_SIZE = 1000 // Maximum number of entries
  
  private constructor() {
    // Start cache cleanup interval
    setInterval(() => this.cleanupExpiredEntries(), 60 * 1000) // Cleanup every minute
  }

  public static getInstance(): BulkCodeCache {
    if (!BulkCodeCache.instance) {
      BulkCodeCache.instance = new BulkCodeCache()
    }
    return BulkCodeCache.instance
  }

  /**
   * Get bulk code data from cache or return null if not cached/expired
   */
  public getBulkCode(codeString: string): BulkCodeCacheEntry | null {
    const codeId = this.codeByIdCache.get(codeString.toUpperCase())
    if (!codeId) return null

    const entry = this.codeCache.get(codeId)
    if (!entry) return null

    // Check if entry is expired
    if (Date.now() - entry.last_updated > this.CACHE_TTL_MS) {
      this.codeCache.delete(codeId)
      this.codeByIdCache.delete(codeString.toUpperCase())
      return null
    }

    // Check if bulk code has expired
    if (entry.expires_at && new Date(entry.expires_at) < new Date()) {
      // Mark as inactive in cache
      entry.is_active = false
      entry.last_updated = Date.now()
    }

    return entry
  }

  /**
   * Get bulk code data by ID from cache
   */
  public getBulkCodeById(codeId: string): BulkCodeCacheEntry | null {
    const entry = this.codeCache.get(codeId)
    if (!entry) return null

    // Check if entry is expired
    if (Date.now() - entry.last_updated > this.CACHE_TTL_MS) {
      this.codeCache.delete(codeId)
      // Also remove from code string mapping
      this.codeByIdCache.delete(entry.code)
      return null
    }

    return entry
  }

  /**
   * Cache bulk code data
   */
  public setBulkCode(codeData: Omit<BulkCodeCacheEntry, 'last_updated'>): void {
    // Enforce cache size limit
    if (this.codeCache.size >= this.MAX_CACHE_SIZE) {
      this.evictOldestEntries(Math.floor(this.MAX_CACHE_SIZE * 0.1)) // Remove 10% of entries
    }

    const entry: BulkCodeCacheEntry = {
      ...codeData,
      last_updated: Date.now()
    }

    this.codeCache.set(codeData.id, entry)
    this.codeByIdCache.set(codeData.code.toUpperCase(), codeData.id)
  }

  /**
   * Update usage count in cache (for atomic operations)
   */
  public updateUsageCount(codeId: string, newUsageCount: number): boolean {
    const entry = this.codeCache.get(codeId)
    if (!entry) return false

    entry.usage_count = newUsageCount
    entry.last_updated = Date.now()
    return true
  }

  /**
   * Get usage data from cache
   */
  public getUsageData(codeId: string): BulkCodeUsageCache | null {
    const entry = this.usageCache.get(codeId)
    if (!entry) return null

    // Check if entry is expired
    if (Date.now() - entry.last_updated > this.USAGE_CACHE_TTL_MS) {
      this.usageCache.delete(codeId)
      return null
    }

    return entry
  }

  /**
   * Cache usage data
   */
  public setUsageData(usageData: Omit<BulkCodeUsageCache, 'last_updated'>): void {
    // Enforce cache size limit
    if (this.usageCache.size >= this.MAX_CACHE_SIZE) {
      this.evictOldestUsageEntries(Math.floor(this.MAX_CACHE_SIZE * 0.1))
    }

    const entry: BulkCodeUsageCache = {
      ...usageData,
      last_updated: Date.now()
    }

    this.usageCache.set(usageData.code_id, entry)
  }

  /**
   * Invalidate cache entry for a specific code
   */
  public invalidateCode(codeId: string): void {
    const entry = this.codeCache.get(codeId)
    if (entry) {
      this.codeByIdCache.delete(entry.code)
    }
    this.codeCache.delete(codeId)
    this.usageCache.delete(codeId)
  }

  /**
   * Invalidate all cache entries
   */
  public invalidateAll(): void {
    this.codeCache.clear()
    this.codeByIdCache.clear()
    this.usageCache.clear()
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    codeEntries: number
    usageEntries: number
    codeByIdEntries: number
    memoryUsageEstimate: number
  } {
    // Rough estimate of memory usage
    const avgEntrySize = 500 // bytes per entry (rough estimate)
    const memoryUsageEstimate = (this.codeCache.size + this.usageCache.size + this.codeByIdCache.size) * avgEntrySize

    return {
      codeEntries: this.codeCache.size,
      usageEntries: this.usageCache.size,
      codeByIdEntries: this.codeByIdCache.size,
      memoryUsageEstimate
    }
  }

  /**
   * Check if a bulk code is likely at capacity (for fast pre-checks)
   */
  public isLikelyAtCapacity(codeId: string): boolean | null {
    const entry = this.codeCache.get(codeId)
    if (!entry) return null

    // Quick capacity check based on cached data
    return entry.usage_count >= entry.max_usage_count
  }

  /**
   * Cleanup expired cache entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now()
    
    // Cleanup code cache
    for (const [codeId, entry] of this.codeCache.entries()) {
      if (now - entry.last_updated > this.CACHE_TTL_MS) {
        this.codeCache.delete(codeId)
        this.codeByIdCache.delete(entry.code)
      }
    }

    // Cleanup usage cache
    for (const [codeId, entry] of this.usageCache.entries()) {
      if (now - entry.last_updated > this.USAGE_CACHE_TTL_MS) {
        this.usageCache.delete(codeId)
      }
    }
  }

  /**
   * Evict oldest code cache entries
   */
  private evictOldestEntries(count: number): void {
    const entries = Array.from(this.codeCache.entries())
      .sort(([, a], [, b]) => a.last_updated - b.last_updated)
      .slice(0, count)

    for (const [codeId, entry] of entries) {
      this.codeCache.delete(codeId)
      this.codeByIdCache.delete(entry.code)
    }
  }

  /**
   * Evict oldest usage cache entries
   */
  private evictOldestUsageEntries(count: number): void {
    const entries = Array.from(this.usageCache.entries())
      .sort(([, a], [, b]) => a.last_updated - b.last_updated)
      .slice(0, count)

    for (const [codeId] of entries) {
      this.usageCache.delete(codeId)
    }
  }
}

export { BulkCodeCache, type BulkCodeCacheEntry, type BulkCodeUsageCache }