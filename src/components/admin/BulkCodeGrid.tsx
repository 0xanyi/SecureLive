'use client'

import { useState, useEffect } from 'react'
import { BulkCodeMonitor } from './BulkCodeMonitor'
import { BulkAccessCode, BulkCodeUsage } from '@/types/database'
import { Users, AlertTriangle, Clock, RefreshCw } from 'lucide-react'

interface BulkCodeGridProps {
  bulkCodes: BulkAccessCode[]
  refreshInterval?: number
  onUsageUpdate?: (codeId: string, usage: BulkCodeUsage) => void
}

export function BulkCodeGrid({ 
  bulkCodes, 
  refreshInterval = 30000,
  onUsageUpdate 
}: BulkCodeGridProps) {
  const [usageData, setUsageData] = useState<Record<string, BulkCodeUsage>>({})
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  // Handle usage updates from individual monitors
  const handleUsageUpdate = (codeId: string) => (usage: BulkCodeUsage) => {
    setUsageData(prev => ({
      ...prev,
      [codeId]: usage
    }))
    
    if (onUsageUpdate) {
      onUsageUpdate(codeId, usage)
    }
  }

  // Calculate summary statistics
  const summaryStats = bulkCodes.reduce((acc, code) => {
    const usage = usageData[code.id]
    
    return {
      totalCodes: acc.totalCodes + 1,
      totalCapacity: acc.totalCapacity + code.max_usage_count,
      totalUsage: acc.totalUsage + (usage?.current_usage || 0),
      activeCodes: acc.activeCodes + (usage?.is_expired ? 0 : 1),
      nearCapacityCodes: acc.nearCapacityCodes + (usage?.is_near_capacity ? 1 : 0),
      expiredCodes: acc.expiredCodes + (usage?.is_expired ? 1 : 0)
    }
  }, {
    totalCodes: 0,
    totalCapacity: 0,
    totalUsage: 0,
    activeCodes: 0,
    nearCapacityCodes: 0,
    expiredCodes: 0
  })

  const overallCapacityPercentage = summaryStats.totalCapacity > 0 
    ? Math.round((summaryStats.totalUsage / summaryStats.totalCapacity) * 100)
    : 0

  // Refresh all data
  const refreshAll = () => {
    setLastRefresh(new Date())
    // The individual monitors will refresh automatically
  }

  if (bulkCodes.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <div className="text-gray-400 mb-4">
          <Users className="w-12 h-12 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No bulk codes found
        </h3>
        <p className="text-gray-500">
          Create your first bulk access code to start monitoring usage.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Bulk Codes Overview</h2>
          <button
            onClick={refreshAll}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh All
          </button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {summaryStats.totalCodes}
            </div>
            <div className="text-sm text-gray-500">Total Codes</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {summaryStats.activeCodes}
            </div>
            <div className="text-sm text-gray-500">Active</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600">
              {summaryStats.nearCapacityCodes}
            </div>
            <div className="text-sm text-gray-500">Near Capacity</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {summaryStats.expiredCodes}
            </div>
            <div className="text-sm text-gray-500">Expired</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {summaryStats.totalUsage}
            </div>
            <div className="text-sm text-gray-500">Total Usage</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {summaryStats.totalCapacity}
            </div>
            <div className="text-sm text-gray-500">Total Capacity</div>
          </div>
        </div>
        
        {/* Overall capacity bar */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Capacity Usage</span>
            <span className="text-sm text-gray-500">{overallCapacityPercentage}%</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                overallCapacityPercentage >= 90
                  ? 'bg-red-500'
                  : overallCapacityPercentage >= 70
                  ? 'bg-amber-500'
                  : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(overallCapacityPercentage, 100)}%` }}
            />
          </div>
        </div>
        
        {/* Alerts */}
        {summaryStats.nearCapacityCodes > 0 && (
          <div className="flex items-center gap-2 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <span className="text-sm text-amber-700">
              {summaryStats.nearCapacityCodes} bulk code{summaryStats.nearCapacityCodes > 1 ? 's are' : ' is'} near capacity (≥80%)
            </span>
          </div>
        )}
        
        {summaryStats.expiredCodes > 0 && (
          <div className="flex items-center gap-2 mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <Clock className="w-5 h-5 text-red-600" />
            <span className="text-sm text-red-700">
              {summaryStats.expiredCodes} bulk code{summaryStats.expiredCodes > 1 ? 's have' : ' has'} expired
            </span>
          </div>
        )}
      </div>

      {/* Individual Bulk Code Monitors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {bulkCodes.map((bulkCode) => (
          <BulkCodeMonitor
            key={bulkCode.id}
            bulkCode={bulkCode}
            refreshInterval={refreshInterval}
            onUsageUpdate={handleUsageUpdate(bulkCode.id)}
          />
        ))}
      </div>
    </div>
  )
}