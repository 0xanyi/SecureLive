import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServiceClient()
    const { searchParams } = new URL(request.url)
    
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const days = parseInt(searchParams.get('days') || '7')

    if (!startDate || !endDate) {
      return NextResponse.json({
        success: false,
        error: 'Start date and end date are required'
      }, { status: 400 })
    }

    // Clean up inactive sessions first
    await supabase.rpc('cleanup_inactive_sessions')

    // Fetch attendance statistics for the selected period
    const { data: attendanceStats, error: attendanceError } = await supabase
      .from('attendance_logs')
      .select(`
        *,
        access_codes (code, name, type)
      `)
      .gte('date', startDate.split('T')[0])
      .lte('date', endDate.split('T')[0])
      .order('login_time', { ascending: false })

    if (attendanceError) {
      console.error('Attendance stats error:', attendanceError)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch attendance statistics'
      }, { status: 500 })
    }

    // Fetch previous period data for comparison
    const previousStartDate = new Date(startDate)
    previousStartDate.setDate(previousStartDate.getDate() - days)
    const previousEndDate = new Date(startDate)

    const { data: previousAttendanceStats } = await supabase
      .from('attendance_logs')
      .select('*')
      .gte('date', previousStartDate.toISOString().split('T')[0])
      .lt('date', previousEndDate.toISOString().split('T')[0])

    // Fetch active sessions
    const { data: activeSessions, error: activeSessionsError } = await supabase
      .from('active_sessions')
      .select('*')

    if (activeSessionsError) {
      console.error('Active sessions error:', activeSessionsError)
    }

    // Generate daily attendance data for the chart
    const dailyAttendanceMap = new Map()
    
    // Initialize all dates in range with zero values
    const currentDate = new Date(startDate)
    const endDateObj = new Date(endDate)
    
    while (currentDate <= endDateObj) {
      const dateStr = currentDate.toISOString().split('T')[0]
      dailyAttendanceMap.set(dateStr, {
        date: dateStr,
        centers: 0,
        individuals: 0,
        total: 0
      })
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Populate with actual data
    attendanceStats?.forEach(log => {
      const dateStr = log.date
      if (dailyAttendanceMap.has(dateStr)) {
        const dayData = dailyAttendanceMap.get(dateStr)
        if (log.access_codes?.type === 'center') {
          dayData.centers++
        } else if (log.access_codes?.type === 'individual') {
          dayData.individuals++
        }
        dayData.total++
      }
    })

    const dailyAttendance = Array.from(dailyAttendanceMap.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Calculate summary statistics
    const totalSessions = attendanceStats?.length || 0
    const uniqueCodes = new Set(attendanceStats?.map(log => log.code_id)).size
    const avgDuration = attendanceStats?.reduce((acc, log) => 
      acc + (log.duration_minutes || 0), 0
    ) / Math.max(totalSessions, 1) || 0

    // Calculate previous period stats for comparison
    const previousTotalSessions = previousAttendanceStats?.length || 0
    const previousAvgDuration = previousAttendanceStats?.reduce((acc, log) => 
      acc + (log.duration_minutes || 0), 0
    ) / Math.max(previousTotalSessions, 1) || 0

    const previousPeriodStats = {
      totalSessions: previousTotalSessions,
      avgDuration: previousAvgDuration
    }

    return NextResponse.json({
      success: true,
      data: {
        dailyAttendance,
        activeSessions: activeSessions || [],
        attendanceStats: attendanceStats || [],
        totalSessions,
        uniqueCodes,
        avgDuration,
        previousPeriodStats
      }
    })

  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}