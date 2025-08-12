import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Fetch streaming settings
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('settings')
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching streaming settings:', error)
      return NextResponse.json({ error: 'Failed to fetch streaming settings' }, { status: 500 })
    }

    const streamingSettings = data?.settings?.streaming || {
      hlsUrl: 'https://cdn3.wowza.com/5/NVF5TVdNQmR5OHRI/cln/smil:clnout.smil/playlist.m3u8',
      playerId: '46fbbf30-5af9-4860-b4b1-6706ac91984e',
      playerToken: 'eyJraWQiOiJYMzdESU55UmF6bFEiLCJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9.eyJjIjoie1wiYWNsXCI6MzgsXCJpZFwiOlwiWDM3RElOeVJhemxRXCJ9IiwiaXNzIjoiRmxvd3BsYXllciJ9._rtVLPQzfdsbtI4UHrjX1IzwwfGTPQK988D8W0C9sEOrvZEG82i9S4ApbIkxYY5sQwq38h2DWFypXM2d15AYng',
      autoplay: false,
      muted: true,
      posterImage: ''
    }

    return NextResponse.json({
      success: true,
      streamingSettings
    })
  } catch (error) {
    console.error('Streaming settings fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}