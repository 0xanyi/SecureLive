import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import type { ApiResponse } from '@/types/database'

interface CleanupResult {
  cleaned_sessions: number
  decremented_codes: string[]
  deactivated_expired_codes: string[]
}

export async function POST() {
  try {
    const supabase = await createServiceClient()
    
    // First, identify bulk code sessions that need cleanup
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    
    // Get inactive sessions for bulk codes
    const { data: inactiveBulkSessions, error: sessionsError } = await supabase
      .from('sessions')
      .select(`
        id,
        code_id,
        access_codes!inner(id, type, usage_count, max_usage_count)
      `)
      .eq('is_active', true)
      .eq('access_codes.type', 'bulk')
      .lt('last_activity', thirtyMinutesAgo)

    if (sessionsError) {
      console.error('Error fetching inactive bulk sessions:', sessionsError)
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Failed to fetch inactive sessions' },
        { status: 500 }
      )
    }

    const cleanupResult: CleanupResult = {
      cleaned_sessions: 0,
      decremented_codes: [],
      deactivated_expired_codes: []
    }

    // Process each inactive bulk session
    if (inactiveBulkSessions && inactiveBulkSessions.length > 0) {
      for (const session of inactiveBulkSessions) {
        try {
          // Mark session as inactive and set ended_at
          const { error: updateError } = await supabase
            .from('sessions')
            .update({
              is_active: false,
              ended_at: new Date().toISOString()
            })
            .eq('id', session.id)

          if (updateError) {
            console.error(`Error updating session ${session.id}:`, updateError)
            continue
          }

          // Decrement bulk code usage count
          const { data: decrementResult, error: decrementError } = await supabase
            .rpc('decrement_bulk_code_usage', { p_code_id: session.code_id })

          if (decrementError) {
            console.error(`Error decrementing usage for code ${session.code_id}:`, decrementError)
            continue
          }

          if (decrementResult) {
            cleanupResult.cleaned_sessions++
            if (!cleanupResult.decremented_codes.includes(session.code_id)) {
              cleanupResult.decremented_codes.push(session.code_id)
            }
          }

          // Update attendance log with logout time
          const { error: attendanceError } = await supabase
            .from('attendance_logs')
            .update({
              logout_time: new Date().toISOString(),
              duration_minutes: Math.floor((Date.now() - new Date(session.started_at).getTime()) / (1000 * 60))
            })
            .eq('session_id', session.id)
            .is('logout_time', null)

          if (attendanceError) {
            console.error(`Error updating attendance for session ${session.id}:`, attendanceError)
            // Don't fail the cleanup for attendance logging errors
          }

        } catch (sessionError) {
          console.error(`Error processing session ${session.id}:`, sessionError)
          continue
        }
      }
    }

    // Check for expired bulk codes and deactivate them
    const now = new Date().toISOString()
    const { data: expiredBulkCodes, error: expiredError } = await supabase
      .from('access_codes')
      .select('id, code, name')
      .eq('type', 'bulk')
      .eq('is_active', true)
      .lt('expires_at', now)

    if (expiredError) {
      console.error('Error fetching expired bulk codes:', expiredError)
    } else if (expiredBulkCodes && expiredBulkCodes.length > 0) {
      // Deactivate expired bulk codes
      const expiredCodeIds = expiredBulkCodes.map(code => code.id)
      
      const { error: deactivateError } = await supabase
        .from('access_codes')
        .update({ is_active: false })
        .in('id', expiredCodeIds)

      if (deactivateError) {
        console.error('Error deactivating expired bulk codes:', deactivateError)
      } else {
        cleanupResult.deactivated_expired_codes = expiredCodeIds

        // Also end any active sessions for expired bulk codes
        const { error: endSessionsError } = await supabase
          .from('sessions')
          .update({
            is_active: false,
            ended_at: now
          })
          .in('code_id', expiredCodeIds)
          .eq('is_active', true)

        if (endSessionsError) {
          console.error('Error ending sessions for expired bulk codes:', endSessionsError)
        }
      }
    }

    // Also run the general cleanup function for non-bulk codes
    const { data: generalCleanupCount, error: generalCleanupError } = await supabase
      .rpc('cleanup_inactive_sessions')

    if (generalCleanupError) {
      console.error('General cleanup error:', generalCleanupError)
    }

    return NextResponse.json<ApiResponse<CleanupResult>>({
      success: true,
      data: cleanupResult,
      message: `Bulk code cleanup completed: ${cleanupResult.cleaned_sessions} sessions cleaned, ${cleanupResult.decremented_codes.length} codes decremented, ${cleanupResult.deactivated_expired_codes.length} expired codes deactivated`
    })
    
  } catch (error) {
    console.error('Bulk code cleanup API error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}