'use client'

import { useState, useEffect } from 'react'
import { 
  AlertTriangle, 
  XCircle, 
  Clock, 
  X,
  RefreshCw
} from 'lucide-react'
import { useBulkCodeUpdates } from '@/hooks/useBulkCodeUpdates'
import { BulkCodeUsage } from '@/types/database'

interface BulkCodeAlertsProps {
  className?: string
  showRefreshButton?: boolean
}

export function BulkCodeAlerts({ 
  className = '',
  showRefreshButton = false 
}: BulkCodeAlertsProps) {
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())
  const { bulkCodeUsages, isLoading, error, refreshNow } = useBulkCodeUpdates({
    refreshInterval: 30000 // 30 seconds
  })

  // Filter for codes that need attention
  const alertCodes = bulkCodeUsages.filter(usage => {
    if (dismissedAlerts.has(usage.code_id)) return false
    
    return (
      usage.is_near_capacity || 
      usage.is_expired || 
      usage.capacity_percentage >= 100 ||
      usage.time_remaining_minutes < 60
    )
  })

  const dismissAlert = (codeId: string) => {
    setDismissedAlerts(prev => new Set([...prev, codeId]))
  }

  const getAlertType = (usage: BulkCodeUsage) => {
    if (usage.is_expired || usage.capacity_percentage >= 100) {
      return {
        type: 'error' as const,
        icon: XCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      }
    }
    
    if (usage.is_near_capacity || usage.time_remaining_minutes < 60) {
      return {
        type: 'warning' as const,
        icon: AlertTriangle,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200'
      }
    }
    
    return {
      type: 'info' as const,
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    }
  }

  const getAlertMessage = (usage: BulkCodeUsage) => {
    if (usage.is_expired) {
      return 'Bulk code has expired'
    }
    
    if (usage.capacity_percentage >= 100) {
      return 'Bulk code has reached maximum capacity'
    }
    
    if (usage.is_near_capacity) {
      return `Bulk code is at ${usage.capacity_percentage}% capacity`
    }
    
    if (usage.time_remaining_minutes < 60) {
      return `Bulk code expires in ${usage.time_remaining_minutes} minutes`
    }
    
    return 'Bulk code needs attention'
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 text-red-800">
          <XCircle className="w-5 h-5" />
          <span className="font-medium">Error loading bulk code alerts</span>
        </div>
        <p className="text-red-600 mt-1 text-sm">{error}</p>
      </div>
    )
  }

  if (alertCodes.length === 0) {
    return null
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {showRefreshButton && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">Bulk Code Alerts</h3>
          <button
            onClick={refreshNow}
            disabled={isLoading}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            title="Refresh alerts"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      )}
      
      {alertCodes.map((usage) => {
        const alert = getAlertType(usage)
        
        return (
          <div
            key={usage.code_id}
            className={`flex items-start gap-3 p-3 rounded-lg border ${alert.bgColor} ${alert.borderColor}`}
          >
            <alert.icon className={`w-4 h-4 mt-0.5 ${alert.color}`} />
            
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${alert.color}`}>
                {getAlertMessage(usage)}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Code: {usage.code_id.slice(0, 8)}... • 
                Usage: {usage.current_usage}/{usage.max_capacity}
                {usage.time_remaining_minutes > 0 && (
                  <> • {Math.floor(usage.time_remaining_minutes / 60)}h {usage.time_remaining_minutes % 60}m remaining</>
                )}
              </p>
            </div>
            
            <button
              onClick={() => dismissAlert(usage.code_id)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="Dismiss alert"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )
      })}
    </div>
  )
}