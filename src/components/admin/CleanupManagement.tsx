'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Trash2, Clock, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react'

interface CleanupStats {
  regular_sessions_cleaned: number
  bulk_sessions_cleaned: number
  bulk_codes_decremented: number
  bulk_codes_deactivated: number
  bulk_sessions_terminated: number
  cleanup_timestamp: string
}

interface MonitoringData {
  cleanup_type: string
  total_codes: number
  active_codes: number
  expired_active_codes: number
  total_active_usage: number
  avg_capacity_percentage: number
}

interface CleanupStatus {
  monitoring_stats: MonitoringData[]
  expired_codes: Array<{
    id: string
    code: string
    name: string
    expires_at: string
    usage_count: number
    max_usage_count: number
  }>
  inactive_sessions: Array<{
    id: string
    code_id: string
    last_activity: string
    access_codes: {
      type: string
      code: string
      name: string
    }
  }>
  needs_cleanup: boolean
}

export function CleanupManagement() {
  const [cleanupStats, setCleanupStats] = useState<CleanupStats | null>(null)
  const [cleanupStatus, setCleanupStatus] = useState<CleanupStatus | null>(null)
  const [isRunningCleanup, setIsRunningCleanup] = useState(false)
  const [isLoadingStatus, setIsLoadingStatus] = useState(false)
  const [lastCleanup, setLastCleanup] = useState<string | null>(null)

  // Load cleanup status on component mount
  useEffect(() => {
    loadCleanupStatus()
  }, [])

  const loadCleanupStatus = async () => {
    setIsLoadingStatus(true)
    try {
      const response = await fetch('/api/admin/bulk-codes/scheduled-cleanup')
      const data = await response.json()
      
      if (data.success) {
        setCleanupStatus(data.data)
      }
    } catch (error) {
      console.error('Failed to load cleanup status:', error)
    } finally {
      setIsLoadingStatus(false)
    }
  }

  const runScheduledCleanup = async () => {
    setIsRunningCleanup(true)
    try {
      const response = await fetch('/api/admin/bulk-codes/scheduled-cleanup', {
        method: 'POST'
      })
      const data = await response.json()
      
      if (data.success) {
        setCleanupStats(data.data)
        setLastCleanup(new Date().toISOString())
        // Reload status after cleanup
        await loadCleanupStatus()
      }
    } catch (error) {
      console.error('Failed to run cleanup:', error)
    } finally {
      setIsRunningCleanup(false)
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const getCleanupSummary = () => {
    if (!cleanupStats) return null
    
    const totalSessions = cleanupStats.regular_sessions_cleaned + cleanupStats.bulk_sessions_cleaned
    return {
      totalSessions,
      bulkCodesAffected: cleanupStats.bulk_codes_decremented,
      expiredCodes: cleanupStats.bulk_codes_deactivated,
      terminatedSessions: cleanupStats.bulk_sessions_terminated
    }
  }

  const summary = getCleanupSummary()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Session Cleanup Management</h2>
          <p className="text-gray-600 mt-1">
            Monitor and manage cleanup of inactive sessions and expired bulk codes
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={loadCleanupStatus}
            disabled={isLoadingStatus}
            variant="outline"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingStatus ? 'animate-spin' : ''}`} />
            Refresh Status
          </Button>
          <Button
            onClick={runScheduledCleanup}
            disabled={isRunningCleanup}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {isRunningCleanup ? 'Running Cleanup...' : 'Run Cleanup Now'}
          </Button>
        </div>
      </div>

      {/* Cleanup Status Overview */}
      {cleanupStatus && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center">
              <div className={`p-2 rounded-lg ${cleanupStatus.needs_cleanup ? 'bg-yellow-100' : 'bg-green-100'}`}>
                {cleanupStatus.needs_cleanup ? (
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                )}
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Cleanup Status</p>
                <p className={`text-lg font-semibold ${cleanupStatus.needs_cleanup ? 'text-yellow-600' : 'text-green-600'}`}>
                  {cleanupStatus.needs_cleanup ? 'Cleanup Needed' : 'All Clean'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <Clock className="w-5 h-5 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Expired Codes</p>
                <p className="text-lg font-semibold text-gray-900">
                  {cleanupStatus.expired_codes.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Trash2 className="w-5 h-5 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Inactive Sessions</p>
                <p className="text-lg font-semibold text-gray-900">
                  {cleanupStatus.inactive_sessions.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Last Cleanup Results */}
      {summary && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Last Cleanup Results</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{summary.totalSessions}</p>
              <p className="text-sm text-gray-600">Sessions Cleaned</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{summary.bulkCodesAffected}</p>
              <p className="text-sm text-gray-600">Bulk Codes Updated</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{summary.expiredCodes}</p>
              <p className="text-sm text-gray-600">Expired Codes</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{summary.terminatedSessions}</p>
              <p className="text-sm text-gray-600">Terminated Sessions</p>
            </div>
          </div>
          {lastCleanup && (
            <p className="text-sm text-gray-500 mt-4">
              Last cleanup: {formatTimestamp(lastCleanup)}
            </p>
          )}
        </div>
      )}

      {/* Expired Codes List */}
      {cleanupStatus && cleanupStatus.expired_codes.length > 0 && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Expired Bulk Codes</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expired At
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cleanupStatus.expired_codes.map((code) => (
                  <tr key={code.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {code.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {code.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {code.usage_count} / {code.max_usage_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatTimestamp(code.expires_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inactive Sessions List */}
      {cleanupStatus && cleanupStatus.inactive_sessions.length > 0 && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Inactive Bulk Code Sessions</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Activity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Inactive Duration
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cleanupStatus.inactive_sessions.map((session) => {
                  const inactiveMinutes = Math.floor(
                    (Date.now() - new Date(session.last_activity).getTime()) / (1000 * 60)
                  )
                  return (
                    <tr key={session.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {session.access_codes.code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {session.access_codes.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatTimestamp(session.last_activity)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {inactiveMinutes} minutes
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Monitoring Statistics */}
      {cleanupStatus && cleanupStatus.monitoring_stats.length > 0 && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cleanup Monitoring Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {cleanupStatus.monitoring_stats.map((stat) => (
              <div key={stat.cleanup_type} className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3 capitalize">
                  {stat.cleanup_type.replace('_', ' ')}
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total:</span>
                    <span className="font-medium">{stat.total_codes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Active:</span>
                    <span className="font-medium">{stat.active_codes}</span>
                  </div>
                  {stat.expired_active_codes > 0 && (
                    <div className="flex justify-between">
                      <span className="text-red-600">Expired Active:</span>
                      <span className="font-medium text-red-600">{stat.expired_active_codes}</span>
                    </div>
                  )}
                  {stat.avg_capacity_percentage > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg Capacity:</span>
                      <span className="font-medium">{stat.avg_capacity_percentage.toFixed(1)}%</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}