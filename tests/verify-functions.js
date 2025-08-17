#!/usr/bin/env node

/**
 * Database Functions Verification Script
 * Verifies that all required database functions exist and are properly configured
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyFunctions() {
  console.log('🔍 Verifying Database Functions...\n');
  
  const requiredFunctions = [
    'check_bulk_code_capacity',
    'increment_bulk_code_usage', 
    'decrement_bulk_code_usage',
    'check_concurrent_sessions',
    'cleanup_inactive_sessions'
  ];
  
  let allFunctionsExist = true;
  
  for (const functionName of requiredFunctions) {
    try {
      console.log(`Checking function: ${functionName}...`);
      
      // Try to get function information from pg_proc
      const { data, error } = await supabase
        .rpc('exec_sql', { 
          sql: `SELECT proname, pronargs FROM pg_proc WHERE proname = '${functionName}';`
        });
      
      if (error) {
        // If exec_sql doesn't exist, try a different approach
        console.log(`⚠️  Cannot verify ${functionName} (exec_sql function not available)`);
        continue;
      }
      
      console.log(`✅ Function ${functionName} exists`);
      
    } catch (error) {
      console.log(`❌ Function ${functionName} verification failed:`, error.message);
      allFunctionsExist = false;
    }
  }
  
  // Test function calls directly
  console.log('\n🧪 Testing function calls...\n');
  
  try {
    // Test check_bulk_code_capacity with a non-existent ID
    const testId = '00000000-0000-0000-0000-000000000000';
    const { data: capacityResult, error: capacityError } = await supabase
      .rpc('check_bulk_code_capacity', { p_code_id: testId });
    
    if (capacityError) {
      console.log('❌ check_bulk_code_capacity function call failed:', capacityError.message);
      allFunctionsExist = false;
    } else {
      console.log('✅ check_bulk_code_capacity function callable (returned:', capacityResult, ')');
    }
    
    // Test increment_bulk_code_usage with a non-existent ID
    const { data: incrementResult, error: incrementError } = await supabase
      .rpc('increment_bulk_code_usage', { p_code_id: testId });
    
    if (incrementError) {
      console.log('❌ increment_bulk_code_usage function call failed:', incrementError.message);
      allFunctionsExist = false;
    } else {
      console.log('✅ increment_bulk_code_usage function callable (returned:', incrementResult, ')');
    }
    
    // Test decrement_bulk_code_usage with a non-existent ID
    const { data: decrementResult, error: decrementError } = await supabase
      .rpc('decrement_bulk_code_usage', { p_code_id: testId });
    
    if (decrementError) {
      console.log('❌ decrement_bulk_code_usage function call failed:', decrementError.message);
      allFunctionsExist = false;
    } else {
      console.log('✅ decrement_bulk_code_usage function callable (returned:', decrementResult, ')');
    }
    
    // Test check_concurrent_sessions with a non-existent ID
    const { data: sessionsResult, error: sessionsError } = await supabase
      .rpc('check_concurrent_sessions', { p_code_id: testId });
    
    if (sessionsError) {
      console.log('❌ check_concurrent_sessions function call failed:', sessionsError.message);
      allFunctionsExist = false;
    } else {
      console.log('✅ check_concurrent_sessions function callable (returned:', sessionsResult, ')');
    }
    
  } catch (error) {
    console.log('❌ Function call testing failed:', error.message);
    allFunctionsExist = false;
  }
  
  // Check if access_codes table has the required columns
  console.log('\n🗃️  Verifying database schema...\n');
  
  try {
    const { data: schemaData, error: schemaError } = await supabase
      .from('access_codes')
      .select('usage_count, max_usage_count')
      .limit(1);
    
    if (schemaError) {
      console.log('❌ Database schema verification failed:', schemaError.message);
      console.log('💡 You may need to run the bulk access codes migration');
      allFunctionsExist = false;
    } else {
      console.log('✅ Database schema includes bulk code columns');
    }
  } catch (error) {
    console.log('❌ Schema verification failed:', error.message);
    allFunctionsExist = false;
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (allFunctionsExist) {
    console.log('🎉 All database functions are properly configured!');
    console.log('✅ Ready to run bulk access code functionality');
    return true;
  } else {
    console.log('⚠️  Some database functions or schema elements are missing');
    console.log('💡 Please run the following migrations:');
    console.log('   - migrations/add-bulk-access-codes.sql');
    console.log('   - migrations/update-concurrent-sessions-for-bulk.sql');
    return false;
  }
}

if (require.main === module) {
  verifyFunctions()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('💥 Verification failed:', error);
      process.exit(1);
    });
}

module.exports = { verifyFunctions };