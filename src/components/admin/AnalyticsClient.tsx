'use client'

import { useState, useEffect } from 'react'
import { AttendanceChart } from './AttendanceChart'
import { SessionsOverview } from './SessionsOverview'
import { TopCodes } from './TopCodes'
import { BarChart3, Users, Clock, TrendingUp, Calendar, RefreshCw } from 'lucide-react'

interface DateRange {
  label: string
  value: string
  days: number
}

const dateRanges: DateRange[] = [
  { label: '1 Day', value: '1d', days: 1 },
  { label: '1 Week', value: '1w', days: 7 },
  { label: '2 Weeks', value: '2w', days: 14 },
  { label: '1 Month', value: '1m', days: 30 },
  { label: '3 Months', value: '3m', days: 90 },
]

export function AnalyticsClient() {
  const [selectedRange, setSelectedRange] = useState<DateRange>(dateRanges[2]) // Default to 2 weeks
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<unknown>({
    dailyAttendance: [],
    activeSessions: [],
    attendanceStats: [],
    totalSessions: 0,
    uniqueCodes: 0,
    avgDuration: 0,
    previousPeriodStats: null
  })

  const fetchAnalytics = async (range: DateRange) => {
    setLoading(true)
    try {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(endDate.getDate() - range.days)

      // Fetch analytics data with date range
      const response = await fetch(`/api/admin/analytics?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&days=${range.days}`)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
      } else {
        console.error('Analytics fetch error:', result.error)
      }
    } catch (error) {
      console.error('Analytics fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics(selectedRange)
  }, [selectedRange])

  const handleRangeChange = (range: DateRange) => {
    setSelectedRange(range)
  }

  const handleRefresh = () => {
    fetchAnalytics(selectedRange)
  }

  const calculatePercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / previous) * 100)
  }

  const formatPercentageChange = (change: number) => {
    const sign = change >= 0 ? '+' : ''
    const color = change >= 0 ? 'text-green-600' : 'text-red-600'
    return (
      <span className={`text-sm font-medium ${color}`}>
        {sign}{change}%
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header with Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600">
            Attendance tracking and usage statistics
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Date Range Selector */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <select
              value={selectedRange.value}
              onChange={(e) => {
                const range = dateRanges.find(r => r.value === e.target.value)
                if (range) handleRangeChange(range)
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {dateRanges.map((range) => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
          </div>
          
          {/* Debug Button */}
          <button
            onClick={async () => {
              try {
                const response = await fetch('/api/admin/debug-analytics')
                const result = await response.json()
                console.log('Debug data:', result)
                alert('Debug data logged to console')
              } catch (error) {
                console.error('Debug error:', error)
              }
            }}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            Debug
          </button>

          {/* Seed Test Data Button */}
          <button
            onClick={async () => {
              try {
                const response = await fetch('/api/admin/seed-test-data', { method: 'POST' })
                const result = await response.json()
                if (result.success) {
                  alert(`${result.message}`)
                  handleRefresh()
                } else {
                  alert(`Error: ${result.error}`)
                }
              } catch (error) {
                console.error('Seed error:', error)
                alert('Failed to seed test data')
              }
            }}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            Seed Test Data
          </button>
          
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Sessions</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {loading ? '...' : data.totalSessions.toLocaleString()}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-blue-500">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            {!loading && data.previousPeriodStats && (
              <>
                {formatPercentageChange(
                  calculatePercentageChange(
                    data.totalSessions, 
                    data.previousPeriodStats.totalSessions
                  )
                )}
                <span className="text-sm text-gray-500 ml-2">vs previous period</span>
              </>
            )}
            {loading && <span className="text-sm text-gray-500">Loading...</span>}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Now</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {loading ? '...' : data.activeSessions?.length || 0}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-green-500">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className="text-sm font-medium text-green-600">Live</span>
            <span className="text-sm text-gray-500 ml-2">concurrent users</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Unique Codes</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {loading ? '...' : data.uniqueCodes}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-purple-500">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            {!loading && data.totalSessions > 0 && (
              <>
                <span className="text-sm font-medium text-blue-600">
                  {Math.round((data.uniqueCodes / data.totalSessions) * 100)}%
                </span>
                <span className="text-sm text-gray-500 ml-2">usage rate</span>
              </>
            )}
            {loading && <span className="text-sm text-gray-500">Loading...</span>}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Duration</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {loading ? '...' : `${Math.round(data.avgDuration)}m`}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-orange-500">
              <Clock className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            {!loading && data.previousPeriodStats && (
              <>
                {formatPercentageChange(
                  calculatePercentageChange(
                    data.avgDuration, 
                    data.previousPeriodStats.avgDuration
                  )
                )}
                <span className="text-sm text-gray-500 ml-2">vs previous period</span>
              </>
            )}
            {loading && <span className="text-sm text-gray-500">Loading...</span>}
          </div>
        </div>
      </div>

      {/* Charts and Data */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Attendance Chart */}
        <div className="lg:col-span-2">
          <AttendanceChart data={data.dailyAttendance || []} />
        </div>

        {/* Top Codes */}
        <div>
          <TopCodes attendanceData={data.attendanceStats || []} />
        </div>
      </div>

      {/* Sessions Overview */}
      <SessionsOverview sessions={data.activeSessions || []} />
    </div>
  )
}