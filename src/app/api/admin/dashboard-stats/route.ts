import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    console.log('Fetching dashboard stats from API...')

    // Fetch all stats with detailed error handling
    const [
      totalCodesResult,
      activeCodesResult,
      totalSessionsResult,
      activeSessionsResult,
      todayAttendanceResult,
      bulkCodesResult,
      activeBulkCodesResult,
      nearCapacityBulkCodesResult
    ] = await Promise.all([
      supabase.from('access_codes').select('*', { count: 'exact', head: true }),
      supabase.from('access_codes').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('sessions').select('*', { count: 'exact', head: true }),
      supabase.from('sessions').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('attendance_logs').select('*', { count: 'exact', head: true }).eq('date', new Date().toISOString().split('T')[0]),
      supabase.from('access_codes').select('*', { count: 'exact', head: true }).eq('type', 'bulk'),
      supabase.from('access_codes').select('*', { count: 'exact', head: true }).eq('type', 'bulk').eq('is_active', true),
      supabase.from('access_codes').select('usage_count, max_usage_count').eq('type', 'bulk').eq('is_active', true)
    ])

    // Calculate bulk code metrics
    const bulkCodesData = nearCapacityBulkCodesResult.data || []
    const nearCapacityCount = bulkCodesData.filter(code => {
      const percentage = (code.usage_count || 0) / (code.max_usage_count || 1) * 100
      return percentage >= 80
    }).length

    // Log each result for debugging
    console.log('API Query results:', {
      totalCodes: totalCodesResult,
      activeCodes: activeCodesResult,
      totalSessions: totalSessionsResult,
      activeSessions: activeSessionsResult,
      todayAttendance: todayAttendanceResult,
      bulkCodes: bulkCodesResult,
      activeBulkCodes: activeBulkCodesResult,
      nearCapacityBulkCodes: nearCapacityCount
    })

    // Check for errors in any of the queries
    const errors = [
      totalCodesResult.error,
      activeCodesResult.error,
      totalSessionsResult.error,
      activeSessionsResult.error,
      todayAttendanceResult.error,
      bulkCodesResult.error,
      activeBulkCodesResult.error,
      nearCapacityBulkCodesResult.error
    ].filter(Boolean)

    if (errors.length > 0) {
      console.error('Database query errors:', errors)
      return NextResponse.json({ 
        error: 'Database query failed', 
        details: errors 
      }, { status: 500 })
    }

    const stats = {
      totalCodes: totalCodesResult.count || 0,
      activeCodes: activeCodesResult.count || 0,
      totalSessions: totalSessionsResult.count || 0,
      activeSessions: activeSessionsResult.count || 0,
      todayAttendance: todayAttendanceResult.count || 0,
      bulkCodes: bulkCodesResult.count || 0,
      activeBulkCodes: activeBulkCodesResult.count || 0,
      nearCapacityBulkCodes: nearCapacityCount
    }

    console.log('API Final stats:', stats)

    // Also fetch some sample data to verify tables exist
    const { data: sampleCodes, error: sampleError } = await supabase
      .from('access_codes')
      .select('id, code, name, type, is_active')
      .limit(5)

    if (sampleError) {
      console.error('Sample data error:', sampleError)
    } else {
      console.log('Sample access codes:', sampleCodes)
    }

    return NextResponse.json({
      success: true,
      stats,
      debug: {
        sampleCodes: sampleCodes?.length || 0,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Dashboard stats API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}