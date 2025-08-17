const { createClient } = require('@supabase/supabase-js')

// Test configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Test data
const testCodeId = 'test-bulk-analytics-' + Date.now()
const testCodeName = 'Analytics Test Code'

async function runBulkCodeAnalyticsTests() {
  console.log('🧪 Starting Bulk Code Analytics Tests...\n')

  try {
    // Test 1: Create test bulk code
    console.log('1. Creating test bulk code...')
    const { data: testCode, error: createError } = await supabase
      .from('access_codes')
      .insert({
        id: testCodeId,
        code: 'ANALYTICS-TEST-' + Date.now(),
        name: testCodeName,
        type: 'bulk',
        max_usage_count: 10,
        usage_count: 5,
        max_concurrent_sessions: 10,
        is_active: true,
        created_by: 'test-admin',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single()

    if (createError) {
      console.error('❌ Failed to create test code:', createError)
      return false
    }
    console.log('✅ Test bulk code created')

    // Test 2: Create test sessions
    console.log('2. Creating test sessions...')
    const testSessions = []
    for (let i = 0; i < 3; i++) {
      const sessionId = `test-session-${testCodeId}-${i}`
      const startTime = new Date(Date.now() - (i + 1) * 60 * 60 * 1000) // Staggered start times
      const endTime = i < 2 ? new Date(startTime.getTime() + 30 * 60 * 1000) : null // Last session still active

      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          id: sessionId,
          code_id: testCodeId,
          session_token: `token-${sessionId}`,
          ip_address: `192.168.1.${100 + i}`,
          user_agent: `Test Browser ${i + 1}`,
          started_at: startTime.toISOString(),
          ended_at: endTime?.toISOString(),
          last_activity: (endTime || new Date()).toISOString(),
          is_active: !endTime
        })
        .select()
        .single()

      if (sessionError) {
        console.error(`❌ Failed to create test session ${i}:`, sessionError)
        return false
      }
      testSessions.push(session)
    }
    console.log('✅ Test sessions created')

    // Test 3: Test analytics API - overview
    console.log('3. Testing analytics API - overview...')
    const overviewResponse = await fetch(`http://localhost:3000/api/admin/bulk-codes/analytics?type=overview&codeId=${testCodeId}`)
    const overviewData = await overviewResponse.json()

    if (!overviewData.success || !overviewData.data || overviewData.data.length === 0) {
      console.error('❌ Analytics overview API failed:', overviewData)
      return false
    }

    const analytics = overviewData.data[0]
    console.log('✅ Analytics overview API working')
    console.log(`   - Code: ${analytics.code_name}`)
    console.log(`   - Capacity: ${analytics.total_usage}/${analytics.max_usage_count}`)
    console.log(`   - Utilization: ${analytics.capacity_utilization}%`)

    // Test 4: Test analytics API - usage history
    console.log('4. Testing analytics API - usage history...')
    const historyResponse = await fetch(`http://localhost:3000/api/admin/bulk-codes/analytics?type=usage-history&codeId=${testCodeId}`)
    const historyData = await historyResponse.json()

    if (!historyData.success || !historyData.data) {
      console.error('❌ Usage history API failed:', historyData)
      return false
    }

    console.log('✅ Usage history API working')
    console.log(`   - Sessions found: ${historyData.data.length}`)

    // Test 5: Test analytics API - capacity metrics
    console.log('5. Testing analytics API - capacity metrics...')
    const metricsResponse = await fetch('http://localhost:3000/api/admin/bulk-codes/analytics?type=capacity-metrics')
    const metricsData = await metricsResponse.json()

    if (!metricsData.success || !metricsData.data) {
      console.error('❌ Capacity metrics API failed:', metricsData)
      return false
    }

    console.log('✅ Capacity metrics API working')
    console.log(`   - Total bulk codes: ${metricsData.data.total_bulk_codes}`)
    console.log(`   - Active bulk codes: ${metricsData.data.active_bulk_codes}`)
    console.log(`   - Average utilization: ${metricsData.data.average_capacity_utilization}%`)

    // Test 6: Test export API - codes
    console.log('6. Testing export API - codes...')
    const exportResponse = await fetch(`http://localhost:3000/api/admin/bulk-codes/export?type=codes&format=json&codeId=${testCodeId}`)
    const exportData = await exportResponse.json()

    if (!exportData.success || !exportData.data) {
      console.error('❌ Export codes API failed:', exportData)
      return false
    }

    console.log('✅ Export codes API working')
    console.log(`   - Exported codes: ${exportData.data.length}`)

    // Test 7: Test export API - sessions
    console.log('7. Testing export API - sessions...')
    const sessionsExportResponse = await fetch(`http://localhost:3000/api/admin/bulk-codes/export?type=sessions&format=json&codeId=${testCodeId}`)
    const sessionsExportData = await sessionsExportResponse.json()

    if (!sessionsExportData.success || !sessionsExportData.data) {
      console.error('❌ Export sessions API failed:', sessionsExportData)
      return false
    }

    console.log('✅ Export sessions API working')
    console.log(`   - Exported sessions: ${sessionsExportData.data.length}`)

    // Test 8: Test CSV export
    console.log('8. Testing CSV export...')
    const csvResponse = await fetch(`http://localhost:3000/api/admin/bulk-codes/export?type=codes&format=csv&codeId=${testCodeId}`)
    
    if (!csvResponse.ok) {
      console.error('❌ CSV export failed:', csvResponse.status)
      return false
    }

    const csvContent = await csvResponse.text()
    if (!csvContent.includes('code_id') || !csvContent.includes(testCodeId)) {
      console.error('❌ CSV export content invalid')
      return false
    }

    console.log('✅ CSV export working')
    console.log(`   - CSV length: ${csvContent.length} characters`)

    console.log('\n🎉 All Bulk Code Analytics Tests Passed!')
    return true

  } catch (error) {
    console.error('❌ Test error:', error)
    return false
  } finally {
    // Cleanup: Remove test data
    console.log('\n🧹 Cleaning up test data...')
    
    // Delete test sessions
    await supabase
      .from('sessions')
      .delete()
      .eq('code_id', testCodeId)

    // Delete test code
    await supabase
      .from('access_codes')
      .delete()
      .eq('id', testCodeId)

    console.log('✅ Cleanup completed')
  }
}

// Test analytics data validation
async function testAnalyticsDataValidation() {
  console.log('\n📊 Testing Analytics Data Validation...')

  try {
    // Test invalid parameters
    console.log('1. Testing invalid analytics type...')
    const invalidResponse = await fetch('http://localhost:3000/api/admin/bulk-codes/analytics?type=invalid')
    const invalidData = await invalidResponse.json()

    if (invalidData.success) {
      console.error('❌ Should have failed with invalid type')
      return false
    }
    console.log('✅ Invalid type properly rejected')

    // Test invalid export parameters
    console.log('2. Testing invalid export type...')
    const invalidExportResponse = await fetch('http://localhost:3000/api/admin/bulk-codes/export?type=invalid')
    const invalidExportData = await invalidExportResponse.json()

    if (invalidExportData.success) {
      console.error('❌ Should have failed with invalid export type')
      return false
    }
    console.log('✅ Invalid export type properly rejected')

    // Test invalid format
    console.log('3. Testing invalid export format...')
    const invalidFormatResponse = await fetch('http://localhost:3000/api/admin/bulk-codes/export?type=codes&format=invalid')
    const invalidFormatData = await invalidFormatResponse.json()

    if (invalidFormatData.success) {
      console.error('❌ Should have failed with invalid format')
      return false
    }
    console.log('✅ Invalid format properly rejected')

    console.log('✅ Analytics data validation tests passed')
    return true

  } catch (error) {
    console.error('❌ Validation test error:', error)
    return false
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Bulk Code Analytics Test Suite\n')

  const results = []
  
  results.push(await runBulkCodeAnalyticsTests())
  results.push(await testAnalyticsDataValidation())

  const passed = results.filter(r => r).length
  const total = results.length

  console.log(`\n📈 Test Results: ${passed}/${total} test suites passed`)

  if (passed === total) {
    console.log('🎉 All analytics tests completed successfully!')
    process.exit(0)
  } else {
    console.log('❌ Some analytics tests failed')
    process.exit(1)
  }
}

// Handle command line execution
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Fatal test error:', error)
    process.exit(1)
  })
}

module.exports = {
  runBulkCodeAnalyticsTests,
  testAnalyticsDataValidation
}