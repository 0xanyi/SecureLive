import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import type { ApiResponse } from '@/types/database'

interface ScheduledCleanupResult {
  regular_sessions_cleaned: number
  bulk_sessions_cleaned: number
  bulk_codes_decremented: number
  bulk_codes_deactivated: number
  bulk_sessions_terminated: number
  cleanup_timestamp: string
}

export async function POST() {
  try {
    const supabase = await createServiceClient()
    
    // Run comprehensive cleanup using existing functions
    const { data: regularCleanup, error: regularError } = await supabase
      .rpc('cleanup_inactive_sessions')

    if (regularError) {
      console.error('Regular cleanup error:', regularError)
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Failed to run regular session cleanup' },
        { status: 500 }
      )
    }

    // Manual bulk code cleanup since we don't have the enhanced functions yet
    let bulkSessionsCleaned = 0
    let bulkCodesDeactivated = 0
    let bulkSessionsTerminated = 0

    // Clean up expired bulk codes
    const now = new Date().toISOString()
    const { data: expiredBulkCodes, error: expiredError } = await supabase
      .from('access_codes')
      .select('id, code, name, usage_count')
      .eq('type', 'bulk')
      .eq('is_active', true)
      .lt('expires_at', now)

    if (!expiredError && expiredBulkCodes && expiredBulkCodes.length > 0) {
      for (const code of expiredBulkCodes) {
        // Deactivate expired bulk code
        const { error: deactivateError } = await supabase
          .from('access_codes')
          .update({ is_active: false, usage_count: 0 })
          .eq('id', code.id)

        if (!deactivateError) {
          bulkCodesDeactivated++

          // Terminate active sessions for this expired code
          const { data: terminatedSessions, error: terminateError } = await supabase
            .from('sessions')
            .update({ is_active: false, ended_at: now })
            .eq('code_id', code.id)
            .eq('is_active', true)
            .select('id, started_at')

          if (!terminateError && terminatedSessions) {
            bulkSessionsTerminated += terminatedSessions.length

            // Update attendance logs
            for (const session of terminatedSessions) {
              await supabase
                .from('attendance_logs')
                .update({
                  logout_time: now,
                  duration_minutes: Math.floor((Date.now() - new Date(session.started_at).getTime()) / (1000 * 60))
                })
                .eq('session_id', session.id)
                .is('logout_time', null)
            }
          }
        }
      }
    }

    const cleanupResult = {
      regular_sessions_cleaned: regularCleanup || 0,
      bulk_sessions_cleaned: bulkSessionsCleaned,
      bulk_codes_decremented: 0, // This would be handled by the existing cleanup
      bulk_codes_deactivated: bulkCodesDeactivated,
      bulk_sessions_terminated: bulkSessionsTerminated
    }

    if (cleanupError) {
      console.error('Scheduled cleanup error:', cleanupError)
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Failed to run scheduled cleanup' },
        { status: 500 }
      )
    }

    const result: ScheduledCleanupResult = {
      regular_sessions_cleaned: cleanupResult.regular_sessions_cleaned || 0,
      bulk_sessions_cleaned: cleanupResult.bulk_sessions_cleaned || 0,
      bulk_codes_decremented: cleanupResult.bulk_codes_decremented || 0,
      bulk_codes_deactivated: cleanupResult.bulk_codes_deactivated || 0,
      bulk_sessions_terminated: cleanupResult.bulk_sessions_terminated || 0,
      cleanup_timestamp: new Date().toISOString()
    }

    // Log cleanup results for monitoring
    console.log('Scheduled cleanup completed:', result)

    return NextResponse.json<ApiResponse<ScheduledCleanupResult>>({
      success: true,
      data: result,
      message: `Scheduled cleanup completed: ${result.regular_sessions_cleaned + result.bulk_sessions_cleaned} total sessions cleaned, ${result.bulk_codes_deactivated} bulk codes deactivated`
    })
    
  } catch (error) {
    console.error('Scheduled cleanup API error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to check cleanup status and statistics
export async function GET() {
  try {
    const supabase = await createServiceClient()
    
    // Get cleanup monitoring statistics manually
    const { data: bulkCodesStats, error: bulkCodesError } = await supabase
      .from('access_codes')
      .select('id, is_active, expires_at, usage_count, max_usage_count')
      .eq('type', 'bulk')

    const { data: bulkSessionsStats, error: bulkSessionsError } = await supabase
      .from('sessions')
      .select(`
        id, 
        is_active, 
        last_activity,
        access_codes!inner(type)
      `)
      .eq('access_codes.type', 'bulk')

    let monitoringData = []

    if (!bulkCodesError && bulkCodesStats) {
      const totalCodes = bulkCodesStats.length
      const activeCodes = bulkCodesStats.filter(c => c.is_active).length
      const expiredActiveCodes = bulkCodesStats.filter(c => 
        c.is_active && c.expires_at && new Date(c.expires_at) < new Date()
      ).length
      const totalActiveUsage = bulkCodesStats
        .filter(c => c.is_active)
        .reduce((sum, c) => sum + (c.usage_count || 0), 0)
      const avgCapacityPercentage = activeCodes > 0 
        ? bulkCodesStats
            .filter(c => c.is_active && c.max_usage_count > 0)
            .reduce((sum, c) => sum + (c.usage_count / c.max_usage_count * 100), 0) / activeCodes
        : 0

      monitoringData.push({
        cleanup_type: 'bulk_codes',
        total_codes: totalCodes,
        active_codes: activeCodes,
        expired_active_codes: expiredActiveCodes,
        total_active_usage: totalActiveUsage,
        avg_capacity_percentage: avgCapacityPercentage
      })
    }

    if (!bulkSessionsError && bulkSessionsStats) {
      const totalSessions = bulkSessionsStats.length
      const activeSessions = bulkSessionsStats.filter(s => s.is_active).length
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
      const inactiveSessions = bulkSessionsStats.filter(s => 
        s.is_active && new Date(s.last_activity) < thirtyMinutesAgo
      ).length

      monitoringData.push({
        cleanup_type: 'bulk_sessions',
        total_codes: totalSessions,
        active_codes: activeSessions,
        expired_active_codes: inactiveSessions,
        total_active_usage: 0,
        avg_capacity_percentage: 0
      })
    }

    // Get expired bulk codes that need cleanup
    const { data: expiredCodes, error: expiredError } = await supabase
      .from('access_codes')
      .select('id, code, name, expires_at, usage_count, max_usage_count')
      .eq('type', 'bulk')
      .eq('is_active', true)
      .lt('expires_at', new Date().toISOString())

    if (expiredError) {
      console.error('Error fetching expired bulk codes:', expiredError)
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Failed to fetch expired codes' },
        { status: 500 }
      )
    }

    // Get inactive sessions that need cleanup
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    const { data: inactiveSessions, error: sessionsError } = await supabase
      .from('sessions')
      .select(`
        id,
        code_id,
        last_activity,
        access_codes!inner(type, code, name)
      `)
      .eq('is_active', true)
      .eq('access_codes.type', 'bulk')
      .lt('last_activity', thirtyMinutesAgo)

    if (sessionsError) {
      console.error('Error fetching inactive sessions:', sessionsError)
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Failed to fetch inactive sessions' },
        { status: 500 }
      )
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        monitoring_stats: monitoringData || [],
        expired_codes: expiredCodes || [],
        inactive_sessions: inactiveSessions || [],
        needs_cleanup: (expiredCodes?.length || 0) > 0 || (inactiveSessions?.length || 0) > 0
      },
      message: 'Cleanup status retrieved successfully'
    })
    
  } catch (error) {
    console.error('Cleanup status API error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}