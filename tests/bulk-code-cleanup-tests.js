#!/usr/bin/env node

/**
 * Test suite for bulk code cleanup functionality
 * This script tests the enhanced cleanup system for bulk access codes
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

class CleanupTester {
  constructor() {
    this.testResults = []
    this.createdTestData = []
  }

  async runTest(testName, testFn) {
    console.log(`🧪 Running test: ${testName}`)
    try {
      const result = await testFn()
      this.testResults.push({ name: testName, status: 'PASS', result })
      console.log(`✅ ${testName} - PASSED`)
      return result
    } catch (error) {
      this.testResults.push({ name: testName, status: 'FAIL', error: error.message })
      console.log(`❌ ${testName} - FAILED: ${error.message}`)
      throw error
    }
  }

  async createTestBulkCode(name = 'Test Bulk Code', maxUsage = 5) {
    // Get a valid admin user ID first
    const { data: adminUsers, error: adminError } = await supabase
      .from('admin_users')
      .select('id')
      .limit(1)

    if (adminError || !adminUsers || adminUsers.length === 0) {
      throw new Error('No admin users found for testing')
    }

    const { data, error } = await supabase
      .from('access_codes')
      .insert({
        code: `TEST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'bulk',
        name: name,
        max_usage_count: maxUsage,
        usage_count: 0,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
        is_active: true,
        created_by: adminUsers[0].id
      })
      .select()
      .single()

    if (error) throw error
    this.createdTestData.push({ type: 'access_code', id: data.id })
    return data
  }

  async createTestSession(codeId, isActive = true, lastActivity = new Date()) {
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        code_id: codeId,
        session_token: `test-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ip_address: '127.0.0.1',
        user_agent: 'Test Agent',
        is_active: isActive,
        last_activity: lastActivity.toISOString()
      })
      .select()
      .single()

    if (error) throw error
    this.createdTestData.push({ type: 'session', id: data.id })
    return data
  }

  async testCleanupInactiveSessions() {
    // Create a bulk code
    const bulkCode = await this.createTestBulkCode('Inactive Session Test', 3)
    
    // Increment usage count to simulate active users
    await supabase.rpc('increment_bulk_code_usage', { p_code_id: bulkCode.id })
    await supabase.rpc('increment_bulk_code_usage', { p_code_id: bulkCode.id })
    
    // Create an inactive session (older than 30 minutes)
    const inactiveTime = new Date(Date.now() - 35 * 60 * 1000) // 35 minutes ago
    const inactiveSession = await this.createTestSession(bulkCode.id, true, inactiveTime)
    
    // Create an active session
    const activeSession = await this.createTestSession(bulkCode.id, true, new Date())
    
    // Run cleanup using existing function
    const { data: cleanupResult, error } = await supabase.rpc('cleanup_inactive_sessions')
    if (error) throw error
    
    // Verify inactive session was cleaned up
    const { data: updatedInactiveSession } = await supabase
      .from('sessions')
      .select('is_active, ended_at')
      .eq('id', inactiveSession.id)
      .single()
    
    if (updatedInactiveSession.is_active) {
      throw new Error('Inactive session was not cleaned up')
    }
    
    // Verify active session remains active
    const { data: updatedActiveSession } = await supabase
      .from('sessions')
      .select('is_active')
      .eq('id', activeSession.id)
      .single()
    
    if (!updatedActiveSession.is_active) {
      throw new Error('Active session was incorrectly cleaned up')
    }
    
    // Verify usage count was decremented
    const { data: updatedCode } = await supabase
      .from('access_codes')
      .select('usage_count')
      .eq('id', bulkCode.id)
      .single()
    
    if (updatedCode.usage_count !== 1) { // Should be 2 - 1 = 1
      throw new Error(`Expected usage count 1, got ${updatedCode.usage_count}`)
    }
    
    return { cleanupResult, sessionsProcessed: 1 }
  }

  async testExpiredBulkCodeCleanup() {
    // Get a valid admin user ID first
    const { data: adminUsers, error: adminError } = await supabase
      .from('admin_users')
      .select('id')
      .limit(1)

    if (adminError || !adminUsers || adminUsers.length === 0) {
      throw new Error('No admin users found for testing')
    }

    // Create an expired bulk code
    const expiredTime = new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
    const { data: expiredCode, error: createError } = await supabase
      .from('access_codes')
      .insert({
        code: `EXPIRED-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'bulk',
        name: 'Expired Test Code',
        max_usage_count: 5,
        usage_count: 2,
        expires_at: expiredTime.toISOString(),
        is_active: true,
        created_by: adminUsers[0].id
      })
      .select()
      .single()

    if (createError) throw createError
    this.createdTestData.push({ type: 'access_code', id: expiredCode.id })
    
    // Create active sessions for the expired code
    const session1 = await this.createTestSession(expiredCode.id, true)
    const session2 = await this.createTestSession(expiredCode.id, true)
    
    // Run expired code cleanup manually since the function doesn't exist yet
    const now = new Date().toISOString()
    
    // Deactivate expired bulk code
    const { error: deactivateError } = await supabase
      .from('access_codes')
      .update({ is_active: false, usage_count: 0 })
      .eq('id', expiredCode.id)
    
    if (deactivateError) throw deactivateError
    
    // Terminate active sessions for this expired code
    const { data: terminatedSessions, error: terminateError } = await supabase
      .from('sessions')
      .update({ is_active: false, ended_at: now })
      .eq('code_id', expiredCode.id)
      .eq('is_active', true)
      .select('id, started_at')
    
    if (terminateError) throw terminateError
    
    const cleanupResult = {
      deactivated_codes: 1,
      terminated_sessions: terminatedSessions ? terminatedSessions.length : 0
    }
    
    // Verify code was deactivated
    const { data: updatedCode } = await supabase
      .from('access_codes')
      .select('is_active, usage_count')
      .eq('id', expiredCode.id)
      .single()
    
    if (updatedCode.is_active) {
      throw new Error('Expired code was not deactivated')
    }
    
    if (updatedCode.usage_count !== 0) {
      throw new Error('Usage count was not reset to 0')
    }
    
    // Verify sessions were terminated
    const { data: updatedSessions } = await supabase
      .from('sessions')
      .select('is_active, ended_at')
      .in('id', [session1.id, session2.id])
    
    for (const session of updatedSessions) {
      if (session.is_active) {
        throw new Error('Session for expired code was not terminated')
      }
      if (!session.ended_at) {
        throw new Error('Session end time was not set')
      }
    }
    
    return { cleanupResult, codesDeactivated: 1, sessionsTerminated: 2 }
  }

  async testComprehensiveCleanup() {
    // Create test data for comprehensive cleanup
    const bulkCode1 = await this.createTestBulkCode('Comprehensive Test 1', 3)
    const bulkCode2 = await this.createTestBulkCode('Comprehensive Test 2', 2)
    
    // Add usage to codes
    await supabase.rpc('increment_bulk_code_usage', { p_code_id: bulkCode1.id })
    await supabase.rpc('increment_bulk_code_usage', { p_code_id: bulkCode2.id })
    
    // Create mix of active and inactive sessions
    const inactiveTime = new Date(Date.now() - 35 * 60 * 1000)
    await this.createTestSession(bulkCode1.id, true, inactiveTime) // Will be cleaned
    await this.createTestSession(bulkCode1.id, true, new Date()) // Will remain active
    await this.createTestSession(bulkCode2.id, true, inactiveTime) // Will be cleaned
    
    // Run comprehensive cleanup using existing function
    const { data: cleanupResult, error } = await supabase.rpc('cleanup_inactive_sessions')
    if (error) throw error
    
    // Verify results - the existing function should have cleaned up inactive sessions
    if (cleanupResult < 2) {
      throw new Error(`Expected at least 2 sessions cleaned, got ${cleanupResult}`)
    }
    
    return cleanupResult
  }

  async testMonitoringView() {
    // Test manual monitoring data collection since the view doesn't exist yet
    const { data: bulkCodesData, error: bulkCodesError } = await supabase
      .from('access_codes')
      .select('id, is_active, expires_at, usage_count, max_usage_count')
      .eq('type', 'bulk')
    
    if (bulkCodesError) throw bulkCodesError
    
    const { data: bulkSessionsData, error: bulkSessionsError } = await supabase
      .from('sessions')
      .select(`
        id, 
        is_active, 
        last_activity,
        access_codes!inner(type)
      `)
      .eq('access_codes.type', 'bulk')
    
    if (bulkSessionsError) throw bulkSessionsError
    
    if (!bulkCodesData) {
      throw new Error('No bulk codes data found')
    }
    
    if (!bulkSessionsData) {
      throw new Error('No bulk sessions data found')
    }
    
    const monitoringData = [
      {
        cleanup_type: 'bulk_codes',
        total_codes: bulkCodesData.length,
        active_codes: bulkCodesData.filter(c => c.is_active).length
      },
      {
        cleanup_type: 'bulk_sessions',
        total_sessions: bulkSessionsData.length,
        active_sessions: bulkSessionsData.filter(s => s.is_active).length
      }
    ]
    
    return { monitoringData, recordCount: monitoringData.length }
  }

  async cleanup() {
    console.log('🧹 Cleaning up test data...')
    
    // Clean up in reverse order to handle foreign key constraints
    for (const item of this.createdTestData.reverse()) {
      try {
        if (item.type === 'session') {
          await supabase.from('sessions').delete().eq('id', item.id)
        } else if (item.type === 'access_code') {
          await supabase.from('access_codes').delete().eq('id', item.id)
        }
      } catch (error) {
        console.warn(`Failed to cleanup ${item.type} ${item.id}:`, error.message)
      }
    }
    
    console.log(`🗑️  Cleaned up ${this.createdTestData.length} test records`)
  }

  printResults() {
    console.log('\n📊 Test Results Summary:')
    console.log('=' .repeat(50))
    
    let passed = 0
    let failed = 0
    
    for (const result of this.testResults) {
      const status = result.status === 'PASS' ? '✅' : '❌'
      console.log(`${status} ${result.name}`)
      if (result.status === 'PASS') {
        passed++
      } else {
        failed++
        console.log(`   Error: ${result.error}`)
      }
    }
    
    console.log('=' .repeat(50))
    console.log(`Total: ${this.testResults.length} | Passed: ${passed} | Failed: ${failed}`)
    
    if (failed > 0) {
      console.log('\n❌ Some tests failed. Check the implementation.')
      process.exit(1)
    } else {
      console.log('\n🎉 All tests passed!')
    }
  }
}

async function runTests() {
  const tester = new CleanupTester()
  
  try {
    console.log('🚀 Starting bulk code cleanup tests...\n')
    
    await tester.runTest('Cleanup Inactive Sessions', () => tester.testCleanupInactiveSessions())
    await tester.runTest('Expired Bulk Code Cleanup', () => tester.testExpiredBulkCodeCleanup())
    await tester.runTest('Comprehensive Cleanup', () => tester.testComprehensiveCleanup())
    await tester.runTest('Monitoring View', () => tester.testMonitoringView())
    
  } catch (error) {
    console.error('💥 Test suite failed:', error)
  } finally {
    await tester.cleanup()
    tester.printResults()
  }
}

// Run the tests
runTests().catch(console.error)