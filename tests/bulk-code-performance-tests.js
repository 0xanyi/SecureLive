#!/usr/bin/env node

/**
 * Bulk Code Performance Tests
 * 
 * Tests the performance optimizations for bulk code operations
 * including database indexes, caching, and concurrent access handling.
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Test configuration
const TEST_CONFIG = {
  BULK_CODE_CAPACITY: 100,
  CONCURRENT_USERS: 50,
  PERFORMANCE_THRESHOLD_MS: 1000, // 1 second
  CACHE_TEST_ITERATIONS: 100
}

class PerformanceTestSuite {
  constructor() {
    this.testResults = []
    this.testBulkCodeId = null
  }

  async runAllTests() {
    console.log('🚀 Starting Bulk Code Performance Tests\n')
    
    try {
      await this.setupTestData()
      
      await this.testDatabaseIndexPerformance()
      await this.testOptimizedFunctionPerformance()
      await this.testConcurrentAccessPerformance()
      await this.testCachePerformance()
      await this.testBatchOperationPerformance()
      
      await this.cleanupTestData()
      
      this.printResults()
      
    } catch (error) {
      console.error('❌ Test suite failed:', error)
      await this.cleanupTestData()
      process.exit(1)
    }
  }

  async setupTestData() {
    console.log('📋 Setting up test data...')
    
    // Create a test bulk code
    const { data: bulkCode, error } = await supabase
      .from('access_codes')
      .insert({
        code: `PERF_TEST_${Date.now()}`,
        type: 'bulk',
        name: 'Performance Test Bulk Code',
        max_usage_count: TEST_CONFIG.BULK_CODE_CAPACITY,
        usage_count: 0,
        is_active: true,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        created_by: '00000000-0000-0000-0000-000000000000' // Dummy admin ID
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create test bulk code: ${error.message}`)
    }

    this.testBulkCodeId = bulkCode.id
    console.log(`✅ Created test bulk code: ${bulkCode.code} (${bulkCode.id})`)
  }

  async testDatabaseIndexPerformance() {
    console.log('\n🔍 Testing Database Index Performance...')
    
    const tests = [
      {
        name: 'Bulk Code Lookup by Code',
        query: () => supabase
          .from('access_codes')
          .select('*')
          .eq('type', 'bulk')
          .eq('is_active', true)
          .limit(10)
      },
      {
        name: 'Bulk Code Capacity Check',
        query: () => supabase
          .rpc('check_bulk_code_capacity_optimized', { p_code_id: this.testBulkCodeId })
      },
      {
        name: 'Active Sessions by Code',
        query: () => supabase
          .from('sessions')
          .select('id')
          .eq('code_id', this.testBulkCodeId)
          .eq('is_active', true)
      }
    ]

    for (const test of tests) {
      const startTime = Date.now()
      const { error } = await test.query()
      const duration = Date.now() - startTime

      const passed = !error && duration < TEST_CONFIG.PERFORMANCE_THRESHOLD_MS
      
      this.testResults.push({
        category: 'Database Index Performance',
        test: test.name,
        duration,
        passed,
        details: error ? error.message : `${duration}ms`
      })

      console.log(`  ${passed ? '✅' : '❌'} ${test.name}: ${duration}ms`)
    }
  }

  async testOptimizedFunctionPerformance() {
    console.log('\n⚡ Testing Optimized Function Performance...')
    
    const tests = [
      {
        name: 'Optimized Capacity Check',
        iterations: 50,
        operation: () => supabase.rpc('check_bulk_code_capacity_optimized', { 
          p_code_id: this.testBulkCodeId 
        })
      },
      {
        name: 'Optimized Usage Increment',
        iterations: 10,
        operation: () => supabase.rpc('increment_bulk_code_usage_optimized', { 
          p_code_id: this.testBulkCodeId 
        })
      },
      {
        name: 'Batch Usage Data Retrieval',
        iterations: 20,
        operation: () => supabase.rpc('get_bulk_code_usage_batch', { 
          p_code_ids: [this.testBulkCodeId] 
        })
      }
    ]

    for (const test of tests) {
      const startTime = Date.now()
      const promises = []
      
      for (let i = 0; i < test.iterations; i++) {
        promises.push(test.operation())
      }
      
      const results = await Promise.all(promises)
      const duration = Date.now() - startTime
      const avgDuration = duration / test.iterations
      const errors = results.filter(r => r.error).length

      const passed = errors === 0 && avgDuration < (TEST_CONFIG.PERFORMANCE_THRESHOLD_MS / 2)
      
      this.testResults.push({
        category: 'Optimized Function Performance',
        test: test.name,
        duration: avgDuration,
        passed,
        details: `${test.iterations} ops, ${errors} errors, ${avgDuration.toFixed(2)}ms avg`
      })

      console.log(`  ${passed ? '✅' : '❌'} ${test.name}: ${avgDuration.toFixed(2)}ms avg (${test.iterations} ops)`)
    }
  }

  async testConcurrentAccessPerformance() {
    console.log('\n🔄 Testing Concurrent Access Performance...')
    
    // Reset usage count for concurrent test
    await supabase
      .from('access_codes')
      .update({ usage_count: 0 })
      .eq('id', this.testBulkCodeId)

    const concurrentOperations = []
    const startTime = Date.now()
    
    // Simulate concurrent capacity checks
    for (let i = 0; i < TEST_CONFIG.CONCURRENT_USERS; i++) {
      concurrentOperations.push(
        supabase.rpc('check_bulk_code_capacity_optimized', { 
          p_code_id: this.testBulkCodeId 
        })
      )
    }
    
    const results = await Promise.all(concurrentOperations)
    const duration = Date.now() - startTime
    const errors = results.filter(r => r.error).length
    const avgDuration = duration / TEST_CONFIG.CONCURRENT_USERS

    const passed = errors === 0 && avgDuration < TEST_CONFIG.PERFORMANCE_THRESHOLD_MS
    
    this.testResults.push({
      category: 'Concurrent Access Performance',
      test: 'Concurrent Capacity Checks',
      duration: avgDuration,
      passed,
      details: `${TEST_CONFIG.CONCURRENT_USERS} concurrent ops, ${errors} errors`
    })

    console.log(`  ${passed ? '✅' : '❌'} Concurrent Capacity Checks: ${avgDuration.toFixed(2)}ms avg`)

    // Test concurrent usage increments (should handle race conditions)
    const incrementOperations = []
    const incrementStartTime = Date.now()
    
    for (let i = 0; i < 20; i++) { // Smaller number to avoid exceeding capacity
      incrementOperations.push(
        supabase.rpc('increment_bulk_code_usage_optimized', { 
          p_code_id: this.testBulkCodeId 
        })
      )
    }
    
    const incrementResults = await Promise.all(incrementOperations)
    const incrementDuration = Date.now() - incrementStartTime
    const incrementErrors = incrementResults.filter(r => r.error).length
    const successfulIncrements = incrementResults.filter(r => r.data === true).length

    const incrementPassed = incrementErrors === 0 && successfulIncrements > 0
    
    this.testResults.push({
      category: 'Concurrent Access Performance',
      test: 'Concurrent Usage Increments',
      duration: incrementDuration / 20,
      passed: incrementPassed,
      details: `${successfulIncrements}/20 successful, ${incrementErrors} errors`
    })

    console.log(`  ${incrementPassed ? '✅' : '❌'} Concurrent Usage Increments: ${successfulIncrements}/20 successful`)
  }

  async testCachePerformance() {
    console.log('\n💾 Testing Cache Performance...')
    
    // This would test the cache if we had access to it in the test environment
    // For now, we'll test the API endpoints that use caching
    
    const cacheTests = [
      {
        name: 'Usage API Response Time',
        iterations: TEST_CONFIG.CACHE_TEST_ITERATIONS,
        operation: async () => {
          const response = await fetch(`${supabaseUrl.replace('/rest/v1', '')}/api/admin/bulk-codes/usage?codeId=${this.testBulkCodeId}`)
          return response.ok
        }
      }
    ]

    for (const test of cacheTests) {
      const startTime = Date.now()
      let successCount = 0
      
      for (let i = 0; i < test.iterations; i++) {
        try {
          const success = await test.operation()
          if (success) successCount++
        } catch (error) {
          // Count as failure
        }
      }
      
      const duration = Date.now() - startTime
      const avgDuration = duration / test.iterations
      const successRate = (successCount / test.iterations) * 100

      const passed = successRate > 95 && avgDuration < 100 // 100ms threshold for API calls
      
      this.testResults.push({
        category: 'Cache Performance',
        test: test.name,
        duration: avgDuration,
        passed,
        details: `${successRate.toFixed(1)}% success rate, ${avgDuration.toFixed(2)}ms avg`
      })

      console.log(`  ${passed ? '✅' : '❌'} ${test.name}: ${avgDuration.toFixed(2)}ms avg (${successRate.toFixed(1)}% success)`)
    }
  }

  async testBatchOperationPerformance() {
    console.log('\n📦 Testing Batch Operation Performance...')
    
    // Create additional test bulk codes for batch testing
    const additionalCodes = []
    for (let i = 0; i < 5; i++) {
      const { data: code } = await supabase
        .from('access_codes')
        .insert({
          code: `BATCH_TEST_${Date.now()}_${i}`,
          type: 'bulk',
          name: `Batch Test Code ${i}`,
          max_usage_count: 50,
          usage_count: Math.floor(Math.random() * 25),
          is_active: true,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          created_by: '00000000-0000-0000-0000-000000000000'
        })
        .select()
        .single()
      
      if (code) additionalCodes.push(code.id)
    }

    const allCodeIds = [this.testBulkCodeId, ...additionalCodes]

    // Test batch usage retrieval
    const startTime = Date.now()
    const { data, error } = await supabase
      .rpc('get_bulk_code_usage_batch', { p_code_ids: allCodeIds })
    const duration = Date.now() - startTime

    const passed = !error && data && data.length === allCodeIds.length && duration < TEST_CONFIG.PERFORMANCE_THRESHOLD_MS
    
    this.testResults.push({
      category: 'Batch Operation Performance',
      test: 'Batch Usage Retrieval',
      duration,
      passed,
      details: `${data?.length || 0}/${allCodeIds.length} codes retrieved`
    })

    console.log(`  ${passed ? '✅' : '❌'} Batch Usage Retrieval: ${duration}ms (${data?.length || 0} codes)`)

    // Cleanup additional test codes
    await supabase
      .from('access_codes')
      .delete()
      .in('id', additionalCodes)
  }

  async cleanupTestData() {
    console.log('\n🧹 Cleaning up test data...')
    
    if (this.testBulkCodeId) {
      // Delete any sessions created during testing
      await supabase
        .from('sessions')
        .delete()
        .eq('code_id', this.testBulkCodeId)

      // Delete the test bulk code
      await supabase
        .from('access_codes')
        .delete()
        .eq('id', this.testBulkCodeId)
      
      console.log('✅ Test data cleaned up')
    }
  }

  printResults() {
    console.log('\n📊 Performance Test Results Summary\n')
    
    const categories = [...new Set(this.testResults.map(r => r.category))]
    
    for (const category of categories) {
      console.log(`\n${category}:`)
      const categoryTests = this.testResults.filter(r => r.category === category)
      
      for (const test of categoryTests) {
        const status = test.passed ? '✅ PASS' : '❌ FAIL'
        console.log(`  ${status} ${test.test}: ${test.details}`)
      }
    }

    const totalTests = this.testResults.length
    const passedTests = this.testResults.filter(r => r.passed).length
    const failedTests = totalTests - passedTests

    console.log(`\n📈 Overall Results:`)
    console.log(`  Total Tests: ${totalTests}`)
    console.log(`  Passed: ${passedTests}`)
    console.log(`  Failed: ${failedTests}`)
    console.log(`  Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`)

    if (failedTests > 0) {
      console.log('\n❌ Some performance tests failed. Consider reviewing the optimizations.')
      process.exit(1)
    } else {
      console.log('\n🎉 All performance tests passed!')
    }
  }
}

// Run the tests
const testSuite = new PerformanceTestSuite()
testSuite.runAllTests().catch(console.error)