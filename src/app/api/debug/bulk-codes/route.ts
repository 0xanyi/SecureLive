import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServiceClient()

    // Check if we can connect to the database
    const { data: connectionTest, error: connectionError } = await supabase
      .from('access_codes')
      .select('count')
      .limit(1)

    if (connectionError) {
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        details: connectionError
      })
    }

    // Get all access codes
    const { data: allCodes, error: allCodesError } = await supabase
      .from('access_codes')
      .select('id, code, name, type, usage_count, max_usage_count, expires_at, is_active')

    if (allCodesError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch access codes',
        details: allCodesError
      })
    }

    // Get bulk codes specifically
    const { data: bulkCodes, error: bulkCodesError } = await supabase
      .from('access_codes')
      .select('id, code, name, type, usage_count, max_usage_count, expires_at, is_active')
      .eq('type', 'bulk')

    if (bulkCodesError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch bulk codes',
        details: bulkCodesError
      })
    }

    // Get sessions for bulk codes
    const bulkCodeIds = bulkCodes?.map(code => code.id) || []
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('id, code_id, is_active')
      .in('code_id', bulkCodeIds)

    return NextResponse.json({
      success: true,
      data: {
        totalCodes: allCodes?.length || 0,
        bulkCodes: bulkCodes?.length || 0,
        bulkCodeDetails: bulkCodes || [],
        sessions: sessions?.length || 0,
        sessionDetails: sessions || [],
        environment: {
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set',
          serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set'
        }
      }
    })

  } catch (error) {
    console.error('Debug API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}