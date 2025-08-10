import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Fetch current settings
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching settings:', error)
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }

    // Return default settings if none exist
    const defaultSettings = {
      general: {
        siteName: 'Secure Live Stream Portal',
        siteDescription: 'Professional Live Streaming Platform',
        timezone: 'Europe/London',
        language: 'en',
        maintenanceMode: false
      },
      streaming: {
        hlsUrl: 'https://cdn3.wowza.com/5/NVF5TVdNQmR5OHRI/cln/smil:clnout.smil/playlist.m3u8',
        playerId: '46fbbf30-5af9-4860-b4b1-6706ac91984e',
        playerToken: 'eyJraWQiOiJYMzdESU55UmF6bFEiLCJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9.eyJjIjoie1wiYWNsXCI6MzgsXCJpZFwiOlwiWDM3RElOeVJhemxRXCJ9IiwiaXNzIjoiRmxvd3BsYXllciJ9._rtVLPQzfdsbtI4UHrjX1IzwwfGTPQK988D8W0C9sEOrvZEG82i9S4ApbIkxYY5sQwq38h2DWFypXM2d15AYng',
        autoplay: false,
        muted: true
      },
      email: {
        brevoApiKey: '',
        fromEmail: 'noreply@example.com',
        fromName: 'Secure Live Stream Portal',
        replyToEmail: '',
        enableEmailNotifications: true
      },
      security: {
        sessionTimeout: '30',
        maxLoginAttempts: '5',
        requireStrongPasswords: true,
        enableTwoFactor: false,
        allowedIpRanges: ''
      },
      notifications: {
        emailNotifications: true,
        adminAlerts: true,
        sessionAlerts: true,
        errorReporting: true
      }
    }

    return NextResponse.json({
      success: true,
      settings: data?.settings || defaultSettings
    })
  } catch (error) {
    console.error('Settings fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Save settings
export async function POST(request: NextRequest) {
  try {
    const { settings } = await request.json()

    if (!settings) {
      return NextResponse.json({ error: 'Settings data is required' }, { status: 400 })
    }

    // Try to update existing settings first
    const { data: existingData } = await supabase
      .from('system_settings')
      .select('id')
      .single()

    let result
    if (existingData) {
      // Update existing settings
      result = await supabase
        .from('system_settings')
        .update({
          settings,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingData.id)
    } else {
      // Insert new settings
      result = await supabase
        .from('system_settings')
        .insert({
          settings,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
    }

    if (result.error) {
      console.error('Error saving settings:', result.error)
      return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Settings saved successfully'
    })
  } catch (error) {
    console.error('Settings save error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}