import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()
    
    if (!code) {
      return NextResponse.json({
        success: false,
        error: 'Code is required'
      })
    }
    
    const supabase = await createServiceClient()
    
    // Get the access code
    const { data: accessCode } = await supabase
      .from('access_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .single()
    
    if (!accessCode) {
      return NextResponse.json({
        success: false,
        error: 'Code not found'
      })
    }
    
    // Get all sessions for this code
    const { data: allSessions } = await supabase
      .from('sessions')
      .select('*')
      .eq('code_id', accessCode.id)
      .order('started_at', { ascending: false })
    
    // Get active sessions
    const { data: activeSessions } = await supabase
      .from('sessions')
      .select('*')
      .eq('code_id', accessCode.id)
      .eq('is_active', true)
      .gte('last_activity', new Date(Date.now() - 30 * 60 * 1000).toISOString())
    
    // Check if new session can be created
    const { data: canCreateSession } = await supabase
      .rpc('check_concurrent_sessions', { p_code_id: accessCode.id })
    
    return NextResponse.json({
      success: true,
      data: {
        accessCode: {
          code: accessCode.code,
          type: accessCode.type,
          name: accessCode.name,
          max_concurrent_sessions: accessCode.max_concurrent_sessions,
          is_active: accessCode.is_active
        },
        totalSessions: allSessions?.length || 0,
        activeSessions: activeSessions?.length || 0,
        canCreateNewSession: canCreateSession,
        sessions: allSessions?.map(s => ({
          id: s.id,
          started_at: s.started_at,
          ended_at: s.ended_at,
          is_active: s.is_active,
          last_activity: s.last_activity,
          ip_address: s.ip_address
        }))
      }
    })
    
  } catch (error) {
    console.error('Check sessions error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    })
  }
}