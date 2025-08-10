import { NextRequest, NextResponse } from 'next/server'
import { validateAdminSession } from '@/lib/auth/admin'

export async function GET(request: NextRequest) {
  try {
    const adminSession = await validateAdminSession()
    
    if (!adminSession.valid) {
      return NextResponse.json(
        { message: 'Invalid session' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      valid: true,
      admin: adminSession.admin
    })
  } catch (error) {
    console.error('Admin validation error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}