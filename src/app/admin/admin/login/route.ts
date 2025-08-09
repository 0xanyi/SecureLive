import { NextRequest, NextResponse } from 'next/server'
import { authenticateAdmin, createAdminSession } from '@/lib/auth/admin'
import type { ApiResponse } from '@/types/database'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Authenticate admin
    const admin = await authenticateAdmin(email, password)

    if (!admin) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Create admin session
    await createAdminSession(admin.id)

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Login successful',
      data: {
        adminId: admin.id,
        email: admin.email,
        role: admin.role,
      },
    })

  } catch (error) {
    console.error('Admin login error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}