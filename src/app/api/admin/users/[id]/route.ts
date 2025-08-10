import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdminAuth } from '@/lib/auth/admin'
import bcrypt from 'bcryptjs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// PUT - Update admin user
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAdminAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only super_admin can update users
    if (authResult.user?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { email, name, password, role, permissions } = await request.json()
    const userId = params.id

    if (!email || !name || !role) {
      return NextResponse.json({ 
        error: 'Email, name, and role are required' 
      }, { status: 400 })
    }

    // Validate role
    if (!['admin', 'super_admin', 'code_generator'].includes(role)) {
      return NextResponse.json({ 
        error: 'Invalid role. Must be admin, super_admin, or code_generator' 
      }, { status: 400 })
    }

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', userId)
      .single()

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prepare update data
    const updateData: any = {
      email: email.toLowerCase(),
      name,
      role,
      permissions,
      updated_at: new Date().toISOString()
    }

    // Hash new password if provided
    if (password && password.trim() !== '') {
      updateData.password_hash = await bcrypt.hash(password, 12)
    }

    // Update user
    const { data: updatedUser, error } = await supabase
      .from('admin_users')
      .update(updateData)
      .eq('id', userId)
      .select('id, email, name, role, permissions, created_at, updated_at')
      .single()

    if (error) {
      console.error('Error updating admin user:', error)
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: 'User updated successfully'
    })
  } catch (error) {
    console.error('Admin user update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete admin user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAdminAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only super_admin can delete users
    if (authResult.user?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const userId = params.id

    // Prevent deleting self
    if (userId === authResult.user?.id) {
      return NextResponse.json({ 
        error: 'Cannot delete your own account' 
      }, { status: 400 })
    }

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', userId)
      .single()

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Use the safe delete function to handle foreign key constraints
    const { data, error } = await supabase.rpc('delete_admin_user', {
      user_id: userId
    })

    if (error) {
      console.error('Error deleting admin user:', error)
      return NextResponse.json({ 
        error: error.message || 'Failed to delete user. User may have associated records.' 
      }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ 
        error: 'User not found or could not be deleted' 
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    })
  } catch (error) {
    console.error('Admin user deletion error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}