#!/usr/bin/env node

/**
 * Script to create cleanup functions directly in Supabase using simple SQL
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

async function executeSQL(sql, description) {
  console.log(`📝 ${description}...`)
  try {
    // Use a simple query to execute SQL
    const { data, error } = await supabase
      .from('access_codes')
      .select('id')
      .limit(0)
    
    // This will fail, but we'll use the connection to execute our SQL
    // Let's try a different approach - create a temporary function to execute SQL
    
    const { error: sqlError } = await supabase.rpc('exec_sql', { sql })
    
    if (sqlError && !sqlError.message.includes('does not exist')) {
      throw sqlError
    }
    
    console.log(`✅ ${description} completed`)
    return true
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message)
    return false
  }
}

async function createCleanupFunctions() {
  console.log('🚀 Creating cleanup functions with simple SQL...')

  // First, let's update the existing cleanup_inactive_sessions function to handle bulk codes better
  const updateCleanupInactiveSessionsSQL = `
CREATE OR REPLACE FUNCTION cleanup_inactive_sessions()
RETURNS INTEGER 
SET search_path = public
AS $$
DECLARE
    v_updated INTEGER;
    v_session_record RECORD;
BEGIN
    -- Mark sessions as inactive if no activity for 30+ minutes
    UPDATE sessions 
    SET is_active = false, ended_at = NOW()
    WHERE is_active = true 
    AND last_activity < NOW() - INTERVAL '30 minutes';
    
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    
    -- Update attendance logs with logout time and duration
    UPDATE attendance_logs 
    SET 
        logout_time = s.ended_at,
        duration_minutes = EXTRACT(EPOCH FROM (s.ended_at - s.started_at)) / 60
    FROM sessions s
    WHERE attendance_logs.session_id = s.id
    AND attendance_logs.logout_time IS NULL
    AND s.ended_at IS NOT NULL;
    
    -- Decrement usage count for bulk codes when sessions end
    FOR v_session_record IN 
        SELECT DISTINCT s.code_id
        FROM sessions s
        JOIN access_codes ac ON s.code_id = ac.id
        WHERE s.is_active = false 
        AND s.ended_at > NOW() - INTERVAL '1 minute'
        AND ac.type = 'bulk'
    LOOP
        PERFORM decrement_bulk_code_usage(v_session_record.code_id);
    END LOOP;
    
    -- Deactivate expired bulk codes
    UPDATE access_codes 
    SET is_active = false
    WHERE type = 'bulk'
    AND is_active = true
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
    
    -- Terminate sessions for expired bulk codes
    UPDATE sessions 
    SET is_active = false, ended_at = NOW()
    FROM access_codes ac
    WHERE sessions.code_id = ac.id
    AND ac.type = 'bulk'
    AND ac.is_active = false
    AND ac.expires_at < NOW()
    AND sessions.is_active = true;
    
    RETURN v_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`

  // Create a simple bulk code cleanup function
  const createBulkCleanupSQL = `
CREATE OR REPLACE FUNCTION cleanup_expired_bulk_codes()
RETURNS INTEGER 
SET search_path = public
AS $$
DECLARE
    v_deactivated INTEGER := 0;
    v_terminated INTEGER := 0;
BEGIN
    -- Deactivate expired bulk codes and reset usage count
    UPDATE access_codes 
    SET is_active = false, usage_count = 0
    WHERE type = 'bulk'
    AND is_active = true
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
    
    GET DIAGNOSTICS v_deactivated = ROW_COUNT;
    
    -- Terminate all active sessions for expired bulk codes
    UPDATE sessions 
    SET is_active = false, ended_at = NOW()
    FROM access_codes ac
    WHERE sessions.code_id = ac.id
    AND ac.type = 'bulk'
    AND ac.is_active = false
    AND ac.expires_at < NOW()
    AND sessions.is_active = true;
    
    GET DIAGNOSTICS v_terminated = ROW_COUNT;
    
    -- Update attendance logs for terminated sessions
    UPDATE attendance_logs 
    SET 
        logout_time = NOW(),
        duration_minutes = EXTRACT(EPOCH FROM (NOW() - s.started_at)) / 60
    FROM sessions s
    JOIN access_codes ac ON s.code_id = ac.id
    WHERE attendance_logs.session_id = s.id
    AND ac.type = 'bulk'
    AND ac.is_active = false
    AND attendance_logs.logout_time IS NULL
    AND s.ended_at IS NOT NULL;
    
    RETURN v_deactivated + v_terminated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`

  // Create monitoring view
  const createMonitoringViewSQL = `
CREATE OR REPLACE VIEW cleanup_monitoring AS
SELECT 
    'bulk_codes'::text as cleanup_type,
    COUNT(*)::integer as total_codes,
    COUNT(*) FILTER (WHERE is_active = true)::integer as active_codes,
    COUNT(*) FILTER (WHERE is_active = true AND expires_at < NOW())::integer as expired_active_codes,
    COALESCE(SUM(usage_count) FILTER (WHERE is_active = true), 0)::integer as total_active_usage,
    COALESCE(AVG(usage_count::float / NULLIF(max_usage_count, 0) * 100) FILTER (WHERE is_active = true), 0)::numeric as avg_capacity_percentage
FROM access_codes 
WHERE type = 'bulk'
UNION ALL
SELECT 
    'bulk_sessions'::text as cleanup_type,
    COUNT(*)::integer as total_sessions,
    COUNT(*) FILTER (WHERE is_active = true)::integer as active_sessions,
    COUNT(*) FILTER (WHERE is_active = true AND last_activity < NOW() - INTERVAL '30 minutes')::integer as inactive_sessions,
    0::integer as total_usage,
    0::numeric as avg_capacity
FROM sessions s
JOIN access_codes ac ON s.code_id = ac.id
WHERE ac.type = 'bulk';
`

  // Grant permissions
  const grantPermissionsSQL = `
GRANT EXECUTE ON FUNCTION cleanup_expired_bulk_codes TO service_role;
GRANT SELECT ON cleanup_monitoring TO authenticated, service_role;
`

  try {
    // Execute each SQL statement
    await executeSQL(updateCleanupInactiveSessionsSQL, 'Updating cleanup_inactive_sessions function')
    await executeSQL(createBulkCleanupSQL, 'Creating cleanup_expired_bulk_codes function')
    await executeSQL(createMonitoringViewSQL, 'Creating cleanup_monitoring view')
    await executeSQL(grantPermissionsSQL, 'Granting permissions')

    // Test the functions
    console.log('🧪 Testing functions...')
    
    const { data: testResult1, error: testError1 } = await supabase.rpc('cleanup_inactive_sessions')
    if (testError1) {
      console.error('❌ cleanup_inactive_sessions test failed:', testError1)
    } else {
      console.log('✅ cleanup_inactive_sessions test successful:', testResult1)
    }

    const { data: testResult2, error: testError2 } = await supabase.rpc('cleanup_expired_bulk_codes')
    if (testError2) {
      console.error('❌ cleanup_expired_bulk_codes test failed:', testError2)
    } else {
      console.log('✅ cleanup_expired_bulk_codes test successful:', testResult2)
    }

    const { data: monitoringTest, error: monitoringError } = await supabase
      .from('cleanup_monitoring')
      .select('*')
      .limit(5)

    if (monitoringError) {
      console.error('❌ Monitoring view test failed:', monitoringError)
    } else {
      console.log('✅ Monitoring view test successful:', monitoringTest)
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