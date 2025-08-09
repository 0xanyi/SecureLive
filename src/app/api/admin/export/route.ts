import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServiceClient()
    const { searchParams } = new URL(request.url)
    
    const format = searchParams.get('format') || 'csv'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const type = searchParams.get('type') || 'attendance' // attendance, codes, sessions

    // Default to last 30 days if no dates provided
    const defaultEndDate = new Date()
    const defaultStartDate = new Date()
    defaultStartDate.setDate(defaultStartDate.getDate() - 30)

    const finalStartDate = startDate || defaultStartDate.toISOString().split('T')[0]
    const finalEndDate = endDate || defaultEndDate.toISOString().split('T')[0]

    let data: any[] = []
    let filename = ''
    let headers: string[] = []

    switch (type) {
      case 'attendance':
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance_logs')
          .select(`
            *,
            access_codes (code, name, type, description)
          `)
          .gte('date', finalStartDate)
          .lte('date', finalEndDate)
          .order('login_time', { ascending: false })

        if (attendanceError) {
          throw new Error('Failed to fetch attendance data')
        }

        data = attendanceData || []
        filename = `attendance-${finalStartDate}-to-${finalEndDate}`
        headers = ['Date', 'Code', 'Code Name', 'Code Type', 'Login Time', 'Logout Time', 'Duration (minutes)', 'IP Address']
        break

      case 'codes':
        const { data: codesData, error: codesError } = await supabase
          .from('access_codes')
          .select('*')
          .order('created_at', { ascending: false })

        if (codesError) {
          throw new Error('Failed to fetch codes data')
        }

        data = codesData || []
        filename = `access-codes-${new Date().toISOString().split('T')[0]}`
        headers = ['Code', 'Name', 'Type', 'Description', 'Active', 'Created At', 'Updated At']
        break

      case 'sessions':
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('active_sessions')
          .select(`
            *,
            access_codes (code, name, type)
          `)
          .order('login_time', { ascending: false })

        if (sessionsError) {
          throw new Error('Failed to fetch sessions data')
        }

        data = sessionsData || []
        filename = `active-sessions-${new Date().toISOString().split('T')[0]}`
        headers = ['Session ID', 'Code', 'Code Name', 'Code Type', 'Login Time', 'Last Activity', 'IP Address']
        break

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid export type'
        }, { status: 400 })
    }

    if (format === 'csv') {
      const csvContent = generateCSV(data, type, headers)
      
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}.csv"`,
        },
      })
    } else if (format === 'json') {
      return new NextResponse(JSON.stringify(data, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}.json"`,
        },
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Unsupported format. Use csv or json.'
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Export API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

function generateCSV(data: any[], type: string, headers: string[]): string {
  const csvRows = [headers.join(',')]

  data.forEach(item => {
    let row: string[] = []
    
    switch (type) {
      case 'attendance':
        row = [
          item.date || '',
          item.access_codes?.code || '',
          item.access_codes?.name || '',
          item.access_codes?.type || '',
          item.login_time || '',
          item.logout_time || '',
          item.duration_minutes?.toString() || '',
          item.ip_address || ''
        ]
        break
        
      case 'codes':
        row = [
          item.code || '',
          item.name || '',
          item.type || '',
          item.description || '',
          item.active?.toString() || '',
          item.created_at || '',
          item.updated_at || ''
        ]
        break
        
      case 'sessions':
        row = [
          item.session_id || '',
          item.access_codes?.code || '',
          item.access_codes?.name || '',
          item.access_codes?.type || '',
          item.login_time || '',
          item.last_activity || '',
          item.ip_address || ''
        ]
        break
    }
    
    // Escape commas and quotes in CSV data
    const escapedRow = row.map(field => {
      if (field.includes(',') || field.includes('"') || field.includes('\n')) {
        return `"${field.replace(/"/g, '""')}"`
      }
      return field
    })
    
    csvRows.push(escapedRow.join(','))
  })

  return csvRows.join('\n')
}