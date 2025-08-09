import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServiceClient()
    
    // Fetch all sessions with access code details
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select(`
        *,
        access_codes (
          code,
          name,
          type
        )
      `)
      .order('started_at', { ascending: false })
    
    if (error) {
      console.error('Sessions fetch error:', error)
      return NextResponse.json({
        success: false,
        error: error.message
      })
    }
    
    // Process sessions to add status based on activity
    const processedSessions = sessions?.map(session => {
      const lastActivity = new Date(session.last_activity)
      const now = new Date()
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000)
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
      
      let status: 'active' | 'idle' | 'disconnected'
      
      if (!session.is_active || session.ended_at) {
        status = 'disconnected'
      } else if (lastActivity < thirtyMinutesAgo) {
        status = 'disconnected'
      } else if (lastActivity < fiveMinutesAgo) {
        status = 'idle'
      } else {
        status = 'active'
      }
      
      return {
        ...session,
        status
      }
    }) || []
    
    return NextResponse.json({
      success: true,
      data: processedSessions
    })
    
  } catch (error) {
    console.error('Sessions API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    })
  }
}