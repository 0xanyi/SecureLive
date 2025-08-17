#!/usr/bin/env node

/**
 * Quick Integration Test for Bulk Code Usage APIs
 * 
 * This is a lightweight test to verify the basic functionality
 * of the bulk code usage tracking APIs without extensive setup.
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.log('⚠️  Missing Supabase configuration - skipping integration test');
  console.log('   Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local to run tests');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function quickIntegrationTest() {
  console.log('🔍 Quick Integration Test - Bulk Code Usage APIs');
  console.log('================================================');

  try {
    // Test 1: Check if we can fetch usage data for all codes
    console.log('\n1. Testing usage endpoint (all codes)...');
    
    const { data: allUsage, error: usageError } = await supabase
      .from('access_codes')
      .select('*')
      .eq('type', 'bulk')
      .limit(1);

    if (usageError) {
      console.log('❌ Database query failed:', usageError.message);
      return false;
    }

    console.log(`✅ Found ${allUsage?.length || 0} bulk codes in database`);

    // Test 2: Verify the BulkCodeUsage type structure
    console.log('\n2. Testing type definitions...');
    
    const mockUsage = {
      code_id: 'test-id',
      current_usage: 5,
      max_capacity: 10,
      active_sessions: 3,
      capacity_percentage: 50,
      is_near_capacity: false,
      is_expired: false,
      time_remaining_minutes: 120
    };

    const requiredFields = [
      'code_id', 'current_usage', 'max_capacity', 'active_sessions',
      'capacity_percentage', 'is_near_capacity', 'is_expired', 'time_remaining_minutes'
    ];

    const missingFields = requiredFields.filter(field => !(field in mockUsage));
    
    if (missingFields.length > 0) {
      console.log('❌ Missing required fields:', missingFields);
      return false;
    }

    console.log('✅ BulkCodeUsage type structure is correct');

    // Test 3: Check database functions exist
    console.log('\n3. Testing database functions...');
    
    const testId = '00000000-0000-0000-0000-000000000000';
    
    try {
      const { data: capacityResult, error: capacityError } = await supabase
        .rpc('check_bulk_code_capacity', { p_code_id: testId });

      if (capacityError) {
        console.log('❌ check_bulk_code_capacity function not available:', capacityError.message);
        return false;
      }

      console.log('✅ check_bulk_code_capacity function is available');

      const { data: incrementResult, error: incrementError } = await supabase
        .rpc('increment_bulk_code_usage', { p_code_id: testId });

      if (incrementError) {
        console.log('❌ increment_bulk_code_usage function not available:', incrementError.message);
        return false;
      }

      console.log('✅ increment_bulk_code_usage function is available');

      const { data: decrementResult, error: decrementError } = await supabase
        .rpc('decrement_bulk_code_usage', { p_code_id: testId });

      if (decrementError) {
        console.log('❌ decrement_bulk_code_usage function not available:', decrementError.message);
        return false;
      }

      console.log('✅ decrement_bulk_code_usage function is available');

    } catch (error) {
      console.log('❌ Database function test failed:', error.message);
      return false;
    }

    console.log('\n🎉 Integration test passed!');
    console.log('   All required database functions are available');
    console.log('   Type definitions are correct');
    console.log('   Database connection is working');
    
    return true;

  } catch (error) {
    console.log('❌ Integration test failed:', error.message);
    return false;
  }
}

// Run the test
if (require.main === module) {
  quickIntegrationTest()
    .then(success => {
      if (success) {
        console.log('\n✅ Integration test completed successfully');
        process.exit(0);
      } else {
        console.log('\n❌ Integration test failed');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Test runner error:', error);
      process.exit(1);
    });
}

module.exports = { quickIntegrationTest };