import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServiceClient()
    
    // Test basic connection
    const { data, error } = await supabase
      .from('access_codes')
      .select('count')
      .limit(1)
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error
      })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      data
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Connection failed',
      details: error
    })
  }
}