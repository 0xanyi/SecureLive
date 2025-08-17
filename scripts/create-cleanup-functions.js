#!/usr/bin/env node

/**
 * Script to create cleanup functions directly in Supabase
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createCleanupFunctions() {
  console.log('🚀 Creating cleanup functions...')

  // Function 1: cleanup_bulk_code_sessions
  const cleanupBulkCodeSessionsSQL = `
    CREATE OR REPLACE FUNCTION cleanup_bulk_code_sessions()
    RETURNS TABLE (
        cleaned_sessions INTEGER,
        decremented_codes INTEGER,
        deactivated_codes INTEGER,
        terminated_sessions INTEGER
    ) 
    SET search_path = public
    AS $func$
    DECLARE
        v_cleaned_sessions INTEGER := 0;
        v_decremented_codes INTEGER := 0;
        v_deactivated_codes INTEGER := 0;
        v_terminated_sessions INTEGER := 0;
        v_session_record RECORD;
        v_code_record RECORD;
    BEGIN
        -- Step 1: Mark inactive sessions for bulk codes (30+ minutes of inactivity)
        UPDATE sessions 
        SET is_active = false, ended_at = NOW()
        FROM access_codes ac
        WHERE sessions.code_id = ac.id
        AND ac.type = 'bulk'
        AND sessions.is_active = true 
        AND sessions.last_activity < NOW() - INTERVAL '30 minutes';
        
        GET DIAGNOSTICS v_cleaned_sessions = ROW_COUNT;
        
        -- Step 2: Update attendance logs for recently ended bulk code sessions
        UPDATE attendance_logs 
        SET 
            logout_time = s.ended_at,
            duration_minutes = EXTRACT(EPOCH FROM (s.ended_at - s.started_at)) / 60
        FROM sessions s
        JOIN access_codes ac ON s.code_id = ac.id
        WHERE attendance_logs.session_id = s.id
        AND attendance_logs.logout_time IS NULL
        AND s.ended_at IS NOT NULL
        AND s.ended_at > NOW() - INTERVAL '5 minutes'  -- Recently ended
        AND ac.type = 'bulk';
        
        -- Step 3: Decrement usage count for bulk codes with recently ended sessions
        FOR v_session_record IN 
            SELECT DISTINCT s.code_id, COUNT(*) as ended_sessions
            FROM sessions s
            JOIN access_codes ac ON s.code_id = ac.id
            WHERE s.is_active = false 
            AND s.ended_at > NOW() - INTERVAL '5 minutes'  -- Recently ended sessions
            AND ac.type = 'bulk'
            GROUP BY s.code_id
        LOOP
            -- Decrement usage count for each ended session
            FOR i IN 1..v_session_record.ended_sessions LOOP
                PERFORM decrement_bulk_code_usage(v_session_record.code_id);
            END LOOP;
            v_decremented_codes := v_decremented_codes + 1;
        END LOOP;
        
        -- Step 4: Find and deactivate expired bulk codes
        FOR v_code_record IN 
            SELECT id, code, name
            FROM access_codes 
            WHERE type = 'bulk'
            AND is_active = true
            AND expires_at IS NOT NULL
            AND expires_at < NOW()
        LOOP
            -- Deactivate the expired bulk code
            UPDATE access_codes 
            SET is_active = false
            WHERE id = v_code_record.id;
            
            v_deactivated_codes := v_deactivated_codes + 1;
            
            -- Terminate all active sessions for this expired bulk code
            UPDATE sessions 
            SET is_active = false, ended_at = NOW()
            WHERE code_id = v_code_record.id
            AND is_active = true;
            
            GET DIAGNOSTICS v_terminated_sessions = v_terminated_sessions + ROW_COUNT;
            
            -- Update attendance logs for terminated sessions
            UPDATE attendance_logs 
            SET 
                logout_time = NOW(),
                duration_minutes = EXTRACT(EPOCH FROM (NOW() - s.started_at)) / 60
            FROM sessions s
            WHERE attendance_logs.session_id = s.id
            AND s.code_id = v_code_record.id
            AND attendance_logs.logout_time IS NULL
            AND s.ended_at IS NOT NULL;
            
            -- Reset usage count to 0 for expired bulk codes
            UPDATE access_codes 
            SET usage_count = 0
            WHERE id = v_code_record.id;
            
        END LOOP;
        
        -- Return cleanup statistics
        RETURN QUERY SELECT v_cleaned_sessions, v_decremented_codes, v_deactivated_codes, v_terminated_sessions;
    END;
    $func$ LANGUAGE plpgsql SECURITY DEFINER;
  `

  // Function 2: cleanup_expired_bulk_codes
  const cleanupExpiredBulkCodesSQL = `
    CREATE OR REPLACE FUNCTION cleanup_expired_bulk_codes()
    RETURNS TABLE (
        deactivated_codes INTEGER,
        terminated_sessions INTEGER
    ) 
    SET search_path = public
    AS $func$
    DECLARE
        v_deactivated_codes INTEGER := 0;
        v_terminated_sessions INTEGER := 0;
        v_code_record RECORD;
    BEGIN
        -- Process each expired bulk code
        FOR v_code_record IN 
            SELECT id, code, name, usage_count
            FROM access_codes 
            WHERE type = 'bulk'
            AND is_active = true
            AND expires_at IS NOT NULL
            AND expires_at < NOW()
        LOOP
            -- Deactivate the expired bulk code
            UPDATE access_codes 
            SET is_active = false, usage_count = 0
            WHERE id = v_code_record.id;
            
            v_deactivated_codes := v_deactivated_codes + 1;
            
            -- Terminate all active sessions for this expired bulk code
            WITH terminated AS (
                UPDATE sessions 
                SET is_active = false, ended_at = NOW()
                WHERE code_id = v_code_record.id
                AND is_active = true
                RETURNING id, started_at
            )
            SELECT COUNT(*) INTO v_terminated_sessions 
            FROM terminated;
            
            -- Update attendance logs for terminated sessions
            UPDATE attendance_logs 
            SET 
                logout_time = NOW(),
                duration_minutes = EXTRACT(EPOCH FROM (NOW() - s.started_at)) / 60
            FROM sessions s
            WHERE attendance_logs.session_id = s.id
            AND s.code_id = v_code_record.id
            AND attendance_logs.logout_time IS NULL
            AND s.ended_at IS NOT NULL;
            
        END LOOP;
        
        -- Return cleanup statistics
        RETURN QUERY SELECT v_deactivated_codes, v_terminated_sessions;
    END;
    $func$ LANGUAGE plpgsql SECURITY DEFINER;
  `

  // Function 3: cleanup_all_sessions
  const cleanupAllSessionsSQL = `
    CREATE OR REPLACE FUNCTION cleanup_all_sessions()
    RETURNS TABLE (
        regular_sessions_cleaned INTEGER,
        bulk_sessions_cleaned INTEGER,
        bulk_codes_decremented INTEGER,
        bulk_codes_deactivated INTEGER,
        bulk_sessions_terminated INTEGER
    ) 
    SET search_path = public
    AS $func$
    DECLARE
        v_regular_cleaned INTEGER;
        v_bulk_result RECORD;
    BEGIN
        -- Clean up regular (non-bulk) sessions using existing logic
        SELECT cleanup_inactive_sessions() INTO v_regular_cleaned;
        
        -- Clean up bulk code sessions with enhanced logic
        SELECT * INTO v_bulk_result FROM cleanup_bulk_code_sessions();
        
        -- Return comprehensive statistics
        RETURN QUERY SELECT 
            v_regular_cleaned,
            v_bulk_result.cleaned_sessions,
            v_bulk_result.decremented_codes,
            v_bulk_result.deactivated_codes,
            v_bulk_result.terminated_sessions;
    END;
    $func$ LANGUAGE plpgsql SECURITY DEFINER;
  `

  // Create monitoring view
  const monitoringViewSQL = `
    CREATE OR REPLACE VIEW cleanup_monitoring 
    WITH (security_invoker = true) AS
    SELECT 
        'bulk_codes' as cleanup_type,
        COUNT(*) as total_codes,
        COUNT(*) FILTER (WHERE is_active = true) as active_codes,
        COUNT(*) FILTER (WHERE is_active = true AND expires_at < NOW()) as expired_active_codes,
        SUM(usage_count) FILTER (WHERE is_active = true) as total_active_usage,
        AVG(usage_count::float / NULLIF(max_usage_count, 0) * 100) FILTER (WHERE is_active = true) as avg_capacity_percentage
    FROM access_codes 
    WHERE type = 'bulk'
    UNION ALL
    SELECT 
        'bulk_sessions' as cleanup_type,
        COUNT(*) as total_sessions,
        COUNT(*) FILTER (WHERE is_active = true) as active_sessions,
        COUNT(*) FILTER (WHERE is_active = true AND last_activity < NOW() - INTERVAL '30 minutes') as inactive_sessions,
        0 as total_usage,
        0 as avg_capacity
    FROM sessions s
    JOIN access_codes ac ON s.code_id = ac.id
    WHERE ac.type = 'bulk';
  `

  try {
    // Execute each function creation
    console.log('📝 Creating cleanup_bulk_code_sessions function...')
    const { error: error1 } = await supabase.rpc('exec_sql', { sql: cleanupBulkCodeSessionsSQL })
    if (error1) console.error('Error creating cleanup_bulk_code_sessions:', error1)
    else console.log('✅ cleanup_bulk_code_sessions created')

    console.log('📝 Creating cleanup_expired_bulk_codes function...')
    const { error: error2 } = await supabase.rpc('exec_sql', { sql: cleanupExpiredBulkCodesSQL })
    if (error2) console.error('Error creating cleanup_expired_bulk_codes:', error2)
    else console.log('✅ cleanup_expired_bulk_codes created')

    console.log('📝 Creating cleanup_all_sessions function...')
    const { error: error3 } = await supabase.rpc('exec_sql', { sql: cleanupAllSessionsSQL })
    if (error3) console.error('Error creating cleanup_all_sessions:', error3)
    else console.log('✅ cleanup_all_sessions created')

    console.log('📝 Creating cleanup_monitoring view...')
    const { error: error4 } = await supabase.rpc('exec_sql', { sql: monitoringViewSQL })
    if (error4) console.error('Error creating cleanup_monitoring view:', error4)
    else console.log('✅ cleanup_monitoring view created')

    // Grant permissions
    const permissionsSQL = `
      GRANT EXECUTE ON FUNCTION cleanup_bulk_code_sessions TO service_role;
      GRANT EXECUTE ON FUNCTION cleanup_all_sessions TO service_role;
      GRANT EXECUTE ON FUNCTION cleanup_expired_bulk_codes TO service_role;
      GRANT SELECT ON cleanup_monitoring TO authenticated, service_role;
    `

    console.log('📝 Granting permissions...')
    const { error: permError } = await supabase.rpc('exec_sql', { sql: permissionsSQL })
    if (permError) console.error('Error granting permissions:', permError)
    else console.log('✅ Permissions granted')

    // Test the functions
    console.log('🧪 Testing functions...')
    
    const { data: testResult, error: testError } = await supabase.rpc('cleanup_all_sessions')
    if (testError) {
      console.error('❌ Function test failed:', testError)
    } else {
      console.log('✅ Function test successful:', testResult)
    }

    const { data: monitoringTest, error: monitoringError } = await supabase
      .from('cleanup_monitoring')
      .select('*')
      .limit(5)

    if (monitoringError) {
      console.error('❌ Monitoring view test failed:', monitoringError)
    } else {
      console.log('✅ Monitoring view test successful')
    }

    console.log('🎉 All cleanup functions created successfully!')

  } catch (error) {
    console.error('💥 Error creating functions:', error)
    process.exit(1)
  }
}

createCleanupFunctions()
  .then(() => {
    console.log('✨ Done!')
    process.exit(0)
  })
  .catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })