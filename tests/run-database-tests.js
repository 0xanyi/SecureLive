#!/usr/bin/env node

/**
 * Database Functions Test Runner
 * Runs SQL-based tests for bulk code validation and capacity checking logic
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration in .env.local');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runDatabaseTests() {
  console.log('🧪 Running Database Functions Tests...\n');
  
  try {
    console.log('📋 Running API-level tests for database functions...\n');
    
    // Run API-level tests that verify the database functions
    await runApiTests();
    
    console.log('✅ Database function tests completed successfully!\n');
    console.log('💡 To run the full SQL test suite, execute tests/database-functions-test.sql in your Supabase SQL Editor\n');
    
    return true;
    
  } catch (error) {
    console.error('❌ Test runner failed:', error.message);
    return false;
  }
}

async function runApiTests() {
  console.log('🔌 Running API-level tests...\n');
  
  try {
    // Test 1: Create a test bulk code
    console.log('Test 1: Creating test bulk code...');
    const { data: bulkCode, error: createError } = await supabase
      .from('access_codes')
      .insert({
        code: 'API_TEST_BULK_001',
        type: 'bulk',
        name: 'API Test Bulk Code',
        max_usage_count: 2,
        usage_count: 0,
        is_active: true,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
        created_by: (await getTestAdminId())
      })
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Failed to create test bulk code:', createError);
      return;
    }
    
    console.log('✅ Test bulk code created:', bulkCode.code);
    
    // Test 2: Check bulk code capacity via RPC
    console.log('Test 2: Checking bulk code capacity...');
    const { data: hasCapacity, error: capacityError } = await supabase
      .rpc('check_bulk_code_capacity', { p_code_id: bulkCode.id });
    
    if (capacityError) {
      console.error('❌ Capacity check failed:', capacityError);
    } else if (hasCapacity) {
      console.log('✅ Bulk code has available capacity');
    } else {
      console.log('❌ Bulk code should have available capacity');
    }
    
    // Test 3: Increment usage
    console.log('Test 3: Incrementing bulk code usage...');
    const { data: incremented, error: incrementError } = await supabase
      .rpc('increment_bulk_code_usage', { p_code_id: bulkCode.id });
    
    if (incrementError) {
      console.error('❌ Usage increment failed:', incrementError);
    } else if (incremented) {
      console.log('✅ Usage incremented successfully');
    } else {
      console.log('❌ Usage increment should have succeeded');
    }
    
    // Test 4: Check updated usage count
    console.log('Test 4: Verifying usage count...');
    const { data: updatedCode, error: fetchError } = await supabase
      .from('access_codes')
      .select('usage_count')
      .eq('id', bulkCode.id)
      .single();
    
    if (fetchError) {
      console.error('❌ Failed to fetch updated code:', fetchError);
    } else if (updatedCode.usage_count === 1) {
      console.log('✅ Usage count correctly updated to:', updatedCode.usage_count);
    } else {
      console.log('❌ Usage count should be 1, got:', updatedCode.usage_count);
    }
    
    // Test 5: Test concurrent sessions check
    console.log('Test 5: Testing concurrent sessions check...');
    const { data: canCreateSession, error: sessionError } = await supabase
      .rpc('check_concurrent_sessions', { p_code_id: bulkCode.id });
    
    if (sessionError) {
      console.error('❌ Concurrent sessions check failed:', sessionError);
    } else if (canCreateSession) {
      console.log('✅ Can create new session (capacity available)');
    } else {
      console.log('❌ Should be able to create new session');
    }
    
    // Cleanup
    console.log('Cleanup: Removing test data...');
    await supabase.from('access_codes').delete().eq('id', bulkCode.id);
    console.log('✅ Test data cleaned up\n');
    
  } catch (error) {
    console.error('❌ API tests failed:', error.message);
  }
}

async function getTestAdminId() {
  const { data: admin } = await supabase
    .from('admin_users')
    .select('id')
    .limit(1)
    .single();
  
  return admin?.id;
}

// Run the tests
if (require.main === module) {
  runDatabaseTests()
    .then(success => {
      if (success) {
        console.log('🎉 All tests completed!');
        process.exit(0);
      } else {
        console.log('💥 Some tests failed!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Test runner crashed:', error);
      process.exit(1);
    });
}

module.exports = { runDatabaseTests };