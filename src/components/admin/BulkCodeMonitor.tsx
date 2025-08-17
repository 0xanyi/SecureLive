'use client'

import { useState, useEffect } from 'react'
import { 
  Users, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  TrendingUp
} from 'lucide-react'
import { BulkAccessCode, BulkCodeUsage } from '@/types/database'
import { formatDate } from '@/lib/utils'

interface BulkCodeMonitorProps {
  bulkCode: BulkAccessCode
  refreshInterval?: number // in milliseconds, default 30 seconds
  onUsageUpdate?: (usage: BulkCodeUsage) => void
}

export function BulkCodeMonitor({ 
  bulkCode, 
  refreshInterval = 30000,
  onUsageUpdate 
}: BulkCodeMonitorProps) {
  const [usage, setUsage] = useState<BulkCodeUsage | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Calculate derived values
  const capacityPercentage = usage ? Math.round((usage.current_usage / usage.max_capacity) * 100) : 0
  const isNearCapacity = capacityPercentage >= 80
  const isExpired = usage?.is_expired || false
  const timeRemaining = usage?.time_remaining_minutes || 0

  // Fetch usage data
  const fetchUsage = async () => {
    try {
      setError(null)
      const response = await fetch(`/api/admin/bulk-codes/usage?code_id=${bulkCode.id}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch usage data')
      }
      
      const data = await response.json()
      setUsage(data.usage)
      setLastUpdated(new Date())
      
      if (onUsageUpdate) {
        onUsageUpdate(data.usage)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  // Set up polling for real-time updates
  useEffect(() => {
    fetchUsage()
    
    const interval = setInterval(fetchUsage, refreshInterval)
    return () => clearInterval(interval)
  }, [bulkCode.id, refreshInterval])

  // Format time remaining
  const formatTimeRemaining = (minutes: number): string => {
    if (minutes <= 0) return 'Expired'
    
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  // Get status color and icon
  const getStatusDisplay = () => {
    if (isExpired) {
      return {
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        icon: XCircle,
        text: 'Expired'
      }
    }
    
    if (capacityPercentage >= 100) {
      return {
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        icon: XCircle,
        text: 'Full'
      }
    }
    
    if (isNearCapacity) {
      return {
        color: 'text-amber-600',
        bgColor: 'bg-amber-100',
        icon: AlertTriangle,
        text: 'Near Capacity'
      }
    }
    
    return {
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      icon: CheckCircle,
      text: 'Active'
    }
  }

  const status = getStatusDisplay()

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-16"></div>
          </div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
        <div className="flex items-center gap-3 text-red-600 mb-4">
          <XCircle className="w-5 h-5" />
          <h3 className="font-semibold">Error Loading Usage Data</h3>
        </div>
        <p className="text-red-600 text-sm mb-4">{error}</p>
        <button
          onClick={fetchUsage}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${status.bgColor}`}>
            <Users className={`w-5 h-5 ${status.color}`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{bulkCode.name}</h3>
            <p className="text-sm text-gray-500 font-mono">{bulkCode.code}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
            <status.icon className="w-3 h-3" />
            {status.text}
          </div>
        </div>
      </div>

      {/* Usage Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {usage?.current_usage || 0}
          </div>
          <div className="text-sm text-gray-500">Current Users</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {usage?.max_capacity || bulkCode.max_usage_count}
          </div>
          <div className="text-sm text-gray-500">Max Capacity</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {usage?.active_sessions || 0}
          </div>
          <div className="text-sm text-gray-500">Active Sessions</div>
        </div>
      </div>

      {/* Capacity Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Capacity Usage</span>
          <span className="text-sm text-gray-500">{capacityPercentage}%</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-300 ${
              capacityPercentage >= 100
                ? 'bg-red-500'
                : isNearCapacity
                ? 'bg-amber-500'
                : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
          />
        </div>
        
        {/* Capacity warning */}
        {isNearCapacity && !isExpired && capacityPercentage < 100 && (
          <div className="flex items-center gap-2 mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="text-sm text-amber-700">
              Warning: Code is at {capacityPercentage}% capacity
            </span>
          </div>
        )}
        
        {capacityPercentage >= 100 && !isExpired && (
          <div className="flex items-center gap-2 mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
            <XCircle className="w-4 h-4 text-red-600" />
            <span className="text-sm text-red-700">
              Code has reached maximum capacity
            </span>
          </div>
        )}
      </div>

      {/* Time Remaining */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Time Remaining</span>
        </div>
        
        <div className={`text-lg font-semibold ${
          isExpired 
            ? 'text-red-600' 
            : timeRemaining < 60 
            ? 'text-amber-600' 
            : 'text-gray-900'
        }`}>
          {formatTimeRemaining(timeRemaining)}
        </div>
        
        {bulkCode.expires_at && (
          <div className="text-sm text-gray-500 mt-1">
            Expires: {formatDate(bulkCode.expires_at)}
          </div>
        )}
        
        {isExpired && (
          <div className="flex items-center gap-2 mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
            <XCircle className="w-4 h-4 text-red-600" />
            <span className="text-sm text-red-700">
              This code has expired and is no longer accepting new users
            </span>
          </div>
        )}
      </div>

      {/* Footer with last updated */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <TrendingUp className="w-3 h-3" />
          <span>Real-time monitoring</span>
        </div>
        
        {lastUpdated && (
          <div className="text-xs text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        )}
        
        <button
          onClick={fetchUsage}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          title="Refresh data"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>
    </div>
  )
}