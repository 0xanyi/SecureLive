'use client'

import { useState } from 'react'
import { BulkCodeMonitor } from './BulkCodeMonitor'
import { BulkCodeStatus } from './BulkCodeStatus'
import { BulkCodeGrid } from './BulkCodeGrid'
import { BulkAccessCode } from '@/types/database'

// Mock data for demonstration
const mockBulkCodes: BulkAccessCode[] = [
  {
    id: '1',
    code: 'BULK001',
    type: 'bulk',
    name: 'Conference Day 1',
    max_concurrent_sessions: 1,
    usage_count: 127,
    max_usage_count: 400,
    is_active: true,
    created_by: 'admin',
    created_at: '2024-01-15T10:00:00Z',
    expires_at: '2024-01-16T10:00:00Z'
  },
  {
    id: '2',
    code: 'BULK002',
    type: 'bulk',
    name: 'Workshop Session',
    max_concurrent_sessions: 1,
    usage_count: 45,
    max_usage_count: 50,
    is_active: true,
    created_by: 'admin',
    created_at: '2024-01-15T14:00:00Z',
    expires_at: '2024-01-16T14:00:00Z'
  },
  {
    id: '3',
    code: 'BULK003',
    type: 'bulk',
    name: 'Evening Event',
    max_concurrent_sessions: 1,
    usage_count: 200,
    max_usage_count: 200,
    is_active: false,
    created_by: 'admin',
    created_at: '2024-01-14T18:00:00Z',
    expires_at: '2024-01-15T18:00:00Z'
  }
]

export function BulkCodeDemo() {
  const [selectedView, setSelectedView] = useState<'monitor' | 'status' | 'grid'>('monitor')

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Bulk Code Components Demo
        </h2>
        
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setSelectedView('monitor')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedView === 'monitor'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Monitor View
          </button>
          <button
            onClick={() => setSelectedView('status')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedView === 'status'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Status View
          </button>
          <button
            onClick={() => setSelectedView('grid')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedView === 'grid'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Grid View
          </button>
        </div>

        {selectedView === 'monitor' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Individual Monitor Components</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {mockBulkCodes.slice(0, 2).map((code) => (
                <BulkCodeMonitor
                  key={code.id}
                  bulkCode={code}
                  refreshInterval={60000} // 1 minute for demo
                />
              ))}
            </div>
          </div>
        )}

        {selectedView === 'status' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Status Components</h3>
            
            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-700">Compact Status</h4>
              {mockBulkCodes.map((code) => (
                <div key={code.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{code.name}</span>
                    <span className="text-sm text-gray-500 font-mono">{code.code}</span>
                  </div>
                  <BulkCodeStatus
                    bulkCode={code}
                    compact={true}
                    refreshInterval={60000}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-700">Full Status</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mockBulkCodes.map((code) => (
                  <div key={code.id} className="bg-white border border-gray-200 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 mb-3">{code.name}</h5>
                    <BulkCodeStatus
                      bulkCode={code}
                      compact={false}
                      refreshInterval={60000}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {selectedView === 'grid' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Grid View</h3>
            <BulkCodeGrid
              bulkCodes={mockBulkCodes}
              refreshInterval={60000}
            />
          </div>
        )}
      </div>
    </div>
  )
}