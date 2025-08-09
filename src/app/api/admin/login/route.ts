import { NextRequest, NextResponse } from 'next/server'
import { createAdminSession } from '@/lib/auth/admin'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      )
    }

    // For development/testing - check against default admin credentials
    // In production, this should query the database
    const defaultAdminEmail = 'admin@stppl.com'
    const defaultAdminPassword = 'admin123'

    if (email.toLowerCase() !== defaultAdminEmail) {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Verify password
    const isValidPassword = password === defaultAdminPassword

    if (!isValidPassword) {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Create a mock admin ID for development
    const mockAdminId = 'dev-admin-123'

    // Create session
    const sessionToken = await createAdminSession(mockAdminId)

    // Set cookie
    const response = NextResponse.json(
      { 
        message: 'Login successful', 
        admin: { 
          id: mockAdminId, 
          email: defaultAdminEmail, 
          name: 'Development Admin' 
        } 
      },
      { status: 200 }
    )

    response.cookies.set('admin_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60, // 8 hours
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Admin login error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}