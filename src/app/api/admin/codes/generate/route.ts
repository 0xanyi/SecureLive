import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { codes, sendEmail } = await request.json()

    if (!codes || !Array.isArray(codes)) {
      return NextResponse.json(
        { error: 'Invalid codes data' },
        { status: 400 }
      )
    }

    // Check if Supabase is properly configured
    const hasSupabaseConfig = process.env.SUPABASE_SERVICE_ROLE_KEY && 
                              process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!hasSupabaseConfig) {
      // Development mode - return mock success response
      const mockInsertedCodes = codes.map((code: any, index: number) => ({
        id: `mock-id-${Date.now()}-${index}`,
        code: code.code,
        type: code.type,
        name: code.name,
        max_concurrent_sessions: code.max_concurrent_sessions,
        expires_at: code.expires_at,
        is_active: true,
        created_at: new Date().toISOString(),
      }))

      console.log('Generated codes (no database config):', mockInsertedCodes)
      
      return NextResponse.json({
        success: true,
        codes: mockInsertedCodes,
        message: `Successfully generated ${codes.length} access codes (no database config)`
      })
    }

    // Use actual database
    try {
      const { createServiceClient } = await import('@/lib/supabase/server')
      const supabase = await createServiceClient()

      // Get or create a system admin user
      let { data: systemAdmin } = await supabase
        .from('admin_users')
        .select('id')
        .eq('email', 'system@stppl.org')
        .single()

      if (!systemAdmin) {
        // Create a system admin user if it doesn't exist
        const { data: newAdmin, error: adminError } = await supabase
          .from('admin_users')
          .insert({
            email: 'system@stppl.org',
            name: 'System Administrator',
            password_hash: 'system_generated', // Placeholder hash for system user
            role: 'admin',
          })
          .select('id')
          .single()

        if (adminError) {
          console.error('Failed to create system admin:', adminError)
          return NextResponse.json(
            { error: 'Failed to initialize system admin' },
            { status: 500 }
          )
        }
        systemAdmin = newAdmin
      }

      // Insert codes into database
      const { data: insertedCodes, error } = await supabase
        .from('access_codes')
        .insert(
          codes.map((code: any) => ({
            code: code.code,
            type: code.type,
            name: code.name,
            email: code.email || null,
            max_concurrent_sessions: code.max_concurrent_sessions,
            expires_at: code.expires_at,
            is_active: true,
            created_by: systemAdmin.id,
          }))
        )
        .select()

      if (error) {
        console.error('Database error:', error)
        return NextResponse.json(
          { error: 'Failed to save codes to database' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        codes: insertedCodes,
        message: `Successfully generated ${codes.length} access codes`
      })

    } catch (dbError) {
      console.error('Database connection error:', dbError)
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      )
    }

    // TODO: Implement email sending if sendEmail is true
    if (sendEmail) {
      console.log('Email sending requested but not implemented yet')
    }

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}