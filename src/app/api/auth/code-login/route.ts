import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createSession } from '@/lib/auth/session'
import { generateSessionToken, getClientIP, getUserAgent } from '@/lib/utils'
import type { ApiResponse } from '@/types/database'

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    if (!code || typeof code !== 'string') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Access code is required' },
        { status: 400 }
      )
    }

    const supabase = await createServiceClient()

    // Find the access code
    const { data: accessCode, error: codeError } = await supabase
      .from('access_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single()

    if (codeError || !accessCode) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Invalid or inactive access code' },
        { status: 401 }
      )
    }

    // Check if code has expired
    if (accessCode.expires_at && new Date(accessCode.expires_at) < new Date()) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Access code has expired' },
        { status: 401 }
      )
    }

    // Clean up any inactive sessions first
    await supabase.rpc('cleanup_inactive_sessions')

    // Check concurrent sessions using the database function
    const { data: canCreateSession, error: sessionCheckError } = await supabase
      .rpc('check_concurrent_sessions', { p_code_id: accessCode.id })

    if (sessionCheckError) {
      console.error('Session check error:', sessionCheckError)
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Failed to validate session limits' },
        { status: 500 }
      )
    }

    if (!canCreateSession) {
      // Get current active sessions for better error message
      const { data: activeSessions } = await supabase
        .from('sessions')
        .select('id, started_at, last_activity')
        .eq('code_id', accessCode.id)
        .eq('is_active', true)
        .gte('last_activity', new Date(Date.now() - 30 * 60 * 1000).toISOString())

      const sessionCount = activeSessions?.length || 0
      
      const errorMessage = accessCode.type === 'center'
        ? `This center code is already in use. There is currently ${sessionCount} active session. Please wait for the current user to log out before trying again.`
        : `Maximum concurrent sessions (${accessCode.max_concurrent_sessions}) reached for this code. Currently ${sessionCount} active sessions.`

      return NextResponse.json<ApiResponse>(
        { success: false, error: errorMessage },
        { status: 403 }
      )
    }

    // Create new session
    const sessionToken = generateSessionToken()
    const clientIP = getClientIP(request)
    const userAgent = getUserAgent(request)
    const now = new Date().toISOString()

    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        code_id: accessCode.id,
        session_token: sessionToken,
        ip_address: clientIP,
        user_agent: userAgent,
        started_at: now,
        last_activity: now,
      })
      .select()
      .single()

    if (sessionError || !session) {
      console.error('Session creation error:', sessionError)
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Failed to create session' },
        { status: 500 }
      )
    }

    // Log attendance
    const today = new Date().toISOString().split('T')[0]
    const { error: attendanceError } = await supabase
      .from('attendance_logs')
      .insert({
        code_id: accessCode.id,
        session_id: session.id,
        date: today,
        login_time: now,
      })

    if (attendanceError) {
      console.error('Attendance logging error:', attendanceError)
      // Don't fail the login for attendance logging errors
    }

    // Create encrypted session cookie
    await createSession(session.id, accessCode.id)

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Access granted',
      data: {
        sessionId: session.id,
        codeType: accessCode.type,
        codeName: accessCode.name,
      },
    })

  } catch (error) {
    console.error('Code login error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}