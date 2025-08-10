import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdminAuth } from '@/lib/auth/admin'
import bcrypt from 'bcryptjs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Fetch all admin users
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only super_admin can view all users
    if (authResult.user?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { data: users, error } = await supabase
      .from('admin_users')
      .select('id, email, name, role, permissions, last_login, created_at, created_by')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching admin users:', error)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      users: users || []
    })
  } catch (error) {
    console.error('Admin users fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new admin user
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only super_admin can create users
    if (authResult.user?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { email, name, password, role, permissions } = await request.json()

    if (!email || !name || !password || !role) {
      return NextResponse.json({ 
        error: 'Email, name, password, and role are required' 
      }, { status: 400 })
    }

    // Validate role
    if (!['admin', 'super_admin', 'code_generator'].includes(role)) {
      return NextResponse.json({ 
        error: 'Invalid role. Must be admin, super_admin, or code_generator' 
      }, { status: 400 })
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('admin_users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (existingUser) {
      return NextResponse.json({ 
        error: 'User with this email already exists' 
      }, { status: 400 })
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Set default permissions based on role
    const defaultPermissions = {
      admin: {
        canManageUsers: false,
        canManageSettings: true,
        canManageEvents: true,
        canGenerateCodes: true,
        canViewAnalytics: true,
        canManageEmails: true
      },
      super_admin: {
        canManageUsers: true,
        canManageSettings: true,
        canManageEvents: true,
        canGenerateCodes: true,
        canViewAnalytics: true,
        canManageEmails: true
      },
      code_generator: {
        canManageUsers: false,
        canManageSettings: false,
        canManageEvents: false,
        canGenerateCodes: true,
        canViewAnalytics: false,
        canManageEmails: false
      }
    }

    const userPermissions = permissions || defaultPermissions[role as keyof typeof defaultPermissions]

    // Create user
    const { data: newUser, error } = await supabase
      .from('admin_users')
      .insert({
        email: email.toLowerCase(),
        name,
        password_hash: passwordHash,
        role,
        permissions: userPermissions,
        created_by: authResult.user?.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id, email, name, role, permissions, created_at')
      .single()

    if (error) {
      console.error('Error creating admin user:', error)
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      user: newUser,
      message: 'User created successfully'
    })
  } catch (error) {
    console.error('Admin user creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}