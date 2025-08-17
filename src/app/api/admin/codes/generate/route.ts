import { NextRequest, NextResponse } from 'next/server'

// Validation function for bulk code parameters
function validateBulkCodeParams(code: any) {
  if (code.type === 'bulk') {
    // Validate max_usage_count is present and within range (1-400)
    if (!code.max_usage_count || typeof code.max_usage_count !== 'number') {
      return 'max_usage_count is required for bulk codes'
    }
    
    if (code.max_usage_count < 1 || code.max_usage_count > 400) {
      return 'max_usage_count must be between 1 and 400 for bulk codes'
    }
    
    // Bulk codes should not have email field
    if (code.email) {
      return 'Bulk codes cannot have an associated email address'
    }
  }
  
  return null // No validation errors
}

// Function to set automatic 24-hour expiration for bulk codes
function setExpirationForBulkCode(code: any) {
  if (code.type === 'bulk') {
    const now = new Date()
    const expirationTime = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours from now
    return expirationTime.toISOString()
  }
  return code.expires_at
}

export async function POST(request: NextRequest) {
  try {
    const { codes, sendEmail, event_id } = await request.json()

    if (!codes || !Array.isArray(codes)) {
      return NextResponse.json(
        { error: 'Invalid codes data' },
        { status: 400 }
      )
    }

    // Validate bulk code parameters
    for (let i = 0; i < codes.length; i++) {
      const validationError = validateBulkCodeParams(codes[i])
      if (validationError) {
        return NextResponse.json(
          { error: `Code ${i + 1}: ${validationError}` },
          { status: 400 }
        )
      }
    }

    // Process codes to set automatic expiration for bulk codes
    const processedCodes = codes.map(code => ({
      ...code,
      expires_at: setExpirationForBulkCode(code),
      usage_count: code.type === 'bulk' ? 0 : undefined, // Initialize usage count for bulk codes
      event_id: (code.type === 'bulk' && event_id) ? event_id : undefined, // Associate bulk codes with event if provided
    }))

    // Check if Supabase is properly configured
    const hasSupabaseConfig = process.env.SUPABASE_SERVICE_ROLE_KEY && 
                              process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!hasSupabaseConfig) {
      // Development mode - return mock success response
      const mockInsertedCodes = processedCodes.map((code: any, index: number) => ({
        id: `mock-id-${Date.now()}-${index}`,
        code: code.code,
        type: code.type,
        name: code.name,
        max_concurrent_sessions: code.max_concurrent_sessions,
        usage_count: code.usage_count,
        max_usage_count: code.max_usage_count,
        expires_at: code.expires_at,
        is_active: true,
        created_at: new Date().toISOString(),
      }))

      console.log('Generated codes (no database config):', mockInsertedCodes)
      
      return NextResponse.json({
        success: true,
        codes: mockInsertedCodes,
        message: `Successfully generated ${processedCodes.length} access codes (no database config)`
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
          processedCodes.map((code: any) => ({
            code: code.code,
            type: code.type,
            name: code.name,
            email: code.email || null,
            max_concurrent_sessions: code.max_concurrent_sessions,
            usage_count: code.usage_count || 0,
            max_usage_count: code.max_usage_count || 1,
            event_id: code.event_id || null,
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
        message: `Successfully generated ${processedCodes.length} access codes`
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