import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import type { SessionValidationResponse } from '@/types/database'

const secretKey = process.env.JWT_SECRET
const key = new TextEncoder().encode(secretKey)

export async function encrypt(payload: Record<string, unknown>) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(key)
}

export async function decrypt(input: string): Promise<Record<string, unknown>> {
  const { payload } = await jwtVerify(input, key, {
    algorithms: ['HS256'],
  })
  return payload
}

export async function createSession(sessionId: string, codeId: string) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  
  // Encrypt the session data
  const session = await encrypt({ sessionId, codeId, expiresAt })
  
  // Store the session in cookies
  const cookieStore = await cookies()
  cookieStore.set('session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  })
  
  return session
}

export async function getSession(): Promise<{ sessionId: string; codeId: string } | null> {
  const cookieStore = await cookies()
  const session = cookieStore.get('session')?.value
  
  if (!session) return null
  
  try {
    const payload = await decrypt(session)
    return {
      sessionId: payload.sessionId as string,
      codeId: payload.codeId as string,
    }
  } catch (error) {
    console.error('Session decrypt error:', error)
    return null
  }
}

export async function deleteSession() {
  const cookieStore = await cookies()
  cookieStore.delete('session')
}

export async function validateSession(sessionToken?: string): Promise<SessionValidationResponse> {
  const { createServiceClient } = await import('@/lib/supabase/server')
  const supabase = await createServiceClient()
  
  // Get session from cookie if not provided
  let sessionData
  if (sessionToken) {
    try {
      const payload = await decrypt(sessionToken)
      sessionData = {
        sessionId: payload.sessionId as string,
        codeId: payload.codeId as string,
      }
    } catch {
      return { valid: false, error: 'Invalid session token' }
    }
  } else {
    sessionData = await getSession()
    if (!sessionData) {
      return { valid: false, error: 'No active session' }
    }
  }
  
  // Validate session in database
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select(`
      *,
      access_codes (*)
    `)
    .eq('id', sessionData.sessionId)
    .eq('is_active', true)
    .single()
  
  if (sessionError || !session) {
    return { valid: false, error: 'Session not found or inactive' }
  }
  
  // Check if session is expired (inactive for more than 30 minutes)
  const lastActivity = new Date(session.last_activity)
  const now = new Date()
  const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000)
  
  if (lastActivity < thirtyMinutesAgo) {
    // Mark session as inactive
    await supabase
      .from('sessions')
      .update({ 
        is_active: false, 
        ended_at: now.toISOString() 
      })
      .eq('id', session.id)
    
    return { valid: false, error: 'Session expired due to inactivity' }
  }
  
  // Update last activity
  await supabase
    .from('sessions')
    .update({ last_activity: now.toISOString() })
    .eq('id', session.id)
  
  return {
    valid: true,
    session: session,
    accessCode: session.access_codes,
  }
}

export async function endSession(sessionId: string) {
  const { createServiceClient } = await import('@/lib/supabase/server')
  const supabase = await createServiceClient()
  const now = new Date().toISOString()
  
  // Get session data for attendance logging
  const { data: session } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single()
  
  if (session) {
    // Update attendance log with logout time
    const duration = Math.floor(
      (new Date(now).getTime() - new Date(session.started_at).getTime()) / (1000 * 60)
    )
    
    await supabase
      .from('attendance_logs')
      .update({
        logout_time: now,
        duration_minutes: duration,
      })
      .eq('session_id', sessionId)
    
    // Mark session as ended
    await supabase
      .from('sessions')
      .update({
        is_active: false,
        ended_at: now,
      })
      .eq('id', sessionId)
  }
  
  // Delete session cookie
  await deleteSession()
}