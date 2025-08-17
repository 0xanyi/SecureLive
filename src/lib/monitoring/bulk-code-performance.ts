/**
 * Bulk Code Performance Monitoring
 * 
 * Tracks performance metrics for bulk code operations to identify
 * bottlenecks and optimize high-capacity usage scenarios.
 */

interface PerformanceMetric {
  operation: string
  duration: number
  timestamp: number
  codeId?: string
  success: boolean
  metadata?: Record<string, any>
}

interface OperationStats {
  count: number
  totalDuration: number
  averageDuration: number
  minDuration: number
  maxDuration: number
  successRate: number
  lastUpdated: number
}

interface ConcurrencyMetric {
  timestamp: number
  concurrentOperations: number
  operation: string
  codeId?: string
}

class BulkCodePerformanceMonitor {
  private static instance: BulkCodePerformanceMonitor
  private metrics: PerformanceMetric[] = []
  private operationStats = new Map<string, OperationStats>()
  private concurrencyMetrics: ConcurrencyMetric[] = []
  private activeOperations = new Map<string, number>() // operation -> count
  
  // Configuration
  private readonly MAX_METRICS = 10000 // Keep last 10k metrics
  private readonly MAX_CONCURRENCY_METRICS = 1000
  private readonly STATS_WINDOW_MS = 5 * 60 * 1000 // 5 minutes
  
  private constructor() {
    // Start cleanup interval
    setInterval(() => this.cleanupOldMetrics(), 60 * 1000) // Cleanup every minute
  }

  public static getInstance(): BulkCodePerformanceMonitor {
    if (!BulkCodePerformanceMonitor.instance) {
      BulkCodePerformanceMonitor.instance = new BulkCodePerformanceMonitor()
    }
    return BulkCodePerformanceMonitor.instance
  }

  /**
   * Start timing an operation
   */
  public startOperation(operation: string, codeId?: string): string {
    const operationId = `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Track concurrency
    const currentCount = this.activeOperations.get(operation) || 0
    this.activeOperations.set(operation, currentCount + 1)
    
    // Record concurrency metric
    this.concurrencyMetrics.push({
      timestamp: Date.now(),
      concurrentOperations: currentCount + 1,
      operation,
      codeId
    })

    // Cleanup old concurrency metrics
    if (this.concurrencyMetrics.length > this.MAX_CONCURRENCY_METRICS) {
      this.concurrencyMetrics = this.concurrencyMetrics.slice(-this.MAX_CONCURRENCY_METRICS)
    }

    return operationId
  }

  /**
   * End timing an operation and record the metric
   */
  public endOperation(
    operationId: string, 
    operation: string, 
    startTime: number, 
    success: boolean,
    codeId?: string,
    metadata?: Record<string, any>
  ): void {
    const duration = Date.now() - startTime
    
    // Record the metric
    const metric: PerformanceMetric = {
      operation,
      duration,
      timestamp: Date.now(),
      codeId,
      success,
      metadata
    }

    this.metrics.push(metric)
    
    // Update operation stats
    this.updateOperationStats(operation, duration, success)
    
    // Decrease concurrency count
    const currentCount = this.activeOperations.get(operation) || 0
    if (currentCount > 0) {
      this.activeOperations.set(operation, currentCount - 1)
    }

    // Cleanup old metrics if needed
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS)
    }
  }

  /**
   * Record a simple metric without timing
   */
  public recordMetric(
    operation: string,
    duration: number,
    success: boolean,
    codeId?: string,
    metadata?: Record<string, any>
  ): void {
    const metric: PerformanceMetric = {
      operation,
      duration,
      timestamp: Date.now(),
      codeId,
      success,
      metadata
    }

    this.metrics.push(metric)
    this.updateOperationStats(operation, duration, success)

    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS)
    }
  }

  /**
   * Get performance statistics for an operation
   */
  public getOperationStats(operation: string): OperationStats | null {
    return this.operationStats.get(operation) || null
  }

  /**
   * Get all operation statistics
   */
  public getAllOperationStats(): Map<string, OperationStats> {
    return new Map(this.operationStats)
  }

  /**
   * Get recent metrics for an operation
   */
  public getRecentMetrics(operation: string, windowMs: number = this.STATS_WINDOW_MS): PerformanceMetric[] {
    const cutoff = Date.now() - windowMs
    return this.metrics.filter(m => m.operation === operation && m.timestamp >= cutoff)
  }

  /**
   * Get concurrency statistics
   */
  public getConcurrencyStats(operation: string, windowMs: number = this.STATS_WINDOW_MS): {
    maxConcurrency: number
    averageConcurrency: number
    currentConcurrency: number
    peakTimes: number[]
  } {
    const cutoff = Date.now() - windowMs
    const recentMetrics = this.concurrencyMetrics.filter(
      m => m.operation === operation && m.timestamp >= cutoff
    )

    if (recentMetrics.length === 0) {
      return {
        maxConcurrency: 0,
        averageConcurrency: 0,
        currentConcurrency: this.activeOperations.get(operation) || 0,
        peakTimes: []
      }
    }

    const concurrencyValues = recentMetrics.map(m => m.concurrentOperations)
    const maxConcurrency = Math.max(...concurrencyValues)
    const averageConcurrency = concurrencyValues.reduce((a, b) => a + b, 0) / concurrencyValues.length

    // Find peak times (when concurrency was at 80% or more of max)
    const peakThreshold = maxConcurrency * 0.8
    const peakTimes = recentMetrics
      .filter(m => m.concurrentOperations >= peakThreshold)
      .map(m => m.timestamp)

    return {
      maxConcurrency,
      averageConcurrency: Math.round(averageConcurrency * 100) / 100,
      currentConcurrency: this.activeOperations.get(operation) || 0,
      peakTimes
    }
  }

  /**
   * Get performance summary for all operations
   */
  public getPerformanceSummary(windowMs: number = this.STATS_WINDOW_MS): {
    totalOperations: number
    operationBreakdown: Record<string, number>
    averageResponseTime: number
    successRate: number
    slowestOperations: Array<{ operation: string; averageDuration: number }>
    highConcurrencyOperations: Array<{ operation: string; maxConcurrency: number }>
  } {
    const cutoff = Date.now() - windowMs
    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoff)

    const operationBreakdown: Record<string, number> = {}
    let totalDuration = 0
    let successCount = 0

    for (const metric of recentMetrics) {
      operationBreakdown[metric.operation] = (operationBreakdown[metric.operation] || 0) + 1
      totalDuration += metric.duration
      if (metric.success) successCount++
    }

    const averageResponseTime = recentMetrics.length > 0 ? totalDuration / recentMetrics.length : 0
    const successRate = recentMetrics.length > 0 ? (successCount / recentMetrics.length) * 100 : 0

    // Get slowest operations
    const slowestOperations = Array.from(this.operationStats.entries())
      .map(([operation, stats]) => ({ operation, averageDuration: stats.averageDuration }))
      .sort((a, b) => b.averageDuration - a.averageDuration)
      .slice(0, 5)

    // Get high concurrency operations
    const highConcurrencyOperations = Array.from(this.operationStats.keys())
      .map(operation => ({
        operation,
        maxConcurrency: this.getConcurrencyStats(operation, windowMs).maxConcurrency
      }))
      .sort((a, b) => b.maxConcurrency - a.maxConcurrency)
      .slice(0, 5)

    return {
      totalOperations: recentMetrics.length,
      operationBreakdown,
      averageResponseTime: Math.round(averageResponseTime * 100) / 100,
      successRate: Math.round(successRate * 100) / 100,
      slowestOperations,
      highConcurrencyOperations
    }
  }

  /**
   * Get alerts for performance issues
   */
  public getPerformanceAlerts(): Array<{
    type: 'slow_operation' | 'high_error_rate' | 'high_concurrency'
    operation: string
    message: string
    severity: 'warning' | 'critical'
    value: number
  }> {
    const alerts: Array<{
      type: 'slow_operation' | 'high_error_rate' | 'high_concurrency'
      operation: string
      message: string
      severity: 'warning' | 'critical'
      value: number
    }> = []

    // Check for slow operations
    for (const [operation, stats] of this.operationStats.entries()) {
      if (stats.averageDuration > 1000) { // > 1 second
        alerts.push({
          type: 'slow_operation',
          operation,
          message: `Operation ${operation} has high average response time: ${stats.averageDuration}ms`,
          severity: stats.averageDuration > 5000 ? 'critical' : 'warning',
          value: stats.averageDuration
        })
      }

      if (stats.successRate < 95) { // < 95% success rate
        alerts.push({
          type: 'high_error_rate',
          operation,
          message: `Operation ${operation} has low success rate: ${stats.successRate}%`,
          severity: stats.successRate < 90 ? 'critical' : 'warning',
          value: stats.successRate
        })
      }
    }

    // Check for high concurrency
    for (const operation of this.operationStats.keys()) {
      const concurrencyStats = this.getConcurrencyStats(operation)
      if (concurrencyStats.maxConcurrency > 50) { // > 50 concurrent operations
        alerts.push({
          type: 'high_concurrency',
          operation,
          message: `Operation ${operation} reached high concurrency: ${concurrencyStats.maxConcurrency}`,
          severity: concurrencyStats.maxConcurrency > 100 ? 'critical' : 'warning',
          value: concurrencyStats.maxConcurrency
        })
      }
    }

    return alerts.sort((a, b) => {
      if (a.severity === 'critical' && b.severity === 'warning') return -1
      if (a.severity === 'warning' && b.severity === 'critical') return 1
      return b.value - a.value
    })
  }

  /**
   * Clear all metrics and stats
   */
  public clearMetrics(): void {
    this.metrics = []
    this.operationStats.clear()
    this.concurrencyMetrics = []
    this.activeOperations.clear()
  }

  /**
   * Update operation statistics
   */
  private updateOperationStats(operation: string, duration: number, success: boolean): void {
    const existing = this.operationStats.get(operation)
    
    if (!existing) {
      this.operationStats.set(operation, {
        count: 1,
        totalDuration: duration,
        averageDuration: duration,
        minDuration: duration,
        maxDuration: duration,
        successRate: success ? 100 : 0,
        lastUpdated: Date.now()
      })
    } else {
      const newCount = existing.count + 1
      const newTotalDuration = existing.totalDuration + duration
      const newSuccessCount = Math.round((existing.successRate / 100) * existing.count) + (success ? 1 : 0)

      this.operationStats.set(operation, {
        count: newCount,
        totalDuration: newTotalDuration,
        averageDuration: Math.round((newTotalDuration / newCount) * 100) / 100,
        minDuration: Math.min(existing.minDuration, duration),
        maxDuration: Math.max(existing.maxDuration, duration),
        successRate: Math.round((newSuccessCount / newCount) * 10000) / 100,
        lastUpdated: Date.now()
      })
    }
  }

  /**
   * Cleanup old metrics and stats
   */
  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000) // 24 hours
    
    // Remove old metrics
    this.metrics = this.metrics.filter(m => m.timestamp >= cutoff)
    
    // Remove old concurrency metrics
    this.concurrencyMetrics = this.concurrencyMetrics.filter(m => m.timestamp >= cutoff)
    
    // Remove stale operation stats (not updated in last hour)
    const statsCutoff = Date.now() - (60 * 60 * 1000) // 1 hour
    for (const [operation, stats] of this.operationStats.entries()) {
      if (stats.lastUpdated < statsCutoff) {
        this.operationStats.delete(operation)
      }
    }
  }
}

export { BulkCodePerformanceMonitor, type PerformanceMetric, type OperationStats, type ConcurrencyMetric }