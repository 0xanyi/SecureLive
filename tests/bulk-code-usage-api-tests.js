#!/usr/bin/env node

/**
 * Bulk Code Usage API Tests
 * 
 * Tests the bulk code usage tracking and monitoring APIs:
 * - /api/admin/bulk-codes/usage
 * - /api/admin/bulk-codes/status  
 * - /api/admin/bulk-codes/cleanup
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test configuration
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api/admin/bulk-codes`;

// Helper function to make API requests
async function apiRequest(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    const data = await response.json();
    return { response, data };
  } catch (error) {
    console.error(`API request failed for ${url}:`, error);
    throw error;
  }
}

// Test data setup
let testBulkCode = null;
let testSession = null;

async function setupTestData() {
  console.log('\n🔧 Setting up test data...');
  
  try {
    // Create a test bulk code
    const { data: bulkCode, error: codeError } = await supabase
      .from('access_codes')
      .insert({
        code: 'TEST-BULK-' + Date.now(),
        type: 'bulk',
        name: 'Test Bulk Code for API Tests',
        max_concurrent_sessions: 1,
        usage_count: 2,
        max_usage_count: 5,
        is_active: true,
        expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
        created_by: '00000000-0000-0000-0000-000000000000'
      })
      .select()
      .single();

    if (codeError) {
      throw new Error(`Failed to create test bulk code: ${codeError.message}`);
    }

    testBulkCode = bulkCode;
    console.log('✅ Created test bulk code:', testBulkCode.code);

    // Create a test session for the bulk code
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        code_id: testBulkCode.id,
        session_token: 'test-session-' + Date.now(),
        ip_address: '127.0.0.1',
        user_agent: 'Test Agent',
        started_at: new Date().toISOString(),
        last_activity: new Date().toISOString(),
        is_active: true
      })
      .select()
      .single();

    if (sessionError) {
      throw new Error(`Failed to create test session: ${sessionError.message}`);
    }

    testSession = session;
    console.log('✅ Created test session for bulk code');

  } catch (error) {
    console.error('❌ Failed to setup test data:', error);
    throw error;
  }
}

async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test data...');
  
  try {
    if (testSession) {
      await supabase
        .from('sessions')
        .delete()
        .eq('id', testSession.id);
      console.log('✅ Deleted test session');
    }

    if (testBulkCode) {
      await supabase
        .from('access_codes')
        .delete()
        .eq('id', testBulkCode.id);
      console.log('✅ Deleted test bulk code');
    }
  } catch (error) {
    console.error('❌ Failed to cleanup test data:', error);
  }
}

// Test functions
async function testUsageEndpointSingleCode() {
  console.log('\n📊 Testing usage endpoint for single code...');
  
  try {
    const { response, data } = await apiRequest(`/usage?codeId=${testBulkCode.id}`);
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!data.success) {
      throw new Error(`API returned error: ${data.error}`);
    }

    const usage = data.data;
    
    // Validate response structure
    const requiredFields = [
      'code_id', 'current_usage', 'max_capacity', 'active_sessions',
      'capacity_percentage', 'is_near_capacity', 'is_expired', 'time_remaining_minutes'
    ];
    
    for (const field of requiredFields) {
      if (!(field in usage)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate data values
    if (usage.code_id !== testBulkCode.id) {
      throw new Error(`Expected code_id ${testBulkCode.id}, got ${usage.code_id}`);
    }

    if (usage.current_usage !== 2) {
      throw new Error(`Expected current_usage 2, got ${usage.current_usage}`);
    }

    if (usage.max_capacity !== 5) {
      throw new Error(`Expected max_capacity 5, got ${usage.max_capacity}`);
    }

    if (usage.capacity_percentage !== 40) {
      throw new Error(`Expected capacity_percentage 40, got ${usage.capacity_percentage}`);
    }

    if (usage.is_near_capacity !== false) {
      throw new Error(`Expected is_near_capacity false, got ${usage.is_near_capacity}`);
    }

    if (usage.is_expired !== false) {
      throw new Error(`Expected is_expired false, got ${usage.is_expired}`);
    }

    console.log('✅ Single code usage endpoint test passed');
    console.log(`   Usage: ${usage.current_usage}/${usage.max_capacity} (${usage.capacity_percentage}%)`);
    console.log(`   Active sessions: ${usage.active_sessions}`);
    console.log(`   Time remaining: ${usage.time_remaining_minutes} minutes`);

  } catch (error) {
    console.error('❌ Single code usage endpoint test failed:', error.message);
    throw error;
  }
}

async function testUsageEndpointAllCodes() {
  console.log('\n📊 Testing usage endpoint for all codes...');
  
  try {
    const { response, data } = await apiRequest('/usage');
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!data.success) {
      throw new Error(`API returned error: ${data.error}`);
    }

    const usageArray = data.data;
    
    if (!Array.isArray(usageArray)) {
      throw new Error('Expected data to be an array');
    }

    // Find our test code in the results
    const testCodeUsage = usageArray.find(usage => usage.code_id === testBulkCode.id);
    
    if (!testCodeUsage) {
      throw new Error('Test bulk code not found in results');
    }

    console.log('✅ All codes usage endpoint test passed');
    console.log(`   Found ${usageArray.length} bulk codes`);
    console.log(`   Test code usage: ${testCodeUsage.current_usage}/${testCodeUsage.max_capacity}`);

  } catch (error) {
    console.error('❌ All codes usage endpoint test failed:', error.message);
    throw error;
  }
}

async function testStatusEndpointSingleCode() {
  console.log('\n📈 Testing status endpoint for single code...');
  
  try {
    const { response, data } = await apiRequest(`/status?codeId=${testBulkCode.id}`);
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!data.success) {
      throw new Error(`API returned error: ${data.error}`);
    }

    const status = data.data;
    
    // Validate response structure
    const requiredFields = [
      'id', 'code', 'type', 'name', 'usage_count', 'max_usage_count',
      'active_sessions', 'capacity_percentage', 'remaining_capacity',
      'is_near_capacity', 'is_expired', 'time_remaining_hours',
      'time_remaining_minutes', 'status'
    ];
    
    for (const field of requiredFields) {
      if (!(field in status)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate data values
    if (status.type !== 'bulk') {
      throw new Error(`Expected type 'bulk', got ${status.type}`);
    }

    if (status.usage_count !== 2) {
      throw new Error(`Expected usage_count 2, got ${status.usage_count}`);
    }

    if (status.remaining_capacity !== 3) {
      throw new Error(`Expected remaining_capacity 3, got ${status.remaining_capacity}`);
    }

    if (status.status !== 'active') {
      throw new Error(`Expected status 'active', got ${status.status}`);
    }

    console.log('✅ Single code status endpoint test passed');
    console.log(`   Status: ${status.status}`);
    console.log(`   Capacity: ${status.usage_count}/${status.max_usage_count} (${status.capacity_percentage}%)`);
    console.log(`   Remaining: ${status.remaining_capacity}`);
    console.log(`   Time: ${status.time_remaining_hours}h ${status.time_remaining_minutes}m`);

  } catch (error) {
    console.error('❌ Single code status endpoint test failed:', error.message);
    throw error;
  }
}

async function testStatusEndpointAllCodes() {
  console.log('\n📈 Testing status endpoint for all codes...');
  
  try {
    const { response, data } = await apiRequest('/status');
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!data.success) {
      throw new Error(`API returned error: ${data.error}`);
    }

    const statusArray = data.data;
    
    if (!Array.isArray(statusArray)) {
      throw new Error('Expected data to be an array');
    }

    // Find our test code in the results
    const testCodeStatus = statusArray.find(status => status.id === testBulkCode.id);
    
    if (!testCodeStatus) {
      throw new Error('Test bulk code not found in results');
    }

    console.log('✅ All codes status endpoint test passed');
    console.log(`   Found ${statusArray.length} bulk codes`);
    console.log(`   Test code status: ${testCodeStatus.status}`);

  } catch (error) {
    console.error('❌ All codes status endpoint test failed:', error.message);
    throw error;
  }
}

async function testCleanupEndpoint() {
  console.log('\n🧹 Testing cleanup endpoint...');
  
  try {
    // First, make the test session inactive by setting old last_activity
    const oldTime = new Date(Date.now() - 45 * 60 * 1000).toISOString(); // 45 minutes ago
    
    await supabase
      .from('sessions')
      .update({ last_activity: oldTime })
      .eq('id', testSession.id);

    console.log('   Set test session to inactive state');

    const { response, data } = await apiRequest('/cleanup', { method: 'POST' });
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!data.success) {
      throw new Error(`API returned error: ${data.error}`);
    }

    const result = data.data;
    
    // Validate response structure
    const requiredFields = ['cleaned_sessions', 'decremented_codes', 'deactivated_expired_codes'];
    
    for (const field of requiredFields) {
      if (!(field in result)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    console.log('✅ Cleanup endpoint test passed');
    console.log(`   Cleaned sessions: ${result.cleaned_sessions}`);
    console.log(`   Decremented codes: ${result.decremented_codes.length}`);
    console.log(`   Deactivated expired codes: ${result.deactivated_expired_codes.length}`);

    // Verify the session was actually cleaned up
    const { data: updatedSession } = await supabase
      .from('sessions')
      .select('is_active, ended_at')
      .eq('id', testSession.id)
      .single();

    if (updatedSession && updatedSession.is_active) {
      throw new Error('Session should have been marked as inactive');
    }

    console.log('   ✅ Session was properly marked as inactive');

    // Verify the bulk code usage was decremented
    const { data: updatedCode } = await supabase
      .from('access_codes')
      .select('usage_count')
      .eq('id', testBulkCode.id)
      .single();

    if (updatedCode && updatedCode.usage_count !== 1) {
      throw new Error(`Expected usage_count to be decremented to 1, got ${updatedCode.usage_count}`);
    }

    console.log('   ✅ Bulk code usage was properly decremented');

  } catch (error) {
    console.error('❌ Cleanup endpoint test failed:', error.message);
    throw error;
  }
}

async function testErrorHandling() {
  console.log('\n🚫 Testing error handling...');
  
  try {
    // Test with non-existent code ID
    const fakeId = '00000000-0000-0000-0000-000000000000';
    
    const { response: usageResponse, data: usageData } = await apiRequest(`/usage?codeId=${fakeId}`);
    
    if (usageResponse.status !== 404) {
      throw new Error(`Expected status 404 for non-existent code, got ${usageResponse.status}`);
    }

    if (usageData.success !== false) {
      throw new Error('Expected success to be false for non-existent code');
    }

    console.log('✅ Error handling test passed');
    console.log('   Non-existent code properly returns 404');

  } catch (error) {
    console.error('❌ Error handling test failed:', error.message);
    throw error;
  }
}

// Main test runner
async function runTests() {
  console.log('🧪 Starting Bulk Code Usage API Tests');
  console.log('=====================================');

  let testsPassed = 0;
  let testsTotal = 0;

  try {
    await setupTestData();

    const tests = [
      testUsageEndpointSingleCode,
      testUsageEndpointAllCodes,
      testStatusEndpointSingleCode,
      testStatusEndpointAllCodes,
      testCleanupEndpoint,
      testErrorHandling
    ];

    for (const test of tests) {
      testsTotal++;
      try {
        await test();
        testsPassed++;
      } catch (error) {
        console.error(`Test failed: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Test setup failed:', error);
  } finally {
    await cleanupTestData();
  }

  console.log('\n📊 Test Results');
  console.log('================');
  console.log(`✅ Passed: ${testsPassed}/${testsTotal}`);
  console.log(`❌ Failed: ${testsTotal - testsPassed}/${testsTotal}`);

  if (testsPassed === testsTotal) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\n💥 Some tests failed!');
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runTests,
  setupTestData,
  cleanupTestData
};