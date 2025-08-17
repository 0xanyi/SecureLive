# Test Suite

This directory contains comprehensive tests for the bulk access code system, covering database functions, API endpoints, and integration scenarios.

## Test Files

### Integration Tests

#### `bulk-code-integration-tests.js`
Comprehensive end-to-end integration tests for bulk code functionality:
- End-to-end bulk code creation and usage flow
- Concurrent user login scenarios up to capacity limit
- Capacity exceeded rejection and error handling
- Race condition handling with concurrent access
- Automatic expiration and session cleanup
- Usage tracking API integration

#### `bulk-code-api-integration-tests.js`
API-level integration tests that make actual HTTP requests:
- POST /api/admin/codes/generate - Bulk code generation
- POST /api/auth/code-login - Bulk code authentication
- GET /api/admin/bulk-codes/usage - Usage tracking
- Error handling for invalid scenarios

### Database Function Tests

#### `database-functions-test.sql`
Comprehensive SQL-based test suite that tests all database functions:
- `check_bulk_code_capacity()` - Validates bulk code capacity and expiration
- `increment_bulk_code_usage()` - Atomically increments usage count
- `decrement_bulk_code_usage()` - Atomically decrements usage count  
- `check_concurrent_sessions()` - Updated to handle bulk codes
- Atomic operations and concurrent access scenarios

#### `run-database-tests.js`
Node.js test runner that executes API-level tests to verify database functions work correctly through the Supabase client.

### API Endpoint Tests

#### `bulk-code-usage-api-tests.js`
Comprehensive test suite for bulk code usage tracking and monitoring APIs:
- `/api/admin/bulk-codes/usage` - Real-time usage data endpoint
- `/api/admin/bulk-codes/status` - Bulk code status with remaining capacity
- `/api/admin/bulk-codes/cleanup` - Session cleanup with usage decrement
- Error handling and edge cases

#### `run-usage-api-tests.sh`
Shell script to run the bulk code usage API tests with proper environment setup.

## Running Tests

### Integration Tests
```bash
# Core integration tests
npm run test:bulk-integration

# API integration tests  
npm run test:bulk-api

# All bulk code tests
npm run test:bulk-all
```

These run comprehensive end-to-end tests that verify:
- Complete bulk code creation and usage flow
- Concurrent user scenarios and capacity limits
- Error handling and edge cases
- API endpoint functionality
- Database function integration

### Database Function Tests
```bash
npm run test:db
```

This runs the Node.js test runner which verifies:
- Bulk code creation and validation
- Capacity checking via RPC calls
- Usage increment/decrement operations
- Integration with concurrent sessions checking

### API Endpoint Tests
```bash
./tests/run-usage-api-tests.sh
```

This runs comprehensive tests for the bulk code usage tracking APIs:
- Real-time usage data retrieval
- Bulk code status monitoring
- Session cleanup with usage decrement
- Error handling and validation

### Full SQL Test Suite
For comprehensive testing, execute the SQL file directly in your Supabase SQL Editor:

1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `tests/database-functions-test.sql`
4. Execute the query

The SQL test suite provides detailed output with ✅/❌ indicators for each test case.

## Test Coverage

### Bulk Code Capacity Checking
- ✅ Fresh bulk code has available capacity
- ✅ Full capacity bulk code is rejected
- ✅ Expired bulk code is rejected
- ✅ Inactive bulk code is rejected

### Usage Increment Operations
- ✅ Usage increments successfully with available capacity
- ✅ Usage reaches maximum capacity correctly
- ✅ Cannot increment beyond maximum capacity
- ✅ Atomic operations prevent race conditions

### Usage Decrement Operations
- ✅ Usage decrements successfully
- ✅ Usage can decrement to zero
- ✅ Cannot decrement below zero

### Concurrent Sessions Integration
- ✅ Bulk codes integrate with existing session checking
- ✅ Individual and center codes still work correctly
- ✅ Proper delegation to bulk-specific logic

### Atomic Operations
- ✅ Concurrent access is handled safely
- ✅ Database constraints prevent invalid states
- ✅ Race conditions are prevented

## Requirements Verification

This test suite verifies the following requirements from the bulk-access-codes spec:

### Database Function Tests
**Requirement 2.1**: ✅ Users can access via bulk codes when capacity allows  
**Requirement 2.2**: ✅ Usage counter increments on successful login  
**Requirement 2.4**: ✅ Atomic operations prevent race conditions

### API Endpoint Tests  
**Requirement 3.1**: ✅ Display current usage count versus maximum capacity  
**Requirement 3.2**: ✅ Show remaining time until expiration  
**Requirement 3.3**: ✅ Provide visual warning indicator at 80% capacity  

## Database Functions Tested

### `check_bulk_code_capacity(p_code_id UUID)`
- Validates if bulk code has available capacity
- Checks expiration and active status
- Returns boolean indicating availability

### `increment_bulk_code_usage(p_code_id UUID)`
- Atomically increments usage count
- Only succeeds if capacity allows
- Returns boolean indicating success

### `decrement_bulk_code_usage(p_code_id UUID)`
- Atomically decrements usage count
- Prevents going below zero
- Returns boolean indicating success

### `check_concurrent_sessions(p_code_id UUID, p_session_token TEXT)`
- Updated to handle bulk codes
- Delegates to bulk-specific logic for bulk codes
- Maintains existing behavior for other code types

## Test Data Management

Tests create temporary data with `TEST_` prefixes and clean up automatically:
- Test admin user: `test@example.com`
- Test codes: `TEST_BULK_001`, `TEST_INDIVIDUAL_001`, `TEST_CENTER_001`
- All test data is removed after test completion

## Error Handling

Tests verify proper error handling for:
- Invalid code IDs
- Expired codes
- Inactive codes
- Capacity exceeded scenarios
- Concurrent access attempts

## Performance Considerations

The test suite includes scenarios that verify:
- Atomic operations work correctly under concurrent access
- Database constraints prevent invalid states
- Functions perform efficiently with proper indexing