import { NextRequest, NextResponse } from 'next/server'
import { endSession } from '@/lib/auth/session'
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

    // End the session and clean up
    await endSession(sessionId)

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Logged out successfully',
    })

  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}