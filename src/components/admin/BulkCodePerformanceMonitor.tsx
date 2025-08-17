'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'

interface PerformanceSummary {
  totalOperations: number
  operationBreakdown: Record<string, number>
  averageResponseTime: number
  successRate: number
  slowestOperations: Array<{ operation: string; averageDuration: number }>
  highConcurrencyOperations: Array<{ operation: string; maxConcurrency: number }>
  window_minutes: number
  timestamp: number
}

interface PerformanceAlert {
  type: 'slow_operation' | 'high_error_rate' | 'high_concurrency'
  operation: string
  message: string
  severity: 'warning' | 'critical'
  value: number
}

interface CacheStats {
  codeEntries: number
  usageEntries: number
  codeByIdEntries: number
  memoryUsageEstimate: number
  timestamp: number
}

export default function BulkCodePerformanceMonitor() {
  const [summary, setSummary] = useState<PerformanceSummary | null>(null)
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([])
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(30) // seconds

  const fetchPerformanceData = async () => {
    try {
      setError(null)
      
      // Fetch summary, alerts, and cache stats in parallel
      const [summaryRes, alertsRes, cacheRes] = await Promise.all([
        fetch('/api/admin/bulk-codes/performance?type=summary'),
        fetch('/api/admin/bulk-codes/performance?type=alerts'),
        fetch('/api/admin/bulk-codes/performance?type=cache')
      ])

      if (summaryRes.ok) {
        const summaryData = await summaryRes.json()
        setSummary(summaryData.data)
      }

      if (alertsRes.ok) {
        const alertsData = await alertsRes.json()
        setAlerts(alertsData.data.alerts || [])
      }

      if (cacheRes.ok) {
        const cacheData = await cacheRes.json()
        setCacheStats(cacheData.data)
      }

    } catch (err) {
      setError('Failed to fetch performance data')
      console.error('Performance monitoring error:', err)
    } finally {
      setLoading(false)
    }
  }

  const clearMetrics = async () => {
    try {
      const response = await fetch('/api/admin/bulk-codes/performance?type=metrics', {
        method: 'DELETE'
      })
      
      if (response.ok) {
        await fetchPerformanceData()
      }
    } catch (err) {
      console.error('Failed to clear metrics:', err)
    }
  }

  const clearCache = async () => {
    try {
      const response = await fetch('/api/admin/bulk-codes/performance?type=cache', {
        method: 'DELETE'
      })
      
      if (response.ok) {
        await fetchPerformanceData()
      }
    } catch (err) {
      console.error('Failed to clear cache:', err)
    }
  }

  useEffect(() => {
    fetchPerformanceData()
  }, [])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(fetchPerformanceData, refreshInterval * 1000)
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval])

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Bulk Code Performance Monitor</h2>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">Auto-refresh:</label>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                disabled={!autoRefresh}
                className="text-sm border rounded px-2 py-1"
              >
                <option value={10}>10s</option>
                <option value={30}>30s</option>
                <option value={60}>1m</option>
                <option value={300}>5m</option>
              </select>
            </div>
            <Button onClick={fetchPerformanceData} size="sm">
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Alerts</h3>
          <div className="space-y-3">
            {alerts.map((alert, index) => (
              <div
                key={index}
                className={`p-4 rounded-md border ${
                  alert.severity === 'critical'
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{alert.operation}</p>
                    <p className="text-sm">{alert.message}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    alert.severity === 'critical'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {alert.severity.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Summary */}
      {summary && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Performance Summary ({summary.window_minutes} min window)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-600 font-medium">Total Operations</p>
              <p className="text-2xl font-bold text-blue-900">{summary.totalOperations.toLocaleString()}</p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-600 font-medium">Success Rate</p>
              <p className="text-2xl font-bold text-green-900">{summary.successRate.toFixed(1)}%</p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-purple-600 font-medium">Avg Response Time</p>
              <p className="text-2xl font-bold text-purple-900">{formatDuration(summary.averageResponseTime)}</p>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-lg">
              <p className="text-sm text-orange-600 font-medium">Operations/min</p>
              <p className="text-2xl font-bold text-orange-900">
                {Math.round(summary.totalOperations / summary.window_minutes)}
              </p>
            </div>
          </div>

          {/* Operation Breakdown */}
          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-900 mb-3">Operation Breakdown</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(summary.operationBreakdown).map(([operation, count]) => (
                <div key={operation} className="bg-gray-50 p-3 rounded">
                  <p className="text-sm font-medium text-gray-900">{operation}</p>
                  <p className="text-lg font-bold text-gray-700">{count}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Slowest Operations */}
          {summary.slowestOperations.length > 0 && (
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-900 mb-3">Slowest Operations</h4>
              <div className="space-y-2">
                {summary.slowestOperations.map((op, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-red-50 rounded">
                    <span className="text-sm font-medium">{op.operation}</span>
                    <span className="text-sm text-red-600">{formatDuration(op.averageDuration)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* High Concurrency Operations */}
          {summary.highConcurrencyOperations.length > 0 && (
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">High Concurrency Operations</h4>
              <div className="space-y-2">
                {summary.highConcurrencyOperations.map((op, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-yellow-50 rounded">
                    <span className="text-sm font-medium">{op.operation}</span>
                    <span className="text-sm text-yellow-600">{op.maxConcurrency} concurrent</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cache Statistics */}
      {cacheStats && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Cache Statistics</h3>
            <Button onClick={clearCache} variant="outline" size="sm">
              Clear Cache
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-indigo-50 p-4 rounded-lg">
              <p className="text-sm text-indigo-600 font-medium">Code Entries</p>
              <p className="text-2xl font-bold text-indigo-900">{cacheStats.codeEntries}</p>
            </div>
            
            <div className="bg-teal-50 p-4 rounded-lg">
              <p className="text-sm text-teal-600 font-medium">Usage Entries</p>
              <p className="text-2xl font-bold text-teal-900">{cacheStats.usageEntries}</p>
            </div>
            
            <div className="bg-pink-50 p-4 rounded-lg">
              <p className="text-sm text-pink-600 font-medium">Lookup Entries</p>
              <p className="text-2xl font-bold text-pink-900">{cacheStats.codeByIdEntries}</p>
            </div>
            
            <div className="bg-cyan-50 p-4 rounded-lg">
              <p className="text-sm text-cyan-600 font-medium">Memory Usage</p>
              <p className="text-2xl font-bold text-cyan-900">{formatBytes(cacheStats.memoryUsageEstimate)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Actions</h3>
        <div className="flex space-x-4">
          <Button onClick={clearMetrics} variant="outline">
            Clear Performance Metrics
          </Button>
          <Button onClick={clearCache} variant="outline">
            Clear Cache
          </Button>
        </div>
      </div>
    </div>
  )
}