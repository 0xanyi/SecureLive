'use client'

import { useState, useEffect } from 'react'
import { 
  Users, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Loader2
} from 'lucide-react'
import { BulkAccessCode, BulkCodeUsage } from '@/types/database'

interface BulkCodeStatusProps {
  bulkCode: BulkAccessCode
  compact?: boolean
  showTimeRemaining?: boolean
  refreshInterval?: number
  onUsageUpdate?: (usage: BulkCodeUsage) => void
}

export function BulkCodeStatus({ 
  bulkCode, 
  compact = false,
  showTimeRemaining = true,
  refreshInterval = 60000, // 1 minute for status component
  onUsageUpdate 
}: BulkCodeStatusProps) {
  const [usage, setUsage] = useState<BulkCodeUsage | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Calculate derived values
  const capacityPercentage = usage ? Math.round((usage.current_usage / usage.max_capacity) * 100) : 0
  const isNearCapacity = capacityPercentage >= 80
  const isExpired = usage?.is_expired || false
  const timeRemaining = usage?.time_remaining_minutes || 0

  // Fetch usage data
  const fetchUsage = async () => {
    try {
      setError(null)
      const response = await fetch(`/api/admin/bulk-codes/usage-simple?codeId=${bulkCode.id}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch usage data')
      }
      
      const data = await response.json()
      if (data.success && data.data) {
        setUsage(data.data)
        
        if (onUsageUpdate) {
          onUsageUpdate(data.data)
        }
      } else {
        throw new Error(data.error || 'Failed to fetch usage data')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  // Set up polling for updates
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

  // Get status display
  const getStatusDisplay = () => {
    if (isExpired) {
      return {
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        icon: XCircle,
        text: 'Expired',
        dotColor: 'bg-red-500'
      }
    }
    
    if (capacityPercentage >= 100) {
      return {
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        icon: XCircle,
        text: 'Full',
        dotColor: 'bg-red-500'
      }
    }
    
    if (isNearCapacity) {
      return {
        color: 'text-amber-600',
        bgColor: 'bg-amber-100',
        icon: AlertTriangle,
        text: 'Near Full',
        dotColor: 'bg-amber-500'
      }
    }
    
    return {
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      icon: CheckCircle,
      text: 'Active',
      dotColor: 'bg-green-500'
    }
  }

  const status = getStatusDisplay()

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${compact ? 'text-sm' : ''}`}>
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        <span className="text-gray-500">Loading...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center gap-2 ${compact ? 'text-sm' : ''}`}>
        <XCircle className="w-4 h-4 text-red-500" />
        <span className="text-red-600">Error</span>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        {/* Status indicator */}
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${status.dotColor}`} />
          <span className={`text-sm font-medium ${status.color}`}>
            {status.text}
          </span>
        </div>
        
        {/* Usage */}
        <div className="text-sm text-gray-600">
          {usage?.current_usage || 0}/{usage?.max_capacity || bulkCode.max_usage_count}
        </div>
        
        {/* Progress bar */}
        <div className="flex-1 min-w-[60px]">
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${
                capacityPercentage >= 100
                  ? 'bg-red-500'
                  : isNearCapacity
                  ? 'bg-amber-500'
                  : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
            />
          </div>
        </div>
        
        {/* Time remaining */}
        {showTimeRemaining && (
          <div className={`text-sm ${
            isExpired 
              ? 'text-red-600' 
              : timeRemaining < 60 
              ? 'text-amber-600' 
              : 'text-gray-600'
          }`}>
            {formatTimeRemaining(timeRemaining)}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Status and usage */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${status.bgColor}`}>
            <status.icon className={`w-4 h-4 ${status.color}`} />
          </div>
          <span className={`font-medium ${status.color}`}>
            {status.text}
          </span>
        </div>
        
        <div className="text-sm text-gray-600">
          <span className="font-medium">{usage?.current_usage || 0}</span>
          <span className="text-gray-400"> / </span>
          <span>{usage?.max_capacity || bulkCode.max_usage_count}</span>
        </div>
      </div>
      
      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">Capacity</span>
          <span className="text-xs text-gray-500">{capacityPercentage}%</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              capacityPercentage >= 100
                ? 'bg-red-500'
                : isNearCapacity
                ? 'bg-amber-500'
                : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
          />
        </div>
      </div>
      
      {/* Time remaining */}
      {showTimeRemaining && (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className={`text-sm ${
            isExpired 
              ? 'text-red-600' 
              : timeRemaining < 60 
              ? 'text-amber-600' 
              : 'text-gray-600'
          }`}>
            {formatTimeRemaining(timeRemaining)}
          </span>
        </div>
      )}
      
      {/* Warnings */}
      {isNearCapacity && !isExpired && capacityPercentage < 100 && (
        <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
          <AlertTriangle className="w-3 h-3 text-amber-600" />
          <span className="text-amber-700">Near capacity</span>
        </div>
      )}
      
      {capacityPercentage >= 100 && !isExpired && (
        <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
          <XCircle className="w-3 h-3 text-red-600" />
          <span className="text-red-700">At capacity</span>
        </div>
      )}
      
      {isExpired && (
        <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
          <XCircle className="w-3 h-3 text-red-600" />
          <span className="text-red-700">Expired</span>
        </div>
      )}
    </div>
  )
}