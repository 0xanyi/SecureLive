import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import type { ApiResponse } from '@/types/database'

export interface BulkCodeExportData {
  code_id: string
  code_name: string
  code_value: string
  type: string
  created_at: string
  expires_at: string
  max_usage_count: number
  current_usage: number
  capacity_utilization: number
  is_active: boolean
  is_expired: boolean
  event_title?: string
  created_by_email: string
  total_sessions: number
  active_sessions: number
  average_session_duration: number
  peak_concurrent_usage: number
  first_usage_at?: string
  last_usage_at?: string
}

export interface BulkCodeSessionExportData {
  code_id: string
  code_name: string
  session_id: string
  started_at: string
  ended_at?: string
  duration_minutes?: number
  ip_address: string
  user_agent: string
  is_active: boolean
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json'
    const type = searchParams.get('type') || 'codes'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const codeId = searchParams.get('codeId')

    const supabase = await createServiceClient()

    let data: any
    let filename: string

    switch (type) {
      case 'codes':
        data = await exportBulkCodes(supabase, startDate, endDate, codeId)
        filename = `bulk-codes-${new Date().toISOString().split('T')[0]}`
        break
      case 'sessions':
        data = await exportBulkCodeSessions(supabase, startDate, endDate, codeId)
        filename = `bulk-code-sessions-${new Date().toISOString().split('T')[0]}`
        break
      case 'analytics':
        data = await exportBulkCodeAnalytics(supabase, startDate, endDate, codeId)
        filename = `bulk-code-analytics-${new Date().toISOString().split('T')[0]}`
        break
      default:
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Invalid export type' },
          { status: 400 }
        )
    }

    if (!data.success) {
      return NextResponse.json<ApiResponse>(data, { status: 500 })
    }

    switch (format) {
      case 'csv':
        return generateCSVResponse(data.data, filename, type)
      case 'json':
        return NextResponse.json<ApiResponse>({
          success: true,
          data: data.data
        })
      default:
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Invalid format. Supported: json, csv' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Bulk code export API error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function exportBulkCodes(
  supabase: any,
  startDate: string | null,
  endDate: string | null,
  codeId: string | null
) {
  const query = `
    SELECT 
      ac.id as code_id,
      ac.name as code_name,
      ac.code as code_value,
      ac.type,
      ac.created_at,
      ac.expires_at,
      ac.max_usage_count,
      ac.usage_count as current_usage,
      ROUND((ac.usage_count::decimal / ac.max_usage_count) * 100, 2) as capacity_utilization,
      ac.is_active,
      CASE WHEN ac.expires_at < NOW() THEN true ELSE false END as is_expired,
      e.title as event_title,
      au.email as created_by_email,
      COALESCE(session_stats.total_sessions, 0) as total_sessions,
      COALESCE(session_stats.active_sessions, 0) as active_sessions,
      COALESCE(session_stats.average_duration, 0) as average_session_duration,
      COALESCE(session_stats.peak_concurrent, 0) as peak_concurrent_usage,
      session_stats.first_usage_at,
      session_stats.last_usage_at
    FROM access_codes ac
    LEFT JOIN events e ON ac.event_id = e.id
    LEFT JOIN admin_users au ON ac.created_by = au.id
    LEFT JOIN (
      SELECT 
        code_id,
        COUNT(*) as total_sessions,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_sessions,
        AVG(EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - started_at))/60) as average_duration,
        MAX(concurrent_count) as peak_concurrent,
        MIN(started_at) as first_usage_at,
        MAX(started_at) as last_usage_at
      FROM (
        SELECT 
          s1.*,
          (SELECT COUNT(*) 
           FROM sessions s2 
           WHERE s2.code_id = s1.code_id 
           AND s2.started_at <= s1.started_at 
           AND (s2.ended_at IS NULL OR s2.ended_at >= s1.started_at)
          ) as concurrent_count
        FROM sessions s1
      ) session_data
      GROUP BY code_id
    ) session_stats ON ac.id = session_stats.code_id
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
    console.error('Error exporting bulk codes:', error)
    return { success: false, error: 'Failed to export bulk codes data' }
  }

  const exportData: BulkCodeExportData[] = (data || []).map((row: any) => ({
    code_id: row.code_id,
    code_name: row.code_name,
    code_value: row.code_value,
    type: row.type,
    created_at: row.created_at,
    expires_at: row.expires_at,
    max_usage_count: row.max_usage_count,
    current_usage: row.current_usage,
    capacity_utilization: parseFloat(row.capacity_utilization) || 0,
    is_active: row.is_active,
    is_expired: row.is_expired,
    event_title: row.event_title,
    created_by_email: row.created_by_email,
    total_sessions: parseInt(row.total_sessions) || 0,
    active_sessions: parseInt(row.active_sessions) || 0,
    average_session_duration: parseFloat(row.average_session_duration) || 0,
    peak_concurrent_usage: parseInt(row.peak_concurrent_usage) || 0,
    first_usage_at: row.first_usage_at,
    last_usage_at: row.last_usage_at
  }))

  return { success: true, data: exportData }
}

async function exportBulkCodeSessions(
  supabase: any,
  startDate: string | null,
  endDate: string | null,
  codeId: string | null
) {
  const query = `
    SELECT 
      s.code_id,
      ac.name as code_name,
      s.id as session_id,
      s.started_at,
      s.ended_at,
      EXTRACT(EPOCH FROM (COALESCE(s.ended_at, NOW()) - s.started_at))/60 as duration_minutes,
      s.ip_address,
      s.user_agent,
      s.is_active
    FROM sessions s
    JOIN access_codes ac ON s.code_id = ac.id
    WHERE ac.type = 'bulk'
    ${codeId ? 'AND s.code_id = $1' : ''}
    ${startDate && !codeId ? 'AND s.started_at >= $1' : ''}
    ${endDate && !codeId ? `AND s.started_at <= $${startDate ? '2' : '1'}` : ''}
    ORDER BY s.started_at DESC
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
    console.error('Error exporting bulk code sessions:', error)
    return { success: false, error: 'Failed to export sessions data' }
  }

  const exportData: BulkCodeSessionExportData[] = (data || []).map((row: any) => ({
    code_id: row.code_id,
    code_name: row.code_name,
    session_id: row.session_id,
    started_at: row.started_at,
    ended_at: row.ended_at,
    duration_minutes: parseFloat(row.duration_minutes) || 0,
    ip_address: row.ip_address,
    user_agent: row.user_agent,
    is_active: row.is_active
  }))

  return { success: true, data: exportData }
}

async function exportBulkCodeAnalytics(
  supabase: any,
  startDate: string | null,
  endDate: string | null,
  codeId: string | null
) {
  // Export comprehensive analytics data
  const query = `
    WITH hourly_usage AS (
      SELECT 
        s.code_id,
        EXTRACT(HOUR FROM s.started_at) as hour,
        COUNT(*) as usage_count
      FROM sessions s
      JOIN access_codes ac ON s.code_id = ac.id
      WHERE ac.type = 'bulk'
      ${codeId ? 'AND s.code_id = $1' : ''}
      ${startDate && !codeId ? 'AND s.started_at >= $1' : ''}
      ${endDate && !codeId ? `AND s.started_at <= $${startDate ? '2' : '1'}` : ''}
      GROUP BY s.code_id, EXTRACT(HOUR FROM s.started_at)
    ),
    daily_usage AS (
      SELECT 
        s.code_id,
        DATE(s.started_at) as usage_date,
        COUNT(*) as daily_sessions,
        AVG(EXTRACT(EPOCH FROM (COALESCE(s.ended_at, NOW()) - s.started_at))/60) as avg_daily_duration
      FROM sessions s
      JOIN access_codes ac ON s.code_id = ac.id
      WHERE ac.type = 'bulk'
      ${codeId ? 'AND s.code_id = $1' : ''}
      ${startDate && !codeId ? 'AND s.started_at >= $1' : ''}
      ${endDate && !codeId ? `AND s.started_at <= $${startDate ? '2' : '1'}` : ''}
      GROUP BY s.code_id, DATE(s.started_at)
    )
    SELECT 
      ac.id as code_id,
      ac.name as code_name,
      ac.created_at,
      ac.expires_at,
      ac.max_usage_count,
      ac.usage_count,
      e.title as event_title,
      json_agg(DISTINCT jsonb_build_object('hour', hu.hour, 'usage_count', hu.usage_count)) 
        FILTER (WHERE hu.hour IS NOT NULL) as hourly_patterns,
      json_agg(DISTINCT jsonb_build_object('date', du.usage_date, 'sessions', du.daily_sessions, 'avg_duration', du.avg_daily_duration)) 
        FILTER (WHERE du.usage_date IS NOT NULL) as daily_patterns
    FROM access_codes ac
    LEFT JOIN events e ON ac.event_id = e.id
    LEFT JOIN hourly_usage hu ON ac.id = hu.code_id
    LEFT JOIN daily_usage du ON ac.id = du.code_id
    WHERE ac.type = 'bulk'
    ${codeId ? 'AND ac.id = $1' : ''}
    ${startDate && !codeId ? 'AND ac.created_at >= $1' : ''}
    ${endDate && !codeId ? `AND ac.created_at <= $${startDate ? '2' : '1'}` : ''}
    GROUP BY ac.id, ac.name, ac.created_at, ac.expires_at, ac.max_usage_count, ac.usage_count, e.title
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
    console.error('Error exporting bulk code analytics:', error)
    return { success: false, error: 'Failed to export analytics data' }
  }

  return { success: true, data: data || [] }
}

function generateCSVResponse(data: any[], filename: string, type: string) {
  if (!data || data.length === 0) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'No data to export' },
      { status: 404 }
    )
  }

  // Generate CSV headers based on the first row
  const headers = Object.keys(data[0])
  
  // Generate CSV content
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header]
        // Handle special cases for CSV formatting
        if (value === null || value === undefined) return ''
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        if (typeof value === 'object') {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`
        }
        return String(value)
      }).join(',')
    )
  ].join('\n')

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}.csv"`
    }
  })
}