#!/usr/bin/env node

/**
 * API Integration tests for bulk code functionality
 * Tests the actual API endpoints for bulk code operations
 * 
 * This test suite makes HTTP requests to the actual API endpoints
 * to verify the complete integration works as expected.
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

class BulkCodeAPITester {
  constructor() {
    this.testResults = []
    this.createdTestData = []
    this.testStartTime = Date.now()
  }

  async runTest(testName, testFn) {
    console.log(`🧪 Running API test: ${testName}`)
    const startTime = Date.now()
    
    try {
      const result = await testFn()
      const duration = Date.now() - startTime
      this.testResults.push({ name: testName, status: 'PASS', result, duration })
      console.log(`✅ ${testName} - PASSED (${duration}ms)`)
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      this.testResults.push({ name: testName, status: 'FAIL', error: error.message, duration })
      console.log(`❌ ${testName} - FAILED: ${error.message} (${duration}ms)`)
      throw error
    }
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${baseUrl}${endpoint}`
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    }
    
    const response = await fetch(url, { ...defaultOptions, ...options })
    const data = await response.json()
    
    return {
      status: response.status,
      ok: response.ok,
      data
    }
  }

  async createTestAdmin() {
    const { data: existingAdmin } = await supabase
      .from('admin_users')
      .select('id')
      .eq('email', 'api-test-admin@example.com')
      .single()

    if (existingAdmin) {
      return existingAdmin
    }

    const { data: admin, error } = await supabase
      .from('admin_users')
      .insert({
        email: 'api-test-admin@example.com',
        name: 'API Test Administrator',
        password_hash: 'test_hash',
        role: 'admin',
        permissions: { canGenerateCodes: true }
      })
      .select()
      .single()

    if (error) throw error
    this.createdTestData.push({ type: 'admin_user', id: admin.id })
    return admin
  }

  // Test 1: Bulk code generation via API
  async testBulkCodeGenerationAPI() {
    const testCodes = [
      {
        code: `API-BULK-${Date.now()}-1`,
        type: 'bulk',
        name: 'API Test Bulk Code 1',
        max_usage_count: 5,
        max_concurrent_sessions: 1
      },
      {
        code: `API-BULK-${Date.now()}-2`,
        type: 'bulk',
        name: 'API Test Bulk Code 2',
        max_usage_count: 10,
        max_concurrent_sessions: 1
      }
    ]

    const response = await this.makeRequest('/api/admin/codes/generate', {
      method: 'POST',
      body: JSON.stringify({
        codes: testCodes,
        sendEmail: false
      })
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} - ${JSON.stringify(response.data)}`)
    }

    if (!response.data.success) {
      throw new Error(`Code generation failed: ${response.data.error}`)
    }

    const generatedCodes = response.data.codes
    if (!generatedCodes || generatedCodes.length !== 2) {
      throw new Error(`Expected 2 generated codes, got ${generatedCodes?.length || 0}`)
    }

    // Verify bulk code properties
    for (let i = 0; i < generatedCodes.length; i++) {
      const code = generatedCodes[i]
      const expectedCode = testCodes[i]
      
      if (code.type !== 'bulk') {
        throw new Error(`Expected type 'bulk', got '${code.type}'`)
      }
      
      if (code.max_usage_count !== expectedCode.max_usage_count) {
        throw new Error(`Expected max_usage_count ${expectedCode.max_usage_count}, got ${code.max_usage_count}`)
      }
      
      if (code.usage_count !== 0) {
        throw new Error(`Expected initial usage_count 0, got ${code.usage_count}`)
      }
      
      if (!code.expires_at) {
        throw new Error('Expected expires_at to be set for bulk code')
      }
      
      // Verify 24-hour expiration
      const expiresAt = new Date(code.expires_at)
      const now = new Date()
      const hoursDiff = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)
      
      if (hoursDiff < 23 || hoursDiff > 25) {
        throw new Error(`Expected ~24 hour expiration, got ${hoursDiff.toFixed(2)} hours`)
      }
      
      // Track for cleanup
      this.createdTestData.push({ type: 'access_code', id: code.id })
    }

    return { generatedCodes, response: response.data }
  }

  // Test 2: Bulk code authentication via API
  async testBulkCodeAuthenticationAPI() {
    // First create a bulk code
    const testCode = {
      code: `API-AUTH-${Date.now()}`,
      type: 'bulk',
      name: 'API Auth Test Code',
      max_usage_count: 3,
      max_concurrent_sessions: 1
    }

    const generateResponse = await this.makeRequest('/api/admin/codes/generate', {
      method: 'POST',
      body: JSON.stringify({
        codes: [testCode],
        sendEmail: false
      })
    })

    if (!generateResponse.ok || !generateResponse.data.success) {
      throw new Error('Failed to generate test code for authentication test')
    }

    const bulkCode = generateResponse.data.codes[0]
    this.createdTestData.push({ type: 'access_code', id: bulkCode.id })

    // Test successful authentication
    const authResponse1 = await this.makeRequest('/api/auth/code-login', {
      method: 'POST',
      body: JSON.stringify({ code: bulkCode.code })
    })

    if (!authResponse1.ok) {
      throw new Error(`First auth failed: ${authResponse1.status} - ${JSON.stringify(authResponse1.data)}`)
    }

    if (!authResponse1.data.success) {
      throw new Error(`First auth unsuccessful: ${authResponse1.data.error}`)
    }

    // Verify response structure
    const authData1 = authResponse1.data.data
    if (!authData1.sessionId) {
      throw new Error('Missing sessionId in auth response')
    }
    
    if (authData1.codeType !== 'bulk') {
      throw new Error(`Expected codeType 'bulk', got '${authData1.codeType}'`)
    }

    // Test second authentication
    const authResponse2 = await this.makeRequest('/api/auth/code-login', {
      method: 'POST',
      body: JSON.stringify({ code: bulkCode.code })
    })

    if (!authResponse2.ok || !authResponse2.data.success) {
      throw new Error('Second authentication should have succeeded')
    }

    // Test third authentication (should still work)
    const authResponse3 = await this.makeRequest('/api/auth/code-login', {
      method: 'POST',
      body: JSON.stringify({ code: bulkCode.code })
    })

    if (!authResponse3.ok || !authResponse3.data.success) {
      throw new Error('Third authentication should have succeeded')
    }

    // Test fourth authentication (should fail - capacity exceeded)
    const authResponse4 = await this.makeRequest('/api/auth/code-login', {
      method: 'POST',
      body: JSON.stringify({ code: bulkCode.code })
    })

    if (authResponse4.ok && authResponse4.data.success) {
      throw new Error('Fourth authentication should have failed due to capacity')
    }

    if (authResponse4.status !== 403) {
      throw new Error(`Expected 403 status for capacity exceeded, got ${authResponse4.status}`)
    }

    // Verify error message mentions capacity
    const errorMessage = authResponse4.data.error || ''
    if (!errorMessage.toLowerCase().includes('capacity') && !errorMessage.toLowerCase().includes('maximum')) {
      throw new Error(`Expected capacity-related error message, got: ${errorMessage}`)
    }

    return {
      bulkCode,
      successfulAuths: 3,
      capacityExceededResponse: authResponse4.data
    }
  }

  // Test 3: Bulk code usage tracking API
  async testBulkCodeUsageTrackingAPI() {
    // Create and use a bulk code
    const testCode = {
      code: `API-USAGE-${Date.now()}`,
      type: 'bulk',
      name: 'API Usage Test Code',
      max_usage_count: 8,
      max_concurrent_sessions: 1
    }

    const generateResponse = await this.makeRequest('/api/admin/codes/generate', {
      method: 'POST',
      body: JSON.stringify({
        codes: [testCode],
        sendEmail: false
      })
    })

    const bulkCode = generateResponse.data.codes[0]
    this.createdTestData.push({ type: 'access_code', id: bulkCode.id })

    // Use the code a few times
    for (let i = 0; i < 3; i++) {
      await this.makeRequest('/api/auth/code-login', {
        method: 'POST',
        body: JSON.stringify({ code: bulkCode.code })
      })
    }

    // Test usage tracking API
    const usageResponse = await this.makeRequest(`/api/admin/bulk-codes/usage?codeId=${bulkCode.id}`)

    if (!usageResponse.ok) {
      throw new Error(`Usage API failed: ${usageResponse.status} - ${JSON.stringify(usageResponse.data)}`)
    }

    if (!usageResponse.data.success) {
      throw new Error(`Usage API unsuccessful: ${usageResponse.data.error}`)
    }

    const usageData = usageResponse.data.data
    
    // Verify usage data structure and values
    if (usageData.code_id !== bulkCode.id) {
      throw new Error(`Expected code_id ${bulkCode.id}, got ${usageData.code_id}`)
    }
    
    if (usageData.current_usage !== 3) {
      throw new Error(`Expected current_usage 3, got ${usageData.current_usage}`)
    }
    
    if (usageData.max_capacity !== 8) {
      throw new Error(`Expected max_capacity 8, got ${usageData.max_capacity}`)
    }
    
    if (usageData.active_sessions !== 3) {
      throw new Error(`Expected active_sessions 3, got ${usageData.active_sessions}`)
    }
    
    if (usageData.capacity_percentage !== 38) { // 3/8 * 100 = 37.5, rounded to 38
      throw new Error(`Expected capacity_percentage ~38, got ${usageData.capacity_percentage}`)
    }
    
    if (usageData.is_near_capacity !== false) {
      throw new Error('Should not be near capacity at 38%')
    }
    
    if (usageData.is_expired !== false) {
      throw new Error('Code should not be expired')
    }
    
    if (usageData.time_remaining_minutes <= 0) {
      throw new Error(`Expected positive time remaining, got ${usageData.time_remaining_minutes}`)
    }

    // Test bulk codes list API (all bulk codes)
    const allUsageResponse = await this.makeRequest('/api/admin/bulk-codes/usage')

    if (!allUsageResponse.ok || !allUsageResponse.data.success) {
      throw new Error('Failed to fetch all bulk codes usage data')
    }

    const allUsageData = allUsageResponse.data.data
    if (!Array.isArray(allUsageData)) {
      throw new Error('Expected array of usage data')
    }

    // Find our test code in the results
    const ourCodeUsage = allUsageData.find(usage => usage.code_id === bulkCode.id)
    if (!ourCodeUsage) {
      throw new Error('Test code not found in all bulk codes usage data')
    }

    // Verify it matches the individual query
    if (ourCodeUsage.current_usage !== usageData.current_usage) {
      throw new Error('Usage data mismatch between individual and list queries')
    }

    return {
      bulkCode,
      usageData,
      allUsageData: allUsageData.length
    }
  }

  // Test 4: Invalid bulk code scenarios via API
  async testInvalidBulkCodeScenariosAPI() {
    const scenarios = []

    // Test 1: Invalid code
    const invalidCodeResponse = await this.makeRequest('/api/auth/code-login', {
      method: 'POST',
      body: JSON.stringify({ code: 'INVALID-CODE-123' })
    })

    scenarios.push({
      name: 'Invalid Code',
      response: invalidCodeResponse,
      expectedStatus: 401,
      shouldFail: true
    })

    // Test 2: Expired code
    const admin = await this.createTestAdmin()
    const expiredTime = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    
    const { data: expiredCode, error } = await supabase
      .from('access_codes')
      .insert({
        code: `EXPIRED-API-${Date.now()}`,
        type: 'bulk',
        name: 'Expired API Test Code',
        max_usage_count: 5,
        usage_count: 0,
        expires_at: expiredTime,
        is_active: true,
        created_by: admin.id,
        max_concurrent_sessions: 1
      })
      .select()
      .single()

    if (error) throw error
    this.createdTestData.push({ type: 'access_code', id: expiredCode.id })

    const expiredCodeResponse = await this.makeRequest('/api/auth/code-login', {
      method: 'POST',
      body: JSON.stringify({ code: expiredCode.code })
    })

    scenarios.push({
      name: 'Expired Code',
      response: expiredCodeResponse,
      expectedStatus: 401,
      shouldFail: true
    })

    // Test 3: Invalid bulk code generation parameters
    const invalidGenResponse = await this.makeRequest('/api/admin/codes/generate', {
      method: 'POST',
      body: JSON.stringify({
        codes: [{
          code: `INVALID-BULK-${Date.now()}`,
          type: 'bulk',
          name: 'Invalid Bulk Code',
          max_usage_count: 500, // Over limit
          max_concurrent_sessions: 1
        }],
        sendEmail: false
      })
    })

    scenarios.push({
      name: 'Invalid Generation Parameters',
      response: invalidGenResponse,
      expectedStatus: 400,
      shouldFail: true
    })

    // Verify all scenarios
    for (const scenario of scenarios) {
      if (scenario.shouldFail) {
        if (scenario.response.ok) {
          throw new Error(`${scenario.name}: Expected failure but request succeeded`)
        }
        
        if (scenario.response.status !== scenario.expectedStatus) {
          throw new Error(`${scenario.name}: Expected status ${scenario.expectedStatus}, got ${scenario.response.status}`)
        }
        
        if (!scenario.response.data.error) {
          throw new Error(`${scenario.name}: Expected error message in response`)
        }
      }
    }

    return { scenarios: scenarios.length, allFailed: true }
  }

  async cleanup() {
    console.log('🧹 Cleaning up API test data...')
    
    // Clean up in reverse order to handle foreign key constraints
    for (const item of this.createdTestData.reverse()) {
      try {
        if (item.type === 'session') {
          await supabase.from('sessions').delete().eq('id', item.id)
        } else if (item.type === 'access_code') {
          await supabase.from('access_codes').delete().eq('id', item.id)
        } else if (item.type === 'admin_user') {
          await supabase.from('admin_users').delete().eq('id', item.id)
        }
      } catch (error) {
        console.warn(`Failed to cleanup ${item.type} ${item.id}:`, error.message)
      }
    }
    
    console.log(`🗑️  Cleaned up ${this.createdTestData.length} test records`)
  }

  printResults() {
    const totalDuration = Date.now() - this.testStartTime
    
    console.log('\n📊 API Integration Test Results Summary:')
    console.log('=' .repeat(60))
    
    let passed = 0
    let failed = 0
    let totalTestDuration = 0
    
    for (const result of this.testResults) {
      const status = result.status === 'PASS' ? '✅' : '❌'
      console.log(`${status} ${result.name} (${result.duration}ms)`)
      
      if (result.status === 'PASS') {
        passed++
      } else {
        failed++
        console.log(`   Error: ${result.error}`)
      }
      
      totalTestDuration += result.duration
    }
    
    console.log('=' .repeat(60))
    console.log(`Total: ${this.testResults.length} | Passed: ${passed} | Failed: ${failed}`)
    console.log(`Test Duration: ${totalTestDuration}ms | Total Duration: ${totalDuration}ms`)
    
    if (failed > 0) {
      console.log('\n❌ Some API integration tests failed.')
      process.exit(1)
    } else {
      console.log('\n🎉 All API integration tests passed!')
      console.log('\n📋 API Endpoints Tested:')
      console.log('✅ POST /api/admin/codes/generate - Bulk code generation')
      console.log('✅ POST /api/auth/code-login - Bulk code authentication')
      console.log('✅ GET /api/admin/bulk-codes/usage - Usage tracking')
      console.log('✅ Error handling for invalid scenarios')
    }
  }
}

async function runAPIIntegrationTests() {
  const tester = new BulkCodeAPITester()
  
  try {
    console.log('🚀 Starting bulk code API integration tests...\n')
    
    // Test 1: Bulk code generation via API
    await tester.runTest(
      'Bulk Code Generation API',
      () => tester.testBulkCodeGenerationAPI()
    )
    
    // Test 2: Bulk code authentication via API
    await tester.runTest(
      'Bulk Code Authentication API',
      () => tester.testBulkCodeAuthenticationAPI()
    )
    
    // Test 3: Bulk code usage tracking API
    await tester.runTest(
      'Bulk Code Usage Tracking API',
      () => tester.testBulkCodeUsageTrackingAPI()
    )
    
    // Test 4: Invalid bulk code scenarios via API
    await tester.runTest(
      'Invalid Bulk Code Scenarios API',
      () => tester.testInvalidBulkCodeScenariosAPI()
    )
    
  } catch (error) {
    console.error('💥 API integration test suite failed:', error)
  } finally {
    await tester.cleanup()
    tester.printResults()
  }
}

// Run the API integration tests
if (require.main === module) {
  runAPIIntegrationTests().catch(console.error)
}

module.exports = { BulkCodeAPITester }