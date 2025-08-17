import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import type { ApiResponse, BulkCodeUsage } from '@/types/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const codeId = searchParams.get('codeId')
    
    console.log('Simple usage API called with codeId:', codeId)

    const supabase = await createServiceClient()

    if (codeId) {
      // Get the bulk code details
      const { data: codeData, error: codeError } = await supabase
        .from('access_codes')
        .select('*')
        .eq('id', codeId)
        .eq('type', 'bulk')
        .single()

      console.log('Code query result:', { codeData, codeError })

      if (codeError || !codeData) {
        console.log('Bulk code not found:', codeId, codeError)
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Bulk code not found', debug: { codeId, error: codeError } },
          { status: 404 }
        )
      }

      // Get active sessions count
      const { count: activeSessions } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('code_id', codeId)
        .eq('is_active', true)

      // Calculate usage data
      const currentUsage = codeData.usage_count || 0
      const maxCapacity = codeData.max_usage_count || 0
      const capacityPercentage = maxCapacity > 0 ? Math.round((currentUsage / maxCapacity) * 100) : 0
      const isNearCapacity = capacityPercentage >= 80
      const isExpired = codeData.expires_at ? new Date(codeData.expires_at) < new Date() : false
      
      // Calculate time remaining
      const timeRemainingMinutes = codeData.expires_at 
        ? Math.max(0, Math.floor((new Date(codeData.expires_at).getTime() - Date.now()) / (1000 * 60)))
        : 0

      const usageData: BulkCodeUsage = {
        code_id: codeId,
        current_usage: currentUsage,
        max_capacity: maxCapacity,
        active_sessions: activeSessions || 0,
        capacity_percentage: capacityPercentage,
        is_near_capacity: isNearCapacity,
        is_expired: isExpired,
        time_remaining_minutes: timeRemainingMinutes
      }

      console.log('Returning usage data:', usageData)

      return NextResponse.json<ApiResponse<BulkCodeUsage>>({
        success: true,
        data: usageData
      })

    } else {
      // Get all bulk codes
      const { data: bulkCodes, error: codesError } = await supabase
        .from('access_codes')
        .select('*')
        .eq('type', 'bulk')

      console.log('All bulk codes query result:', { count: bulkCodes?.length, error: codesError })

      if (codesError) {
        console.error('Error fetching bulk codes:', codesError)
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Failed to fetch bulk codes' },
          { status: 500 }
        )
      }

      // Get active sessions for all bulk codes
      const codeIds = bulkCodes?.map(code => code.id) || []
      const { data: sessionCounts } = await supabase
        .from('sessions')
        .select('code_id')
        .in('code_id', codeIds)
        .eq('is_active', true)

      // Group session counts by code_id
      const sessionCountMap = (sessionCounts || []).reduce((acc, session) => {
        acc[session.code_id] = (acc[session.code_id] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const allUsageData: BulkCodeUsage[] = (bulkCodes || []).map(code => {
        const currentUsage = code.usage_count || 0
        const maxCapacity = code.max_usage_count || 0
        const capacityPercentage = maxCapacity > 0 ? Math.round((currentUsage / maxCapacity) * 100) : 0
        const isNearCapacity = capacityPercentage >= 80
        const isExpired = code.expires_at ? new Date(code.expires_at) < new Date() : false
        const timeRemainingMinutes = code.expires_at 
          ? Math.max(0, Math.floor((new Date(code.expires_at).getTime() - Date.now()) / (1000 * 60)))
          : 0

        return {
          code_id: code.id,
          current_usage: currentUsage,
          max_capacity: maxCapacity,
          active_sessions: sessionCountMap[code.id] || 0,
          capacity_percentage: capacityPercentage,
          is_near_capacity: isNearCapacity,
          is_expired: isExpired,
          time_remaining_minutes: timeRemainingMinutes
        }
      })

      console.log('Returning all usage data:', allUsageData.length, 'codes')

      return NextResponse.json<ApiResponse<BulkCodeUsage[]>>({
        success: true,
        data: allUsageData
      })
    }

  } catch (error) {
    console.error('Simple bulk code usage API error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error', debug: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}