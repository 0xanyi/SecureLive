import { createClient } from '@/lib/supabase/server'
import { DashboardStatsClient } from '@/components/admin/DashboardStatsClient'
import { RecentActivity } from '@/components/admin/RecentActivity'
import { QuickActions } from '@/components/admin/QuickActions'
import { DashboardHeader } from '@/components/admin/DashboardHeader'
import { BulkCodeAlerts } from '@/components/admin/BulkCodeAlerts'

export default async function AdminDashboard() {
  // Mock data for development mode
  const mockStats = {
    total_codes: 25,
    active_codes: 18,
    total_sessions: 142,
    active_sessions: 8,
    total_attendance: 89,
    today_attendance: 12
  }

  const mockRecentSessions = [
    {
      id: '1',
      code_id: 'test-code-1',
      session_token: 'test-token-1',
      started_at: new Date().toISOString(),
      last_activity: new Date().toISOString(),
      ip_address: '192.168.1.100',
      user_agent: 'Test Browser',
      is_active: true,
      access_codes: {
        code: 'TEST001',
        name: 'Test Center',
        type: 'center'
      }
    },
    {
      id: '2',
      code_id: 'test-code-2',
      session_token: 'test-token-2',
      started_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      last_activity: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      ip_address: '192.168.1.101',
      user_agent: 'Test Browser',
      is_active: true,
      access_codes: {
        code: 'IND001',
        name: 'John Doe',
        type: 'individual'
      }
    }
  ]

  try {
    const supabase = await createClient()

    // Fetch real stats with better error handling
    console.log('Fetching dashboard stats...')
    
    const totalCodesResult = await supabase.from('access_codes').select('*', { count: 'exact', head: true })
    const activeCodesResult = await supabase.from('access_codes').select('*', { count: 'exact', head: true }).eq('is_active', true)
    const totalSessionsResult = await supabase.from('sessions').select('*', { count: 'exact', head: true })
    const activeSessionsResult = await supabase.from('sessions').select('*', { count: 'exact', head: true }).eq('is_active', true)
    
    // For today's attendance, let's also try a different approach
    const today = new Date().toISOString().split('T')[0]
    const todayAttendanceResult = await supabase.from('attendance_logs').select('*', { count: 'exact', head: true }).eq('date', today)
    
    // Also try counting sessions that started today as an alternative
    const todaySessionsResult = await supabase.from('sessions').select('*', { count: 'exact', head: true }).gte('started_at', today + 'T00:00:00.000Z')

    console.log('Query results:', {
      totalCodes: totalCodesResult,
      activeCodes: activeCodesResult,
      totalSessions: totalSessionsResult,
      activeSessions: activeSessionsResult,
      todayAttendance: todayAttendanceResult,
      todaySessions: todaySessionsResult
    })

    const realStats = {
      totalCodes: totalCodesResult.count || 0,
      activeCodes: activeCodesResult.count || 0,
      totalSessions: totalSessionsResult.count || 0,
      activeSessions: activeSessionsResult.count || 0,
      todayAttendance: todayAttendanceResult.count || todaySessionsResult.count || 0
    }

    console.log('Final stats:', realStats)

    const { data: recentSessions, error: sessionsError } = await supabase
      .from('sessions')
      .select(`
        *,
        access_codes (code, name, type)
      `)
      .order('started_at', { ascending: false })
      .limit(10)

    if (sessionsError) {
      console.error('Sessions query error:', sessionsError)
    }

    return (
      <div className="space-y-6">
        {/* Page Header */}
        <DashboardHeader />

        {/* Dashboard Stats */}
        <DashboardStatsClient />

        {/* Bulk Code Alerts */}
        <BulkCodeAlerts showRefreshButton={true} />

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <RecentActivity sessions={recentSessions || mockRecentSessions} />
          </div>

          {/* Quick Actions */}
          <div>
            <QuickActions />
          </div>
        </div>
      </div>
    )
  } catch (error) {
    console.error('Dashboard error:', error)

    // Fallback to mock data if database connection fails
    const fallbackStats = {
      totalCodes: mockStats.total_codes,
      activeCodes: mockStats.active_codes,
      totalSessions: mockStats.total_sessions,
      activeSessions: mockStats.active_sessions,
      todayAttendance: mockStats.today_attendance
    }

    return (
      <div className="space-y-6">
        {/* Page Header */}
        <DashboardHeader />

        {/* Dashboard Stats */}
        <DashboardStatsClient />

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <RecentActivity sessions={mockRecentSessions} />
          </div>

          {/* Quick Actions */}
          <div>
            <QuickActions />
          </div>
        </div>
      </div>
    )
  }
}