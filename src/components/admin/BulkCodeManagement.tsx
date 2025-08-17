'use client'

import { useState, useEffect } from 'react'
import { BulkCodeGrid } from './BulkCodeGrid'
import { BulkCodeStatus } from './BulkCodeStatus'
import { BulkAccessCode, BulkCodeUsage } from '@/types/database'
import { 
  Users, 
  Grid3X3, 
  List, 
  RefreshCw, 
  AlertTriangle,
  Clock,
  TrendingUp,
  Filter,
  Search
} from 'lucide-react'

interface BulkCodeManagementProps {
  initialBulkCodes?: BulkAccessCode[]
  refreshInterval?: number
}

type ViewMode = 'grid' | 'list'
type FilterMode = 'all' | 'active' | 'near_capacity' | 'expired'

export function BulkCodeManagement({ 
  initialBulkCodes = [],
  refreshInterval = 30000 
}: BulkCodeManagementProps) {
  const [bulkCodes, setBulkCodes] = useState<BulkAccessCode[]>(initialBulkCodes)
  const [usageData, setUsageData] = useState<Record<string, BulkCodeUsage>>({})
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch bulk codes
  const fetchBulkCodes = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/admin/codes?type=bulk')
      
      if (!response.ok) {
        throw new Error('Failed to fetch bulk codes')
      }
      
      const data = await response.json()
      if (data.success) {
        setBulkCodes(data.codes || [])
      } else {
        throw new Error(data.error || 'Failed to fetch bulk codes')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle usage updates
  const handleUsageUpdate = (codeId: string, usage: BulkCodeUsage) => {
    setUsageData(prev => ({
      ...prev,
      [codeId]: usage
    }))
  }

  // Filter bulk codes based on current filters
  const filteredBulkCodes = bulkCodes.filter(code => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      if (!code.name.toLowerCase().includes(searchLower) && 
          !code.code.toLowerCase().includes(searchLower)) {
        return false
      }
    }
    
    // Status filter
    const usage = usageData[code.id]
    
    switch (filterMode) {
      case 'active':
        return !usage?.is_expired && (usage?.current_usage || 0) < (usage?.max_capacity || code.max_usage_count)
      case 'near_capacity':
        return usage?.is_near_capacity && !usage?.is_expired
      case 'expired':
        return usage?.is_expired
      default:
        return true
    }
  })

  // Calculate summary stats
  const summaryStats = bulkCodes.reduce((acc, code) => {
    const usage = usageData[code.id]
    
    return {
      total: acc.total + 1,
      active: acc.active + (usage?.is_expired ? 0 : 1),
      nearCapacity: acc.nearCapacity + (usage?.is_near_capacity ? 1 : 0),
      expired: acc.expired + (usage?.is_expired ? 1 : 0),
      totalUsage: acc.totalUsage + (usage?.current_usage || 0),
      totalCapacity: acc.totalCapacity + code.max_usage_count
    }
  }, {
    total: 0,
    active: 0,
    nearCapacity: 0,
    expired: 0,
    totalUsage: 0,
    totalCapacity: 0
  })

  // Load bulk codes on mount
  useEffect(() => {
    if (initialBulkCodes.length === 0) {
      fetchBulkCodes()
    }
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bulk Code Management</h1>
          <p className="text-gray-600 mt-1">
            Monitor and manage bulk access codes in real-time
          </p>
        </div>
        
        <button
          onClick={fetchBulkCodes}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{summaryStats.total}</div>
              <div className="text-sm text-gray-500">Total Codes</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{summaryStats.active}</div>
              <div className="text-sm text-gray-500">Active</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-600">{summaryStats.nearCapacity}</div>
              <div className="text-sm text-gray-500">Near Full</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Clock className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{summaryStats.expired}</div>
              <div className="text-sm text-gray-500">Expired</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {summaryStats.totalUsage}/{summaryStats.totalCapacity}
              </div>
              <div className="text-sm text-gray-500">Usage</div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search codes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="flex items-center gap-3">
            {/* Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={filterMode}
                onChange={(e) => setFilterMode(e.target.value as FilterMode)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Codes</option>
                <option value="active">Active Only</option>
                <option value="near_capacity">Near Capacity</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            
            {/* View Mode */}
            <div className="flex items-center border border-gray-300 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${
                  viewMode === 'grid'
                    ? 'bg-blue-100 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                } transition-colors`}
                title="Grid view"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${
                  viewMode === 'list'
                    ? 'bg-blue-100 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                } transition-colors`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Active filters indicator */}
        {(searchTerm || filterMode !== 'all') && (
          <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
            <span>Showing {filteredBulkCodes.length} of {bulkCodes.length} codes</span>
            {searchTerm && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                Search: "{searchTerm}"
              </span>
            )}
            {filterMode !== 'all' && (
              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                Filter: {filterMode.replace('_', ' ')}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">Error loading bulk codes</span>
          </div>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button
            onClick={fetchBulkCodes}
            className="mt-3 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Content */}
      {viewMode === 'grid' ? (
        <BulkCodeGrid
          bulkCodes={filteredBulkCodes}
          refreshInterval={refreshInterval}
          onUsageUpdate={handleUsageUpdate}
        />
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code & Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status & Usage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Capacity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time Remaining
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBulkCodes.map((code) => (
                  <tr key={code.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="font-medium text-gray-900">{code.name}</div>
                        <div className="text-sm text-gray-500 font-mono">{code.code}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <BulkCodeStatus
                        bulkCode={code}
                        compact={true}
                        showTimeRemaining={false}
                        refreshInterval={refreshInterval}
                        onUsageUpdate={(usage) => handleUsageUpdate(code.id, usage)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {usageData[code.id]?.current_usage || 0} / {code.max_usage_count}
                      </div>
                      <div className="text-xs text-gray-500">
                        {Math.round(((usageData[code.id]?.current_usage || 0) / code.max_usage_count) * 100)}% used
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${
                        usageData[code.id]?.is_expired 
                          ? 'text-red-600' 
                          : (usageData[code.id]?.time_remaining_minutes || 0) < 60 
                          ? 'text-amber-600' 
                          : 'text-gray-900'
                      }`}>
                        {usageData[code.id]?.time_remaining_minutes 
                          ? (() => {
                              const minutes = usageData[code.id].time_remaining_minutes
                              if (minutes <= 0) return 'Expired'
                              const hours = Math.floor(minutes / 60)
                              const mins = minutes % 60
                              return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
                            })()
                          : 'Loading...'
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(code.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(code.created_at).toLocaleTimeString()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredBulkCodes.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <Users className="w-12 h-12 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm || filterMode !== 'all' ? 'No matching codes found' : 'No bulk codes yet'}
                </h3>
                <p className="text-gray-500">
                  {searchTerm || filterMode !== 'all' 
                    ? 'Try adjusting your search or filter criteria.'
                    : 'Create your first bulk access code to get started.'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}