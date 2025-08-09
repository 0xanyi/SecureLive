import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createServiceClient()

    // Get existing access codes
    const { data: accessCodes } = await supabase
      .from('access_codes')
      .select('*')
      .eq('is_active', true)
      .limit(3)

    if (!accessCodes || accessCodes.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No active access codes found. Please create some access codes first.'
      }, { status: 400 })
    }

    const testData = []
    const now = new Date()

    // Create test data for the last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      // Create 1-3 sessions per day
      const sessionsPerDay = Math.floor(Math.random() * 3) + 1
      
      for (let j = 0; j < sessionsPerDay; j++) {
        const accessCode = accessCodes[Math.floor(Math.random() * accessCodes.length)]
        
        // Random login time during the day
        const loginTime = new Date(date)
        loginTime.setHours(Math.floor(Math.random() * 12) + 8) // 8 AM to 8 PM
        loginTime.setMinutes(Math.floor(Math.random() * 60))
        
        // Random session duration (15-120 minutes)
        const durationMinutes = Math.floor(Math.random() * 105) + 15
        const logoutTime = new Date(loginTime)
        logoutTime.setMinutes(logoutTime.getMinutes() + durationMinutes)

        // Create session first
        const { data: session, error: sessionError } = await supabase
          .from('sessions')
          .insert({
            code_id: accessCode.id,
            session_token: `test_${Date.now()}_${Math.random()}`,
            ip_address: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
            user_agent: 'Test User Agent',
            started_at: loginTime.toISOString(),
            last_activity: logoutTime.toISOString(),
            ended_at: logoutTime.toISOString(),
            is_active: false
          })
          .select()
          .single()

        if (sessionError) {
          console.error('Session creation error:', sessionError)
          continue
        }

        // Create attendance log
        const { error: attendanceError } = await supabase
          .from('attendance_logs')
          .insert({
            code_id: accessCode.id,
            session_id: session.id,
            date: dateStr,
            login_time: loginTime.toISOString(),
            logout_time: logoutTime.toISOString(),
            duration_minutes: durationMinutes
          })

        if (attendanceError) {
          console.error('Attendance log error:', attendanceError)
        } else {
          testData.push({
            date: dateStr,
            code: accessCode.code,
            duration: durationMinutes
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Created ${testData.length} test attendance records`,
      data: testData
    })

  } catch (error) {
    console.error('Seed test data error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}