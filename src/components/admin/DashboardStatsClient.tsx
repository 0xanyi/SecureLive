'use client'

import { useEffect, useState } from 'react'
import { Ticket, Users, Activity, TrendingUp, Loader2, AlertCircle } from 'lucide-react'

interface StatsData {
  totalCodes: number
  activeCodes: number
  totalSessions: number
  activeSessions: number
  todayAttendance: number
}

export function DashboardStatsClient() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true)
        console.log('Fetching dashboard stats from client...')
        
        const response = await fetch('/api/admin/dashboard-stats')
        const data = await response.json()
        
        console.log('Client received data:', data)
        
        if (data.success) {
          setStats(data.stats)
          setDebugInfo(data.debug)
        } else {
          setError(data.error || 'Failed to fetch stats')
        }
      } catch (err) {
        console.error('Client stats fetch error:', err)
        setError('Network error')
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  const statCards = [
    {
      title: 'Total Access Codes',
      value: stats?.totalCodes || 0,
      icon: Ticket,
      color: 'bg-blue-500',
      change: '+12%',
      changeType: 'positive' as const,
    },
    {
      title: 'Active Sessions',
      value: stats?.activeSessions || 0,
      icon: Users,
      color: 'bg-green-500',
      change: '+5%',
      changeType: 'positive' as const,
    },
    {
      title: 'Today\'s Attendance',
      value: stats?.todayAttendance || 0,
      icon: Activity,
      color: 'bg-purple-500',
      change: '+18%',
      changeType: 'positive' as const,
    },
    {
      title: 'Active Codes',
      value: stats?.activeCodes || 0,
      icon: TrendingUp,
      color: 'bg-orange-500',
      change: '+3%',
      changeType: 'positive' as const,
    },
  ]

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-center h-24">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-2 text-red-800">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">Error loading dashboard stats</span>
        </div>
        <p className="text-red-600 mt-2">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div
            key={stat.title}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stat.value.toLocaleString()}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
            
            <div className="mt-4 flex items-center">
              <span
                className={`text-sm font-medium ${
                  stat.changeType === 'positive'
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {stat.change}
              </span>
              <span className="text-sm text-gray-500 ml-2">from last week</span>
            </div>
          </div>
        ))}
      </div>
      
      {/* Debug info for troubleshooting */}
      {debugInfo && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs text-gray-600">
          <strong>Debug Info:</strong> Sample codes found: {debugInfo.sampleCodes}, 
          Last updated: {new Date(debugInfo.timestamp).toLocaleTimeString()}
        </div>
      )}
    </div>
  )
}