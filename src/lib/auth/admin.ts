import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import { SignJWT, jwtVerify } from 'jose'
import type { AdminUser } from '@/types/database'

const secretKey = process.env.JWT_SECRET
const key = new TextEncoder().encode(secretKey)

function getPermissionsForRole(role: string) {
  switch (role) {
    case 'super_admin':
      return {
        canManageUsers: true,
        canManageSettings: true,
        canManageEvents: true,
        canGenerateCodes: true,
        canViewAnalytics: true,
        canManageEmails: true
      }
    case 'admin':
      return {
        canManageUsers: false,
        canManageSettings: false,
        canManageEvents: true,
        canGenerateCodes: true,
        canViewAnalytics: true,
        canManageEmails: true
      }
    case 'code_generator':
      return {
        canManageUsers: false,
        canManageSettings: false,
        canManageEvents: false,
        canGenerateCodes: true,
        canViewAnalytics: false,
        canManageEmails: false
      }
    default:
      return {
        canManageUsers: false,
        canManageSettings: false,
        canManageEvents: false,
        canGenerateCodes: false,
        canViewAnalytics: false,
        canManageEmails: false
      }
  }
}

export interface AdminSessionValidation {
  valid: boolean
  admin?: AdminUser
  error?: string
}

export async function validateAdminSession(): Promise<AdminSessionValidation> {
  const cookieStore = await cookies()
  const adminSession = cookieStore.get('admin_session')?.value

  if (!adminSession) {
    return { valid: false, error: 'No admin session found' }
  }

  try {
    const payload = await jwtVerify(adminSession, key, {
      algorithms: ['HS256'],
    })

    const adminId = (payload.payload as { adminId: string }).adminId

    // Query database for admin user
    const supabase = await createServiceClient()
    const { data: admin, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', adminId)
      .single()

    if (error || !admin) {
      return { valid: false, error: 'Admin not found' }
    }

    // Add permissions based on role
    const adminWithPermissions = {
      ...admin,
      permissions: getPermissionsForRole(admin.role)
    }

    return { valid: true, admin: adminWithPermissions }
  } catch (error) {
    console.error('Admin session validation error:', error)
    return { valid: false, error: 'Invalid session' }
  }
}

export async function createAdminSession(adminId: string) {
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000) // 8 hours

  const session = await new SignJWT({ adminId, expiresAt })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(key)

  return session
}

export async function deleteAdminSession() {
  const cookieStore = await cookies()
  cookieStore.set('admin_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: new Date(0),
    sameSite: 'lax',
    path: '/',
  })
}

export async function authenticateAdmin(email: string, password: string): Promise<AdminUser | null> {
  const bcrypt = require('bcryptjs')
  const supabase = await createServiceClient()
  
  const { data: admin, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('email', email.toLowerCase())
    .single()

  if (error || !admin) {
    return null
  }

  // Verify password using bcrypt
  const isValidPassword = await bcrypt.compare(password, admin.password_hash)
  
  if (!isValidPassword) {
    return null
  }

  // Add permissions based on role
  return {
    ...admin,
    permissions: getPermissionsForRole(admin.role)
  }
}

export async function hashPassword(password: string): Promise<string> {
  // Simple hash for demo - in production use bcrypt
  return `hashed_${password}`
}

export interface AdminAuthResult {
  success: boolean
  user?: AdminUser
  error?: string
}

export async function verifyAdminAuth(_request: Request): Promise<AdminAuthResult> {
  try {
    const adminSession = await validateAdminSession()
    
    if (!adminSession.valid) {
      return { 
        success: false, 
        error: adminSession.error || 'Invalid admin session' 
      }
    }

    return { 
      success: true, 
      user: adminSession.admin 
    }
  } catch (error) {
    console.error('Admin auth verification error:', error)
    return { 
      success: false, 
      error: 'Authentication verification failed' 
    }
  }
}

export function hasPermission(user: AdminUser | undefined, permission: keyof AdminUser['permissions']): boolean {
  if (!user) return false
  if (user.role === 'super_admin') return true
  return user.permissions[permission] === true
}

export async function verifyAdminPermission(
  request: Request, 
  permission: keyof AdminUser['permissions']
): Promise<AdminAuthResult> {
  const authResult = await verifyAdminAuth(request)
  
  if (!authResult.success) {
    return authResult
  }

  if (!hasPermission(authResult.user, permission)) {
    return {
      success: false,
      error: 'Insufficient permissions'
    }
  }

  return authResult
}