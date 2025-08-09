import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createServiceClient()
    
    // Run the cleanup function
    const { data, error } = await supabase
      .rpc('cleanup_inactive_sessions')
    
    if (error) {
      console.error('Cleanup error:', error)
      return NextResponse.json({
        success: false,
        error: error.message
      })
    }
    
    return NextResponse.json({
      success: true,
      message: `Cleaned up ${data} inactive sessions`
    })
    
  } catch (error) {
    console.error('Cleanup API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    })
  }
}