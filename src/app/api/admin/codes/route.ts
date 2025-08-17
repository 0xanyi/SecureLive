import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import type { ApiResponse, AccessCode, BulkAccessCode } from '@/types/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const search = searchParams.get('search')
    const status = searchParams.get('status') // active, expired, all

    const supabase = await createServiceClient()

    let query = supabase
      .from('access_codes')
      .select(`
        *,
        events (
          id,
          title
        ),
        admin_users!access_codes_created_by_fkey (
          email,
          name
        )
      `)

    // Filter by type if specified
    if (type) {
      query = query.eq('type', type)
    }

    // Filter by status
    if (status === 'active') {
      query = query.eq('is_active', true).gt('expires_at', new Date().toISOString())
    } else if (status === 'expired') {
      query = query.or('is_active.eq.false,expires_at.lt.' + new Date().toISOString())
    }

    // Search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`)
    }

    // Pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: codes, error, count } = await query

    if (error) {
      console.error('Error fetching access codes:', error)
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Failed to fetch access codes' },
        { status: 500 }
      )
    }

    // Transform data for bulk codes
    const transformedCodes = codes?.map(code => {
      if (code.type === 'bulk') {
        return {
          ...code,
          usage_count: code.usage_count || 0,
          max_usage_count: code.max_usage_count || 0,
          expires_at: code.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        } as BulkAccessCode
      }
      return code as AccessCode
    }) || []

    return NextResponse.json({
      success: true,
      codes: transformedCodes,
      meta: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      }
    })

  } catch (error) {
    console.error('Access codes API error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, name, code, max_usage_count, max_concurrent_sessions, expires_at, event_id } = body

    // Validate required fields
    if (!type || !name || !code) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Missing required fields: type, name, code' },
        { status: 400 }
      )
    }

    const supabase = await createServiceClient()

    // Check if code already exists
    const { data: existingCode } = await supabase
      .from('access_codes')
      .select('id')
      .eq('code', code)
      .single()

    if (existingCode) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Access code already exists' },
        { status: 409 }
      )
    }

    // Create the access code
    const newCode = {
      type,
      name,
      code,
      max_concurrent_sessions: max_concurrent_sessions || 1,
      is_active: true,
      created_by: 'admin', // TODO: Get from session
      ...(type === 'bulk' && {
        max_usage_count: max_usage_count || 10,
        usage_count: 0,
        expires_at: expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }),
      ...(event_id && { event_id })
    }

    const { data: createdCode, error } = await supabase
      .from('access_codes')
      .insert(newCode)
      .select(`
        *,
        events (
          id,
          title
        ),
        admin_users!access_codes_created_by_fkey (
          email,
          name
        )
      `)
      .single()

    if (error) {
      console.error('Error creating access code:', error)
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Failed to create access code' },
        { status: 500 }
      )
    }

    return NextResponse.json<ApiResponse<AccessCode | BulkAccessCode>>({
      success: true,
      data: createdCode,
      message: 'Access code created successfully'
    })

  } catch (error) {
    console.error('Create access code API error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Missing access code ID' },
        { status: 400 }
      )
    }

    const supabase = await createServiceClient()

    const { data: updatedCode, error } = await supabase
      .from('access_codes')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        events (
          id,
          title
        ),
        admin_users!access_codes_created_by_fkey (
          email,
          name
        )
      `)
      .single()

    if (error) {
      console.error('Error updating access code:', error)
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Failed to update access code' },
        { status: 500 }
      )
    }

    return NextResponse.json<ApiResponse<AccessCode | BulkAccessCode>>({
      success: true,
      data: updatedCode,
      message: 'Access code updated successfully'
    })

  } catch (error) {
    console.error('Update access code API error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Missing access code ID' },
        { status: 400 }
      )
    }

    const supabase = await createServiceClient()

    // Check if code has active sessions
    const { data: activeSessions } = await supabase
      .from('sessions')
      .select('id')
      .eq('code_id', id)
      .eq('is_active', true)

    if (activeSessions && activeSessions.length > 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Cannot delete access code with active sessions' },
        { status: 409 }
      )
    }

    const { error } = await supabase
      .from('access_codes')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting access code:', error)
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Failed to delete access code' },
        { status: 500 }
      )
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Access code deleted successfully'
    })

  } catch (error) {
    console.error('Delete access code API error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}