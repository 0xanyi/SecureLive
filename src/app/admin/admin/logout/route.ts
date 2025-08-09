import { NextRequest, NextResponse } from 'next/server'
import { deleteAdminSession } from '@/lib/auth/admin'
import type { ApiResponse } from '@/types/database'

export async function POST(request: NextRequest) {
  try {
    // Delete admin session cookie
    await deleteAdminSession()

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Logged out successfully',
    })

  } catch (error) {
    console.error('Admin logout error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}