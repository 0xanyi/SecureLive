import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServiceClient()

    // Check attendance logs
    const { data: attendanceLogs, error: attendanceError } = await supabase
      .from('attendance_logs')
      .select('*')
      .order('login_time', { ascending: false })
      .limit(10)

    // Check sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(10)

    // Check access codes
    const { data: accessCodes, error: codesError } = await supabase
      .from('access_codes')
      .select('*')
      .limit(10)

    // Check views
    const { data: dailyAttendance, error: dailyError } = await supabase
      .from('daily_attendance')
      .select('*')
      .limit(10)

    const { data: activeSessions, error: activeError } = await supabase
      .from('active_sessions')
      .select('*')

    return NextResponse.json({
      success: true,
      data: {
        attendanceLogs: {
          data: attendanceLogs,
          error: attendanceError,
          count: attendanceLogs?.length || 0
        },
        sessions: {
          data: sessions,
          error: sessionsError,
          count: sessions?.length || 0
        },
        accessCodes: {
          data: accessCodes,
          error: codesError,
          count: accessCodes?.length || 0
        },
        dailyAttendance: {
          data: dailyAttendance,
          error: dailyError,
          count: dailyAttendance?.length || 0
        },
        activeSessions: {
          data: activeSessions,
          error: activeError,
          count: activeSessions?.length || 0
        }
      }
    })

  } catch (error) {
    console.error('Debug analytics error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}