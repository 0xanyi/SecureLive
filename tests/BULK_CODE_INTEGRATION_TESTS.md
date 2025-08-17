# Bulk Code Integration Tests

This document describes the comprehensive integration test suite for bulk access code functionality, covering all requirements from the bulk-access-codes specification.

## Overview

The integration test suite validates the complete bulk code functionality from end-to-end, including:

- Bulk code creation and usage flow
- Concurrent user login scenarios up to capacity limits
- Capacity exceeded rejection and error handling
- Automatic expiration and session cleanup
- API endpoint integration
- Database function validation

## Test Files

### Core Integration Tests

#### `bulk-code-integration-tests.js`
Comprehensive end-to-end integration tests that simulate the complete bulk code lifecycle:

**Test Coverage:**
- ✅ End-to-end bulk code creation and usage flow
- ✅ Concurrent user login scenarios up to capacity limit
- ✅ Capacity exceeded rejection and error handling
- ✅ Race condition handling with concurrent access
- ✅ Automatic expiration and session cleanup
- ✅ Usage tracking API integration

**Requirements Verified:**
- 1.1: Bulk code creation with capacity limits (1-400)
- 2.1: Users can access via bulk codes when capacity allows
- 2.2: Usage counter increments on successful login
- 2.3: Capacity exceeded rejection with appropriate error
- 2.4: Atomic operations prevent race conditions
- 4.1: Automatic expiration and session cleanup

#### `bulk-code-api-integration-tests.js`
API-level integration tests that make actual HTTP requests to test endpoints:

**Test Coverage:**
- ✅ POST /api/admin/codes/generate - Bulk code generation
- ✅ POST /api/auth/code-login - Bulk code authentication
- ✅ GET /api/admin/bulk-codes/usage - Usage tracking
- ✅ Error handling for invalid scenarios

**API Scenarios Tested:**
- Bulk code generation with proper validation
- Successful authentication flow
- Capacity exceeded scenarios
- Invalid/expired code handling
- Usage tracking and monitoring

### Supporting Test Files

#### `bulk-code-cleanup-tests.js`
Tests the cleanup functionality for bulk codes and sessions.

#### `bulk-code-error-handling-tests.js`
Tests the comprehensive error handling system for bulk codes.

#### `bulk-code-usage-api-tests.js`
Tests the usage tracking and monitoring APIs.

## Running Tests

### Individual Test Suites

```bash
# Core integration tests
npm run test:bulk-integration

# API integration tests
npm run test:bulk-api

# All bulk code tests
npm run test:bulk-all
```

### Manual Test Execution

```bash
# Core integration tests
node tests/bulk-code-integration-tests.js

# API integration tests
node tests/bulk-code-api-integration-tests.js

# Comprehensive test suite
./tests/run-all-bulk-code-tests.sh
```

## Test Scenarios

### 1. End-to-End Bulk Code Creation and Usage Flow

**Scenario:** Create a bulk code and simulate multiple users accessing it.

**Steps:**
1. Create bulk code with capacity of 3
2. Verify initial state (usage_count = 0)
3. Simulate 3 user logins
4. Verify usage counter increments correctly
5. Verify final state (usage_count = 3)

**Expected Results:**
- All 3 logins succeed
- Usage counter increments atomically
- Final usage count matches expected value

### 2. Concurrent User Login Scenarios

**Scenario:** Test concurrent access up to capacity limit.

**Steps:**
1. Create bulk code with capacity of 5
2. Simulate 5 concurrent login attempts
3. Attempt 6th login (should fail)
4. Verify final usage count

**Expected Results:**
- All 5 concurrent logins succeed
- 6th login fails with capacity exceeded error
- Final usage count is exactly 5

### 3. Capacity Exceeded Rejection and Error Handling

**Scenario:** Test proper rejection when capacity is exceeded.

**Steps:**
1. Create bulk code with capacity of 2
2. Fill to capacity with 2 logins
3. Attempt 3 additional logins
4. Verify all rejections are handled correctly

**Expected Results:**
- First 2 logins succeed
- All subsequent logins fail with appropriate error
- Usage count remains at 2
- Error messages are user-friendly

### 4. Race Condition Handling

**Scenario:** Test atomic operations under concurrent access.

**Steps:**
1. Create bulk code with capacity of 3
2. Fill to 2/3 capacity
3. Simulate 5 concurrent attempts for last slot
4. Verify exactly 1 succeeds, 4 fail

**Expected Results:**
- Exactly 1 concurrent attempt succeeds
- 4 attempts fail with capacity/conflict errors
- Final usage count is exactly 3
- No data corruption occurs

### 5. Automatic Expiration and Session Cleanup

**Scenario:** Test expiration handling and cleanup.

**Steps:**
1. Create expired bulk code with active sessions
2. Attempt login with expired code
3. Run cleanup functions
4. Verify code deactivation and session termination

**Expected Results:**
- Expired code rejects new logins
- Cleanup deactivates expired codes
- Active sessions are terminated
- Usage count is reset to 0

### 6. API Integration Testing

**Scenario:** Test actual API endpoints.

**Steps:**
1. Generate bulk codes via API
2. Authenticate users via API
3. Track usage via API
4. Test error scenarios via API

**Expected Results:**
- API responses match expected format
- HTTP status codes are correct
- Error messages are appropriate
- Data consistency is maintained

## Database Functions Tested

### `check_bulk_code_capacity(p_code_id UUID)`
- Validates bulk code capacity and expiration
- Returns boolean indicating availability
- Handles edge cases and invalid inputs

### `increment_bulk_code_usage(p_code_id UUID)`
- Atomically increments usage count
- Only succeeds if capacity allows
- Prevents race conditions

### `decrement_bulk_code_usage(p_code_id UUID)`
- Atomically decrements usage count
- Used during session cleanup
- Prevents negative values

### `cleanup_inactive_sessions()`
- Cleans up inactive sessions
- Decrements bulk code usage counters
- Handles bulk code expiration

## Error Scenarios Tested

### Capacity Exceeded
- **Trigger:** Usage count reaches max_usage_count
- **Expected:** 403 status, user-friendly error message
- **Verified:** Error message mentions capacity limit

### Code Expired
- **Trigger:** Current time > expires_at
- **Expected:** 401 status, expiration error message
- **Verified:** Error message mentions expiration

### Invalid Code
- **Trigger:** Non-existent or inactive code
- **Expected:** 401 status, invalid code error
- **Verified:** No sensitive information leaked

### Concurrent Access Conflict
- **Trigger:** Race condition during capacity check
- **Expected:** 409 status, retry suggestion
- **Verified:** Atomic operations prevent corruption

### Database Errors
- **Trigger:** Database connection issues
- **Expected:** 500 status, generic error message
- **Verified:** Recovery mechanisms attempted

## Performance Considerations

### Concurrent Access Testing
- Tests simulate up to 50 concurrent users
- Verifies atomic operations under load
- Measures response times and success rates

### Database Performance
- Tests query performance with high usage counts
- Verifies index usage for bulk code queries
- Measures cleanup operation efficiency

### Memory Usage
- Tests monitor memory usage during concurrent access
- Verifies no memory leaks in long-running tests
- Measures garbage collection impact

## Test Data Management

### Test Data Creation
- All test data uses `TEST_` prefixes
- Unique identifiers prevent conflicts
- Temporary admin users created as needed

### Test Data Cleanup
- Automatic cleanup after each test
- Foreign key constraints handled properly
- Failed cleanup logged but doesn't fail tests

### Data Isolation
- Each test creates its own data
- No dependencies between tests
- Tests can run in parallel safely

## Requirements Traceability

| Requirement | Test Coverage | Verification Method |
|-------------|---------------|-------------------|
| 1.1 - Bulk code creation with capacity limits | ✅ | API generation tests, validation tests |
| 2.1 - Users can access when capacity allows | ✅ | Authentication flow tests |
| 2.2 - Usage counter increments on login | ✅ | Database state verification |
| 2.3 - Capacity exceeded rejection | ✅ | Error handling tests |
| 2.4 - Atomic operations prevent race conditions | ✅ | Concurrent access tests |
| 4.1 - Automatic expiration and cleanup | ✅ | Expiration and cleanup tests |

## Troubleshooting

### Common Issues

#### Database Connection Errors
- Verify SUPABASE_SERVICE_ROLE_KEY is set
- Check NEXT_PUBLIC_SUPABASE_URL is correct
- Ensure database is accessible

#### Missing Database Functions
- Run database migrations
- Verify function definitions in Supabase
- Check function permissions

#### API Endpoint Errors
- Ensure Next.js application is running
- Verify API routes are deployed
- Check for TypeScript compilation errors

#### Test Timeouts
- Increase timeout values for slow databases
- Check for deadlocks in concurrent tests
- Verify cleanup is completing properly

### Debug Mode

Enable debug logging by setting environment variable:
```bash
DEBUG=bulk-code-tests node tests/bulk-code-integration-tests.js
```

### Manual Verification

For manual testing, use the Supabase SQL Editor to run:
```sql
-- Check bulk code state
SELECT id, code, usage_count, max_usage_count, expires_at, is_active 
FROM access_codes 
WHERE type = 'bulk' 
ORDER BY created_at DESC;

-- Check active sessions
SELECT s.id, s.code_id, s.is_active, s.last_activity, ac.code
FROM sessions s
JOIN access_codes ac ON s.code_id = ac.id
WHERE ac.type = 'bulk' AND s.is_active = true;
```

## Continuous Integration

### GitHub Actions Integration
```yaml
- name: Run Bulk Code Integration Tests
  run: npm run test:bulk-all
  env:
    NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
```

### Test Reporting
- Tests output JUnit-compatible XML
- Coverage reports generated automatically
- Performance metrics tracked over time

## Future Enhancements

### Load Testing
- Simulate hundreds of concurrent users
- Test database performance under load
- Verify scalability limits

### Chaos Testing
- Simulate database failures
- Test network interruptions
- Verify recovery mechanisms

### Security Testing
- Test for SQL injection vulnerabilities
- Verify access control enforcement
- Test for timing attacks

This comprehensive test suite ensures the bulk code functionality meets all requirements and performs reliably under various conditions.