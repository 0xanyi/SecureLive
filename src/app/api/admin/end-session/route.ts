import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()
    
    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'Session ID is required'
      })
    }
    
    const supabase = await createServiceClient()
    const now = new Date().toISOString()
    
    // Get session data for attendance logging
    const { data: session } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single()
    
    if (session) {
      // Update attendance log with logout time
      const duration = Math.floor(
        (new Date(now).getTime() - new Date(session.started_at).getTime()) / (1000 * 60)
      )
      
      await supabase
        .from('attendance_logs')
        .update({
          logout_time: now,
          duration_minutes: duration,
        })
        .eq('session_id', sessionId)
      
      // Mark session as ended
      const { error: updateError } = await supabase
        .from('sessions')
        .update({
          is_active: false,
          ended_at: now,
        })
        .eq('id', sessionId)
      
      if (updateError) {
        console.error('Session update error:', updateError)
        return NextResponse.json({
          success: false,
          error: updateError.message
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Session ended successfully'
    })
    
  } catch (error) {
    console.error('End session error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    })
  }
}