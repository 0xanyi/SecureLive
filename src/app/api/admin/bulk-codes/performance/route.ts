import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse } from '@/types/database'
import { BulkCodePerformanceMonitor } from '@/lib/monitoring/bulk-code-performance'
import { BulkCodeCache } from '@/lib/cache/bulk-code-cache'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const operation = searchParams.get('operation')
    const windowMs = parseInt(searchParams.get('window') || '300000') // Default 5 minutes
    const type = searchParams.get('type') || 'summary' // summary, stats, alerts, cache

    const performanceMonitor = BulkCodePerformanceMonitor.getInstance()
    const cache = BulkCodeCache.getInstance()

    switch (type) {
      case 'summary':
        const summary = performanceMonitor.getPerformanceSummary(windowMs)
        return NextResponse.json<ApiResponse>({
          success: true,
          data: {
            ...summary,
            window_minutes: Math.round(windowMs / 60000),
            timestamp: Date.now()
          }
        })

      case 'stats':
        if (operation) {
          const stats = performanceMonitor.getOperationStats(operation)
          const concurrencyStats = performanceMonitor.getConcurrencyStats(operation, windowMs)
          
          return NextResponse.json<ApiResponse>({
            success: true,
            data: {
              operation,
              performance: stats,
              concurrency: concurrencyStats,
              window_minutes: Math.round(windowMs / 60000),
              timestamp: Date.now()
            }
          })
        } else {
          const allStats = performanceMonitor.getAllOperationStats()
          const statsData = Array.from(allStats.entries()).map(([op, stats]) => ({
            operation: op,
            performance: stats,
            concurrency: performanceMonitor.getConcurrencyStats(op, windowMs)
          }))

          return NextResponse.json<ApiResponse>({
            success: true,
            data: {
              operations: statsData,
              window_minutes: Math.round(windowMs / 60000),
              timestamp: Date.now()
            }
          })
        }

      case 'alerts':
        const alerts = performanceMonitor.getPerformanceAlerts()
        return NextResponse.json<ApiResponse>({
          success: true,
          data: {
            alerts,
            alert_count: alerts.length,
            critical_count: alerts.filter(a => a.severity === 'critical').length,
            warning_count: alerts.filter(a => a.severity === 'warning').length,
            timestamp: Date.now()
          }
        })

      case 'cache':
        const cacheStats = cache.getCacheStats()
        return NextResponse.json<ApiResponse>({
          success: true,
          data: {
            ...cacheStats,
            hit_rate_estimate: 'N/A', // Would need to track hits/misses to calculate
            timestamp: Date.now()
          }
        })

      case 'metrics':
        if (operation) {
          const recentMetrics = performanceMonitor.getRecentMetrics(operation, windowMs)
          return NextResponse.json<ApiResponse>({
            success: true,
            data: {
              operation,
              metrics: recentMetrics,
              count: recentMetrics.length,
              window_minutes: Math.round(windowMs / 60000),
              timestamp: Date.now()
            }
          })
        } else {
          return NextResponse.json<ApiResponse>(
            { success: false, error: 'Operation parameter required for metrics type' },
            { status: 400 }
          )
        }

      default:
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Invalid type parameter. Use: summary, stats, alerts, cache, metrics' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Performance monitoring API error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all' // all, metrics, cache

    const performanceMonitor = BulkCodePerformanceMonitor.getInstance()
    const cache = BulkCodeCache.getInstance()

    switch (type) {
      case 'metrics':
        performanceMonitor.clearMetrics()
        return NextResponse.json<ApiResponse>({
          success: true,
          message: 'Performance metrics cleared'
        })

      case 'cache':
        cache.invalidateAll()
        return NextResponse.json<ApiResponse>({
          success: true,
          message: 'Cache cleared'
        })

      case 'all':
        performanceMonitor.clearMetrics()
        cache.invalidateAll()
        return NextResponse.json<ApiResponse>({
          success: true,
          message: 'All performance data and cache cleared'
        })

      default:
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Invalid type parameter. Use: all, metrics, cache' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Performance monitoring API error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}