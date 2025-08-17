import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import type { ApiResponse } from '@/types/database'

export interface BulkCodeAnalytics {
  code_id: string
  code_name: string
  created_at: string
  expires_at: string
  max_usage_count: number
  total_usage: number
  peak_concurrent_usage: number
  average_session_duration: number
  usage_by_hour: Array<{
    hour: number
    usage_count: number
  }>
  usage_by_day: Array<{
    date: string
    usage_count: number
  }>
  capacity_utilization: number
  time_to_peak: number // minutes from creation to peak usage
  is_expired: boolean
  event_title?: string
}

export interface BulkCodeUsageHistory {
  code_id: string
  session_id: string
  started_at: string
  ended_at?: string
  duration_minutes?: number
  ip_address: string
  user_agent: string
}

export interface BulkCodeCapacityMetrics {
  total_bulk_codes: number
  active_bulk_codes: number
  expired_bulk_codes: number
  average_capacity_utilization: number
  codes_at_full_capacity: number
  codes_near_capacity: number // >= 80%
  total_capacity_available: number
  total_capacity_used: number
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const codeId = searchParams.get('codeId')
    const type = searchParams.get('type') || 'overview'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const supabase = await createServiceClient()

    switch (type) {
      case 'overview':
        return await getBulkCodeOverview(supabase, codeId, startDate, endDate)
      case 'usage-history':
        return await getBulkCodeUsageHistory(supabase, codeId, startDate, endDate)
      case 'capacity-metrics':
        return await getBulkCodeCapacityMetrics(supabase)
      case 'patterns':
        return await getBulkCodeUsagePatterns(supabase, codeId, startDate, endDate)
      default:
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Invalid analytics type' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Bulk code analytics API error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function getBulkCodeOverview(
  supabase: any,
  codeId: string | null,
  startDate: string | null,
  endDate: string | null
) {
  const query = `
    SELECT 
      ac.id as code_id,
      ac.name as code_name,
      ac.created_at,
      ac.expires_at,
      ac.max_usage_count,
      ac.usage_count as total_usage,
      e.title as event_title,
      COALESCE(
        (SELECT MAX(concurrent_count) 
         FROM (
           SELECT COUNT(*) as concurrent_count
           FROM sessions s
           WHERE s.code_id = ac.id
           AND s.started_at <= s2.started_at
           AND (s.ended_at IS NULL OR s.ended_at >= s2.started_at)
           GROUP BY s2.started_at
         ) peak_calc), 0
      ) as peak_concurrent_usage,
      COALESCE(
        (SELECT AVG(EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - started_at))/60)
         FROM sessions 
         WHERE code_id = ac.id), 0
      ) as average_session_duration,
      ROUND((ac.usage_count::decimal / ac.max_usage_count) * 100, 2) as capacity_utilization,
      CASE 
        WHEN ac.expires_at < NOW() THEN true
        ELSE false
      END as is_expired
    FROM access_codes ac
    LEFT JOIN events e ON ac.event_id = e.id
    WHERE ac.type = 'bulk'
    ${codeId ? 'AND ac.id = $1' : ''}
    ${startDate && !codeId ? 'AND ac.created_at >= $1' : ''}
    ${endDate && !codeId ? `AND ac.created_at <= $${startDate ? '2' : '1'}` : ''}
    ORDER BY ac.created_at DESC
  `

  const params = []
  if (codeId) {
    params.push(codeId)
  } else {
    if (startDate) params.push(startDate)
    if (endDate) params.push(endDate)
  }

  const { data, error } = await supabase.rpc('execute_sql', {
    sql_query: query,
    params: params
  })

  if (error) {
    console.error('Error fetching bulk code overview:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to fetch analytics data' },
      { status: 500 }
    )
  }

  // Get hourly usage patterns for each code
  const analyticsData: BulkCodeAnalytics[] = []
  
  for (const row of data || []) {
    const hourlyUsage = await getHourlyUsagePattern(supabase, row.code_id)
    const dailyUsage = await getDailyUsagePattern(supabase, row.code_id)
    const timeToPeak = await getTimeToPeak(supabase, row.code_id)

    analyticsData.push({
      code_id: row.code_id,
      code_name: row.code_name,
      created_at: row.created_at,
      expires_at: row.expires_at,
      max_usage_count: row.max_usage_count,
      total_usage: row.total_usage,
      peak_concurrent_usage: row.peak_concurrent_usage,
      average_session_duration: parseFloat(row.average_session_duration) || 0,
      usage_by_hour: hourlyUsage,
      usage_by_day: dailyUsage,
      capacity_utilization: parseFloat(row.capacity_utilization) || 0,
      time_to_peak: timeToPeak,
      is_expired: row.is_expired,
      event_title: row.event_title
    })
  }

  return NextResponse.json<ApiResponse<BulkCodeAnalytics[]>>({
    success: true,
    data: analyticsData
  })
}

async function getHourlyUsagePattern(supabase: any, codeId: string) {
  const { data, error } = await supabase.rpc('execute_sql', {
    sql_query: `
      SELECT 
        EXTRACT(HOUR FROM started_at) as hour,
        COUNT(*) as usage_count
      FROM sessions
      WHERE code_id = $1
      GROUP BY EXTRACT(HOUR FROM started_at)
      ORDER BY hour
    `,
    params: [codeId]
  })

  if (error) {
    console.error('Error fetching hourly usage pattern:', error)
    return []
  }

  return (data || []).map((row: any) => ({
    hour: parseInt(row.hour),
    usage_count: parseInt(row.usage_count)
  }))
}

async function getDailyUsagePattern(supabase: any, codeId: string) {
  const { data, error } = await supabase.rpc('execute_sql', {
    sql_query: `
      SELECT 
        DATE(started_at) as date,
        COUNT(*) as usage_count
      FROM sessions
      WHERE code_id = $1
      GROUP BY DATE(started_at)
      ORDER BY date
    `,
    params: [codeId]
  })

  if (error) {
    console.error('Error fetching daily usage pattern:', error)
    return []
  }

  return (data || []).map((row: any) => ({
    date: row.date,
    usage_count: parseInt(row.usage_count)
  }))
}

async function getTimeToPeak(supabase: any, codeId: string) {
  const { data, error } = await supabase.rpc('execute_sql', {
    sql_query: `
      WITH peak_time AS (
        SELECT started_at
        FROM sessions
        WHERE code_id = $1
        ORDER BY started_at
        LIMIT 1 OFFSET (
          SELECT FLOOR(COUNT(*) * 0.8)
          FROM sessions
          WHERE code_id = $1
        )
      ),
      creation_time AS (
        SELECT created_at
        FROM access_codes
        WHERE id = $1
      )
      SELECT EXTRACT(EPOCH FROM (pt.started_at - ct.created_at))/60 as minutes_to_peak
      FROM peak_time pt, creation_time ct
    `,
    params: [codeId]
  })

  if (error || !data || data.length === 0) {
    return 0
  }

  return parseFloat(data[0].minutes_to_peak) || 0
}

async function getBulkCodeUsageHistory(
  supabase: any,
  codeId: string | null,
  startDate: string | null,
  endDate: string | null
) {
  const query = `
    SELECT 
      s.code_id,
      s.id as session_id,
      s.started_at,
      s.ended_at,
      EXTRACT(EPOCH FROM (COALESCE(s.ended_at, NOW()) - s.started_at))/60 as duration_minutes,
      s.ip_address,
      s.user_agent
    FROM sessions s
    JOIN access_codes ac ON s.code_id = ac.id
    WHERE ac.type = 'bulk'
    ${codeId ? 'AND s.code_id = $1' : ''}
    ${startDate && !codeId ? 'AND s.started_at >= $1' : ''}
    ${endDate && !codeId ? `AND s.started_at <= $${startDate ? '2' : '1'}` : ''}
    ORDER BY s.started_at DESC
    LIMIT 1000
  `

  const params = []
  if (codeId) {
    params.push(codeId)
  } else {
    if (startDate) params.push(startDate)
    if (endDate) params.push(endDate)
  }

  const { data, error } = await supabase.rpc('execute_sql', {
    sql_query: query,
    params: params
  })

  if (error) {
    console.error('Error fetching usage history:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to fetch usage history' },
      { status: 500 }
    )
  }

  const historyData: BulkCodeUsageHistory[] = (data || []).map((row: any) => ({
    code_id: row.code_id,
    session_id: row.session_id,
    started_at: row.started_at,
    ended_at: row.ended_at,
    duration_minutes: parseFloat(row.duration_minutes) || 0,
    ip_address: row.ip_address,
    user_agent: row.user_agent
  }))

  return NextResponse.json<ApiResponse<BulkCodeUsageHistory[]>>({
    success: true,
    data: historyData
  })
}

async function getBulkCodeCapacityMetrics(supabase: any) {
  const { data, error } = await supabase.rpc('execute_sql', {
    sql_query: `
      SELECT 
        COUNT(*) as total_bulk_codes,
        COUNT(CASE WHEN is_active = true AND expires_at > NOW() THEN 1 END) as active_bulk_codes,
        COUNT(CASE WHEN expires_at <= NOW() THEN 1 END) as expired_bulk_codes,
        ROUND(AVG((usage_count::decimal / max_usage_count) * 100), 2) as average_capacity_utilization,
        COUNT(CASE WHEN usage_count >= max_usage_count THEN 1 END) as codes_at_full_capacity,
        COUNT(CASE WHEN (usage_count::decimal / max_usage_count) >= 0.8 THEN 1 END) as codes_near_capacity,
        SUM(max_usage_count) as total_capacity_available,
        SUM(usage_count) as total_capacity_used
      FROM access_codes
      WHERE type = 'bulk'
    `,
    params: []
  })

  if (error) {
    console.error('Error fetching capacity metrics:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to fetch capacity metrics' },
      { status: 500 }
    )
  }

  const metrics: BulkCodeCapacityMetrics = {
    total_bulk_codes: parseInt(data[0]?.total_bulk_codes) || 0,
    active_bulk_codes: parseInt(data[0]?.active_bulk_codes) || 0,
    expired_bulk_codes: parseInt(data[0]?.expired_bulk_codes) || 0,
    average_capacity_utilization: parseFloat(data[0]?.average_capacity_utilization) || 0,
    codes_at_full_capacity: parseInt(data[0]?.codes_at_full_capacity) || 0,
    codes_near_capacity: parseInt(data[0]?.codes_near_capacity) || 0,
    total_capacity_available: parseInt(data[0]?.total_capacity_available) || 0,
    total_capacity_used: parseInt(data[0]?.total_capacity_used) || 0
  }

  return NextResponse.json<ApiResponse<BulkCodeCapacityMetrics>>({
    success: true,
    data: metrics
  })
}

async function getBulkCodeUsagePatterns(
  supabase: any,
  codeId: string | null,
  startDate: string | null,
  endDate: string | null
) {
  // Get usage patterns by time of day, day of week, etc.
  const query = `
    SELECT 
      EXTRACT(HOUR FROM s.started_at) as hour_of_day,
      EXTRACT(DOW FROM s.started_at) as day_of_week,
      DATE(s.started_at) as usage_date,
      COUNT(*) as session_count,
      AVG(EXTRACT(EPOCH FROM (COALESCE(s.ended_at, NOW()) - s.started_at))/60) as avg_duration
    FROM sessions s
    JOIN access_codes ac ON s.code_id = ac.id
    WHERE ac.type = 'bulk'
    ${codeId ? 'AND s.code_id = $1' : ''}
    ${startDate && !codeId ? 'AND s.started_at >= $1' : ''}
    ${endDate && !codeId ? `AND s.started_at <= $${startDate ? '2' : '1'}` : ''}
    GROUP BY 
      EXTRACT(HOUR FROM s.started_at),
      EXTRACT(DOW FROM s.started_at),
      DATE(s.started_at)
    ORDER BY usage_date DESC, hour_of_day
  `

  const params = []
  if (codeId) {
    params.push(codeId)
  } else {
    if (startDate) params.push(startDate)
    if (endDate) params.push(endDate)
  }

  const { data, error } = await supabase.rpc('execute_sql', {
    sql_query: query,
    params: params
  })

  if (error) {
    console.error('Error fetching usage patterns:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to fetch usage patterns' },
      { status: 500 }
    )
  }

  return NextResponse.json<ApiResponse>({
    success: true,
    data: data || []
  })
}