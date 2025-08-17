import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import type { ApiResponse, BulkAccessCode } from '@/types/database'

interface BulkCodeStatus extends BulkAccessCode {
  active_sessions: number
  capacity_percentage: number
  remaining_capacity: number
  is_near_capacity: boolean
  is_expired: boolean
  time_remaining_hours: number
  time_remaining_minutes: number
  status: 'active' | 'near_capacity' | 'full' | 'expired'
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const codeId = searchParams.get('codeId')

    const supabase = await createServiceClient()

    if (codeId) {
      // Get status for a specific bulk code
      const { data: accessCode, error: codeError } = await supabase
        .from('access_codes')
        .select('*')
        .eq('id', codeId)
        .eq('type', 'bulk')
        .single()

      if (codeError || !accessCode) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Bulk code not found' },
          { status: 404 }
        )
      }

      const statusData = await calculateBulkCodeStatus(supabase, accessCode)

      return NextResponse.json<ApiResponse<BulkCodeStatus>>({
        success: true,
        data: statusData
      })

    } else {
      // Get status for all bulk codes (active and inactive)
      const { data: bulkCodes, error: codesError } = await supabase
        .from('access_codes')
        .select('*')
        .eq('type', 'bulk')
        .order('created_at', { ascending: false })

      if (codesError) {
        console.error('Error fetching bulk codes:', codesError)
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Failed to fetch bulk codes' },
          { status: 500 }
        )
      }

      const statusDataPromises = (bulkCodes || []).map(async (code) => {
        return await calculateBulkCodeStatus(supabase, code)
      })

      const allStatusData = await Promise.all(statusDataPromises)

      return NextResponse.json<ApiResponse<BulkCodeStatus[]>>({
        success: true,
        data: allStatusData
      })
    }

  } catch (error) {
    console.error('Bulk code status API error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function calculateBulkCodeStatus(supabase: any, accessCode: any): Promise<BulkCodeStatus> {
  // Get active sessions count for this bulk code
  const { data: activeSessions } = await supabase
    .from('sessions')
    .select('id')
    .eq('code_id', accessCode.id)
    .eq('is_active', true)
    .gte('last_activity', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // Active within last 30 minutes

  const currentUsage = accessCode.usage_count || 0
  const maxCapacity = accessCode.max_usage_count || 1
  const activeSessionsCount = activeSessions?.length || 0
  const capacityPercentage = Math.round((currentUsage / maxCapacity) * 100)
  const remainingCapacity = Math.max(0, maxCapacity - currentUsage)
  const isNearCapacity = capacityPercentage >= 80
  
  // Calculate time remaining
  const now = new Date()
  const expiresAt = accessCode.expires_at ? new Date(accessCode.expires_at) : null
  const isExpired = expiresAt ? now > expiresAt : false
  
  let timeRemainingHours = 0
  let timeRemainingMinutes = 0
  
  if (expiresAt && !isExpired) {
    const totalMinutesRemaining = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60)))
    timeRemainingHours = Math.floor(totalMinutesRemaining / 60)
    timeRemainingMinutes = totalMinutesRemaining % 60
  }

  // Determine status
  let status: 'active' | 'near_capacity' | 'full' | 'expired'
  if (isExpired || !accessCode.is_active) {
    status = 'expired'
  } else if (currentUsage >= maxCapacity) {
    status = 'full'
  } else if (isNearCapacity) {
    status = 'near_capacity'
  } else {
    status = 'active'
  }

  const statusData: BulkCodeStatus = {
    ...accessCode,
    type: 'bulk' as const,
    usage_count: currentUsage,
    max_usage_count: maxCapacity,
    expires_at: accessCode.expires_at || '',
    active_sessions: activeSessionsCount,
    capacity_percentage: capacityPercentage,
    remaining_capacity: remainingCapacity,
    is_near_capacity: isNearCapacity,
    is_expired: isExpired,
    time_remaining_hours: timeRemainingHours,
    time_remaining_minutes: timeRemainingMinutes,
    status
  }

  return statusData
}