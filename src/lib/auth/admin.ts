import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { SignJWT, jwtVerify } from 'jose'
import type { AdminUser } from '@/types/database'

const secretKey = process.env.JWT_SECRET
const key = new TextEncoder().encode(secretKey)

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

    // For development mode - return mock admin data
    if (adminId === 'dev-admin-123') {
      return {
        valid: true,
        admin: {
          id: '00000000-0000-0000-0000-000000000001', // Valid UUID for dev
          email: 'admin@stppl.com',
          name: 'Development Admin',
          password_hash: '',
          role: 'super_admin',
          permissions: {
            canManageUsers: true,
            canManageSettings: true,
            canManageEvents: true,
            canGenerateCodes: true,
            canViewAnalytics: true,
            canManageEmails: true
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      }
    }

    // For production mode - query database
    const supabase = await createClient()
    const { data: admin, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', adminId)
      .single()

    if (error || !admin) {
      return { valid: false, error: 'Admin not found' }
    }

    return { valid: true, admin }
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
  const supabase = await createClient()
  
  const { data: admin, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('email', email.toLowerCase())
    .single()

  if (error || !admin) {
    return null
  }

  // Simple password check for demo - in production use bcrypt
  const isValidPassword = password === 'admin123' && admin.email === 'admin@stppl.com'
  
  if (!isValidPassword) {
    return null
  }

  return admin
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