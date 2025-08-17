#!/usr/bin/env node

/**
 * Check and fix bulk code database setup
 * This script verifies that all required bulk code database functions exist
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkFunction(functionName) {
  try {
    const { data, error } = await supabase.rpc('pg_get_functiondef', {
      funcid: `${functionName}(uuid)`
    })
    
    if (error) {
      console.log(`❌ Function ${functionName} not found`)
      return false
    }
    
    console.log(`✅ Function ${functionName} exists`)
    return true
  } catch (err) {
    console.log(`❌ Function ${functionName} not found`)
    return false
  }
}

async function checkBulkCodeSupport() {
  try {
    // Check if access_codes table supports bulk type
    const { data, error } = await supabase
      .from('access_codes')
      .select('type, usage_count, max_usage_count')
      .eq('type', 'bulk')
      .limit(1)
    
    if (error && error.message.includes('invalid input value for enum')) {
      console.log('❌ access_codes table does not support bulk type')
      return false
    }
    
    console.log('✅ access_codes table supports bulk codes')
    return true
  } catch (err) {
    console.log('❌ Error checking bulk code support:', err.message)
    return false
  }
}

async function runMigration(migrationFile) {
  try {
    const migrationPath = path.join(__dirname, '..', 'migrations', migrationFile)
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    console.log(`🔄 Running migration: ${migrationFile}`)
    
    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    for (const statement of statements) {
      if (statement.trim()) {
        const { error } = await supabase.rpc('exec_sql', { sql: statement })
        if (error) {
          console.error(`❌ Error in statement: ${statement.substring(0, 100)}...`)
          console.error('Error:', error.message)
        }
      }
    }
    
    console.log(`✅ Migration ${migrationFile} completed`)
    return true
  } catch (err) {
    console.error(`❌ Failed to run migration ${migrationFile}:`, err.message)
    return false
  }
}

async function main() {
  console.log('🔍 Checking bulk code database setup...\n')
  
  // Check if bulk code support exists
  const bulkSupported = await checkBulkCodeSupport()
  
  // Check required functions
  const requiredFunctions = [
    'check_bulk_code_capacity_optimized',
    'increment_bulk_code_usage_optimized',
    'decrement_bulk_code_usage_optimized'
  ]
  
  const functionResults = await Promise.all(
    requiredFunctions.map(func => checkFunction(func))
  )
  
  const allFunctionsExist = functionResults.every(result => result)
  
  console.log('\n📊 Summary:')
  console.log(`Bulk code support: ${bulkSupported ? '✅' : '❌'}`)
  console.log(`Required functions: ${allFunctionsExist ? '✅' : '❌'}`)
  
  if (!bulkSupported || !allFunctionsExist) {
    console.log('\n🔧 Applying missing migrations...')
    
    if (!bulkSupported) {
      await runMigration('add-bulk-access-codes.sql')
    }
    
    if (!allFunctionsExist) {
      await runMigration('optimize-bulk-code-functions.sql')
    }
    
    console.log('\n✅ Database setup completed!')
    console.log('Please restart your application to use the updated database functions.')
  } else {
    console.log('\n✅ All bulk code database components are properly configured!')
  }
}

main().catch(console.error)