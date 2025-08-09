import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ApiResponse } from '@/types/database'

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const now = new Date().toISOString()

    // Update session last activity
    const { error } = await supabase
      .from('sessions')
      .update({ last_activity: now })
      .eq('id', sessionId)
      .eq('is_active', true)

    if (error) {
      console.error('Heartbeat update error:', error)
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Failed to update session' },
        { status: 500 }
      )
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Session updated',
    })

  } catch (error) {
    console.error('Heartbeat error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}