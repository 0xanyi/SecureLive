'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, RefreshCw, Clock, XCircle, CheckCircle, TrendingUp } from 'lucide-react'

interface BulkCodeError {
  timestamp: string
  level: string
  operation: string
  codeId?: string
  sessionId?: string
  ipAddress?: string
  error?: {
    code: string
    message: string
    userMessage: string
    statusCode: number
    recoverable: boolean
    details?: Record<string, any>
  }
  details?: Record<string, any>
}

interface ErrorStats {
  [errorCode: string]: number
}

interface RecoveryStats {
  total: number
  byOperation: Record<string, number>
}

interface ErrorMonitorData {
  errors: BulkCodeError[]
  stats: ErrorStats
  recovery: {
    active: any[]
    stats: RecoveryStats
  }
  timeRange: {
    hours: number
    from: string
    to: string
  }
}

export function BulkCodeErrorMonitor() {
  const [data, setData] = useState<ErrorMonitorData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTimeRange, setSelectedTimeRange] = useState(24)
  const [selectedErrorCode, setSelectedErrorCode] = useState<string>('')
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchErrorData = async () => {
    try {
      const params = new URLSearchParams({
        hours: selectedTimeRange.toString()
      })
      
      if (selectedErrorCode) {
        params.append('errorCode', selectedErrorCode)
      }

      const response = await fetch(`/api/admin/bulk-codes/errors?${params}`)
      if (response.ok) {
        const result = await response.json()
        setData(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch error data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchErrorData()
  }, [selectedTimeRange, selectedErrorCode])

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchErrorData, 30000) // Refresh every 30 seconds
      return () => clearInterval(interval)
    }
  }, [autoRefresh, selectedTimeRange, selectedErrorCode])

  const getErrorIcon = (errorCode: string) => {
    switch (errorCode) {
      case 'BULK_CODE_CAPACITY_EXCEEDED':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />
      case 'BULK_CODE_EXPIRED':
        return <Clock className="w-4 h-4 text-gray-500" />
      case 'BULK_CODE_INVALID':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'BULK_CODE_CONCURRENT_ACCESS_CONFLICT':
        return <RefreshCw className="w-4 h-4 text-yellow-500" />
      default:
        return <AlertTriangle className="w-4 h-4 text-red-500" />
    }
  }

  const getErrorSeverity = (level: string) => {
    switch (level.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'error':
        return 'bg-red-50 text-red-700 border-red-100'
      case 'warn':
        return 'bg-yellow-50 text-yellow-700 border-yellow-100'
      case 'info':
        return 'bg-blue-50 text-blue-700 border-blue-100'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-100'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const totalErrors = data?.errors.length || 0
  const criticalErrors = data?.errors.filter(e => e.level === 'critical').length || 0
  const recoverableErrors = data?.errors.filter(e => e.error?.recoverable).length || 0

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading error data...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Bulk Code Error Monitor</h3>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              Auto-refresh
            </label>
            <button
              onClick={fetchErrorData}
              disabled={loading}
              className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-4 mb-4">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value={1}>Last 1 hour</option>
            <option value={6}>Last 6 hours</option>
            <option value={24}>Last 24 hours</option>
            <option value={72}>Last 3 days</option>
            <option value={168}>Last week</option>
          </select>

          <select
            value={selectedErrorCode}
            onChange={(e) => setSelectedErrorCode(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">All error types</option>
            <option value="BULK_CODE_CAPACITY_EXCEEDED">Capacity Exceeded</option>
            <option value="BULK_CODE_EXPIRED">Expired Codes</option>
            <option value="BULK_CODE_INVALID">Invalid Codes</option>
            <option value="BULK_CODE_CONCURRENT_ACCESS_CONFLICT">Concurrent Access</option>
            <option value="BULK_CODE_DATABASE_ERROR">Database Errors</option>
          </select>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-600">Total Errors</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{totalErrors}</div>
          </div>

          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium text-red-600">Critical</span>
            </div>
            <div className="text-2xl font-bold text-red-900 mt-1">{criticalErrors}</div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-600">Recoverable</span>
            </div>
            <div className="text-2xl font-bold text-green-900 mt-1">{recoverableErrors}</div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-600">Active Recoveries</span>
            </div>
            <div className="text-2xl font-bold text-blue-900 mt-1">{data?.recovery.stats.total || 0}</div>
          </div>
        </div>
      </div>

      {/* Error List */}
      <div className="p-6">
        {totalErrors === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
            <p>No errors found in the selected time range</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data?.errors.slice(0, 20).map((error, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${getErrorSeverity(error.level)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {error.error && getErrorIcon(error.error.code)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{error.operation}</span>
                        <span className="text-xs px-2 py-1 bg-white rounded">
                          {error.level.toUpperCase()}
                        </span>
                      </div>
                      
                      {error.error && (
                        <p className="text-sm mb-2">{error.error.userMessage}</p>
                      )}
                      
                      <div className="text-xs text-gray-600 space-y-1">
                        <div>Time: {formatTimestamp(error.timestamp)}</div>
                        {error.codeId && <div>Code ID: {error.codeId.substring(0, 8)}...</div>}
                        {error.sessionId && <div>Session ID: {error.sessionId.substring(0, 8)}...</div>}
                        {error.ipAddress && <div>IP: {error.ipAddress}</div>}
                      </div>
                      
                      {error.error?.details && (
                        <details className="mt-2">
                          <summary className="text-xs cursor-pointer text-gray-500 hover:text-gray-700">
                            Show details
                          </summary>
                          <pre className="text-xs mt-1 p-2 bg-white rounded overflow-x-auto">
                            {JSON.stringify(error.error.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                  
                  {error.error?.recoverable && (
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle className="w-3 h-3" />
                      <span>Recoverable</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {totalErrors > 20 && (
              <div className="text-center py-4 text-gray-500">
                <p>Showing 20 of {totalErrors} errors</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}