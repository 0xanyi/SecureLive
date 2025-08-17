'use client'

import { useState, useEffect } from 'react'
import { BarChart3, Download, TrendingUp, Users, Clock, AlertTriangle } from 'lucide-react'
import type { ApiResponse } from '@/types/database'
import { BulkCodeUsageHistory } from './BulkCodeUsageHistory'

interface BulkCodeCapacityMetrics {
  total_bulk_codes: number
  active_bulk_codes: number
  expired_bulk_codes: number
  average_capacity_utilization: number
  codes_at_full_capacity: number
  codes_near_capacity: number
  total_capacity_available: number
  total_capacity_used: number
}

interface BulkCodeAnalytics {
  code_id: string
  code_name: string
  created_at: string
  expires_at: string
  max_usage_count: number
  total_usage: number
  peak_concurrent_usage: number
  average_session_duration: number
  capacity_utilization: number
  time_to_peak: number
  is_expired: boolean
  event_title?: string
  usage_by_hour: Array<{
    hour: number
    usage_count: number
  }>
}

export function BulkCodeAnalytics() {
  const [capacityMetrics, setCapacityMetrics] = useState<BulkCodeCapacityMetrics | null>(null)
  const [analytics, setAnalytics] = useState<BulkCodeAnalytics[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d')
  const [exportLoading, setExportLoading] = useState(false)

  useEffect(() => {
    fetchAnalyticsData()
  }, [selectedTimeRange])

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch capacity metrics
      const metricsResponse = await fetch('/api/admin/bulk-codes/analytics?type=capacity-metrics')
      const metricsData: ApiResponse<BulkCodeCapacityMetrics> = await metricsResponse.json()

      if (metricsData.success && metricsData.data) {
        setCapacityMetrics(metricsData.data)
      }

      // Fetch analytics overview
      const startDate = getStartDate(selectedTimeRange)
      const analyticsResponse = await fetch(
        `/api/admin/bulk-codes/analytics?type=overview&startDate=${startDate}`
      )
      const analyticsData: ApiResponse<BulkCodeAnalytics[]> = await analyticsResponse.json()

      if (analyticsData.success && analyticsData.data) {
        setAnalytics(analyticsData.data)
      }
    } catch (err) {
      console.error('Error fetching analytics data:', err)
      setError('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  const getStartDate = (range: string) => {
    const now = new Date()
    switch (range) {
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
      default:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    }
  }

  const handleExport = async (type: 'codes' | 'sessions' | 'analytics', format: 'json' | 'csv') => {
    try {
      setExportLoading(true)
      const startDate = getStartDate(selectedTimeRange)
      const response = await fetch(
        `/api/admin/bulk-codes/export?type=${type}&format=${format}&startDate=${startDate}`
      )

      if (format === 'csv') {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `bulk-${type}-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const data = await response.json()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `bulk-${type}-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (err) {
      console.error('Export error:', err)
      setError('Failed to export data')
    } finally {
      setExportLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Analytics</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchAnalyticsData}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Bulk Code Analytics</h2>
        <div className="flex items-center space-x-4">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          
          <div className="relative">
            <button
              onClick={() => document.getElementById('export-menu')?.classList.toggle('hidden')}
              disabled={exportLoading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>{exportLoading ? 'Exporting...' : 'Export'}</span>
            </button>
            
            <div id="export-menu" className="hidden absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
              <div className="py-1">
                <button
                  onClick={() => handleExport('codes', 'csv')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Export Codes (CSV)
                </button>
                <button
                  onClick={() => handleExport('sessions', 'csv')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Export Sessions (CSV)
                </button>
                <button
                  onClick={() => handleExport('analytics', 'json')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Export Analytics (JSON)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Capacity Metrics Cards */}
      {capacityMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Capacity</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {capacityMetrics.total_capacity_available.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {capacityMetrics.total_capacity_used.toLocaleString()} used
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Utilization</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {capacityMetrics.average_capacity_utilization.toFixed(1)}%
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {capacityMetrics.active_bulk_codes} active codes
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-500">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Near Capacity</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {capacityMetrics.codes_near_capacity}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  ≥80% utilization
                </p>
              </div>
              <div className="p-3 rounded-lg bg-orange-500">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Full Capacity</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {capacityMetrics.codes_at_full_capacity}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  100% utilization
                </p>
              </div>
              <div className="p-3 rounded-lg bg-red-500">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Code Performance</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Event
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Capacity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Peak Concurrent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analytics.map((code) => (
                <tr key={code.code_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{code.code_name}</div>
                    <div className="text-sm text-gray-500">
                      Created {new Date(code.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {code.event_title || 'No event'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {code.total_usage} / {code.max_usage_count}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div
                        className={`h-2 rounded-full ${
                          code.capacity_utilization >= 100
                            ? 'bg-red-500'
                            : code.capacity_utilization >= 80
                            ? 'bg-orange-500'
                            : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(code.capacity_utilization, 100)}%` }}
                      ></div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-medium ${
                      code.capacity_utilization >= 100
                        ? 'text-red-600'
                        : code.capacity_utilization >= 80
                        ? 'text-orange-600'
                        : 'text-green-600'
                    }`}>
                      {code.capacity_utilization.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {code.peak_concurrent_usage}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {code.average_session_duration.toFixed(1)} min
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      code.is_expired
                        ? 'bg-red-100 text-red-800'
                        : code.capacity_utilization >= 100
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {code.is_expired ? 'Expired' : code.capacity_utilization >= 100 ? 'Full' : 'Active'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {analytics.length === 0 && (
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Data</h3>
            <p className="text-gray-600">No bulk codes found for the selected time range.</p>
          </div>
        )}
      </div>

      {/* Usage History */}
      <BulkCodeUsageHistory limit={100} />
    </div>
  )
}