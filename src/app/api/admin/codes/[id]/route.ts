import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServiceClient()
    const { id } = params
    const body = await request.json()

    const { data, error } = await supabase
      .from('access_codes')
      .update({
        name: body.name,
        email: body.email,
        max_concurrent_sessions: body.max_concurrent_sessions,
        is_active: body.is_active,
        expires_at: body.expires_at
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating access code:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in PUT /api/admin/codes/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServiceClient()
    const { id } = params

    const { error } = await supabase
      .from('access_codes')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting access code:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/admin/codes/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}