/**
 * Test suite for bulk code error handling implementation
 * Tests error types, logging, recovery mechanisms, and user-friendly messages
 */

const { BulkCodeErrorFactory, BulkCodeErrorCode } = require('../src/lib/errors/bulk-code-errors')
const { BulkCodeLogger } = require('../src/lib/errors/bulk-code-logger')
const { BulkCodeRecoveryManager } = require('../src/lib/errors/bulk-code-recovery')

// Mock console methods for testing
const originalConsole = { ...console }
const mockConsole = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}

describe('Bulk Code Error Handling', () => {
  beforeEach(() => {
    // Replace console methods with mocks
    Object.assign(console, mockConsole)
    
    // Clear all mocks
    Object.values(mockConsole).forEach(mock => mock.mockClear())
    
    // Clear logger instance
    const logger = BulkCodeLogger.getInstance()
    logger.clearLogs()
  })

  afterAll(() => {
    // Restore original console
    Object.assign(console, originalConsole)
  })

  describe('Error Types and Factory', () => {
    test('should create capacity exceeded error with correct properties', () => {
      const error = BulkCodeErrorFactory.createCapacityExceededError(100, 100, 'test-code-id')
      
      expect(error.code).toBe(BulkCodeErrorCode.CAPACITY_EXCEEDED)
      expect(error.statusCode).toBe(403)
      expect(error.recoverable).toBe(false)
      expect(error.userMessage).toContain('maximum capacity of 100 users')
      expect(error.userMessage).toContain('Currently 100 users have accessed')
      expect(error.details).toEqual({
        currentUsage: 100,
        maxCapacity: 100,
        codeId: 'test-code-id'
      })
    })

    test('should create expired error with formatted date', () => {
      const expirationDate = '2024-01-15T10:30:00Z'
      const error = BulkCodeErrorFactory.createExpiredError(expirationDate, 'test-code-id')
      
      expect(error.code).toBe(BulkCodeErrorCode.EXPIRED)
      expect(error.statusCode).toBe(401)
      expect(error.recoverable).toBe(false)
      expect(error.userMessage).toContain('expired on')
      expect(error.userMessage).toContain('contact the administrator')
    })

    test('should create invalid error with partial code for security', () => {
      const error = BulkCodeErrorFactory.createInvalidError('TESTCODE123')
      
      expect(error.code).toBe(BulkCodeErrorCode.INVALID)
      expect(error.statusCode).toBe(401)
      expect(error.recoverable).toBe(true)
      expect(error.details.code).toBe('TES***') // Partial code for logging
    })

    test('should create concurrent access conflict error', () => {
      const error = BulkCodeErrorFactory.createConcurrentAccessConflictError('test-code-id', 101, 100)
      
      expect(error.code).toBe(BulkCodeErrorCode.CONCURRENT_ACCESS_CONFLICT)
      expect(error.statusCode).toBe(409)
      expect(error.recoverable).toBe(true)
      expect(error.userMessage).toContain('high demand')
      expect(error.userMessage).toContain('try again in a moment')
    })

    test('should create rollback failed error as critical', () => {
      const error = BulkCodeErrorFactory.createRollbackFailedError('test-code-id', new Error('DB connection lost'))
      
      expect(error.code).toBe(BulkCodeErrorCode.ROLLBACK_FAILED)
      expect(error.statusCode).toBe(500)
      expect(error.recoverable).toBe(false)
      expect(error.userMessage).toContain('contact support')
    })
  })

  describe('Error Logging', () => {
    test('should log bulk code access successfully', () => {
      const logger = BulkCodeLogger.getInstance()
      
      logger.logBulkCodeAccess('test-code-id', 'test-session-id', '192.168.1.1', 'Mozilla/5.0')
      
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]')
      )
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('BULK_CODE_ACCESS')
      )
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('CodeID: test-code-id')
      )
    })

    test('should log capacity check with usage details', () => {
      const logger = BulkCodeLogger.getInstance()
      
      logger.logCapacityCheck('test-code-id', 75, 100, true)
      
      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG]')
      )
      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringContaining('CAPACITY_CHECK')
      )
    })

    test('should log usage increment with before/after values', () => {
      const logger = BulkCodeLogger.getInstance()
      
      logger.logUsageIncrement('test-code-id', 50, 51, true)
      
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]')
      )
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('USAGE_INCREMENT')
      )
    })

    test('should log rollback attempts with appropriate severity', () => {
      const logger = BulkCodeLogger.getInstance()
      
      // Successful rollback should be WARN level
      logger.logRollbackAttempt('test-code-id', 'session_creation_failure', true, 'usage_decremented')
      expect(mockConsole.warn).toHaveBeenCalled()
      
      // Failed rollback should be CRITICAL level
      logger.logRollbackAttempt('test-code-id', 'session_creation_failure', false, 'database_error')
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('🚨 CRITICAL:')
      )
    })

    test('should categorize error log levels correctly', () => {
      const logger = BulkCodeLogger.getInstance()
      
      // User errors should be WARN
      const capacityError = BulkCodeErrorFactory.createCapacityExceededError(100, 100)
      logger.logBulkCodeError(capacityError, 'TEST_OPERATION')
      expect(mockConsole.warn).toHaveBeenCalled()
      
      // System errors should be ERROR
      const dbError = BulkCodeErrorFactory.createDatabaseError('test_operation')
      logger.logBulkCodeError(dbError, 'TEST_OPERATION')
      expect(mockConsole.error).toHaveBeenCalled()
      
      // Rollback failures should be CRITICAL
      const rollbackError = BulkCodeErrorFactory.createRollbackFailedError('test-code-id')
      logger.logBulkCodeError(rollbackError, 'TEST_OPERATION')
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('🚨 CRITICAL:')
      )
    })
  })

  describe('Error Recovery', () => {
    test('should determine correct max attempts for different error types', () => {
      const recoveryManager = BulkCodeRecoveryManager.getInstance()
      
      // Concurrent access should have more attempts
      const concurrentError = BulkCodeErrorFactory.createConcurrentAccessConflictError('test-code-id', 101, 100)
      expect(recoveryManager.getMaxAttemptsForError(concurrentError.code)).toBe(5)
      
      // Session creation should have fewer attempts
      const sessionError = BulkCodeErrorFactory.createSessionCreationFailedError('test-code-id')
      expect(recoveryManager.getMaxAttemptsForError(sessionError.code)).toBe(2)
      
      // Non-recoverable errors should have single attempt
      const capacityError = BulkCodeErrorFactory.createCapacityExceededError(100, 100)
      expect(recoveryManager.getMaxAttemptsForError(capacityError.code)).toBe(1)
    })

    test('should calculate appropriate backoff times', () => {
      const recoveryManager = BulkCodeRecoveryManager.getInstance()
      
      // Concurrent access should have short backoff
      const concurrentError = BulkCodeErrorFactory.createConcurrentAccessConflictError('test-code-id', 101, 100)
      expect(recoveryManager.getInitialBackoffForError(concurrentError.code)).toBe(100)
      
      // Database errors should have longer backoff
      const dbError = BulkCodeErrorFactory.createDatabaseError('test_operation')
      expect(recoveryManager.getInitialBackoffForError(dbError.code)).toBe(1000)
    })

    test('should track active recoveries', () => {
      const recoveryManager = BulkCodeRecoveryManager.getInstance()
      
      // Initially no active recoveries
      expect(recoveryManager.getActiveRecoveries()).toHaveLength(0)
      
      const stats = recoveryManager.getRecoveryStats()
      expect(stats.total).toBe(0)
      expect(stats.byOperation).toEqual({})
    })
  })

  describe('Error Query and Analytics', () => {
    test('should query recent errors by time range', () => {
      const logger = BulkCodeLogger.getInstance()
      
      // Log some errors
      const error1 = BulkCodeErrorFactory.createCapacityExceededError(100, 100)
      const error2 = BulkCodeErrorFactory.createExpiredError('2024-01-15T10:30:00Z')
      
      logger.logBulkCodeError(error1, 'TEST_OPERATION_1')
      logger.logBulkCodeError(error2, 'TEST_OPERATION_2')
      
      const recentErrors = logger.getRecentErrors(60) // Last 60 minutes
      expect(recentErrors).toHaveLength(2)
    })

    test('should query errors by specific error code', () => {
      const logger = BulkCodeLogger.getInstance()
      
      // Log different types of errors
      const capacityError = BulkCodeErrorFactory.createCapacityExceededError(100, 100)
      const expiredError = BulkCodeErrorFactory.createExpiredError('2024-01-15T10:30:00Z')
      
      logger.logBulkCodeError(capacityError, 'TEST_OPERATION_1')
      logger.logBulkCodeError(expiredError, 'TEST_OPERATION_2')
      
      const capacityErrors = logger.getErrorsByCode(BulkCodeErrorCode.CAPACITY_EXCEEDED, 24)
      expect(capacityErrors).toHaveLength(1)
      expect(capacityErrors[0].error.code).toBe(BulkCodeErrorCode.CAPACITY_EXCEEDED)
    })

    test('should generate error statistics', () => {
      const logger = BulkCodeLogger.getInstance()
      
      // Log multiple errors of different types
      const capacityError = BulkCodeErrorFactory.createCapacityExceededError(100, 100)
      const expiredError = BulkCodeErrorFactory.createExpiredError('2024-01-15T10:30:00Z')
      
      logger.logBulkCodeError(capacityError, 'TEST_OPERATION_1')
      logger.logBulkCodeError(capacityError, 'TEST_OPERATION_2') // Same type
      logger.logBulkCodeError(expiredError, 'TEST_OPERATION_3')
      
      const stats = logger.getErrorStats(24)
      expect(stats[BulkCodeErrorCode.CAPACITY_EXCEEDED]).toBe(2)
      expect(stats[BulkCodeErrorCode.EXPIRED]).toBe(1)
    })

    test('should track bulk code activity for specific codes', () => {
      const logger = BulkCodeLogger.getInstance()
      
      const codeId = 'test-code-123'
      
      // Log various activities for this code
      logger.logBulkCodeAccess(codeId, 'session-1', '192.168.1.1')
      logger.logCapacityCheck(codeId, 50, 100, true)
      logger.logUsageIncrement(codeId, 50, 51, true)
      
      const activity = logger.getBulkCodeActivity(codeId, 24)
      expect(activity).toHaveLength(3)
      expect(activity.every(log => log.codeId === codeId)).toBe(true)
    })
  })

  describe('Error Message User-Friendliness', () => {
    test('should provide helpful messages for capacity exceeded errors', () => {
      const error = BulkCodeErrorFactory.createCapacityExceededError(150, 150, 'test-code-id')
      
      expect(error.userMessage).toContain('maximum capacity of 150 users')
      expect(error.userMessage).toContain('Currently 150 users have accessed')
      expect(error.userMessage).not.toContain('test-code-id') // No technical details
    })

    test('should provide clear expiration messages with formatted dates', () => {
      const error = BulkCodeErrorFactory.createExpiredError('2024-01-15T10:30:00Z', 'test-code-id')
      
      expect(error.userMessage).toContain('expired on')
      expect(error.userMessage).toContain('contact the administrator')
      expect(error.userMessage).not.toContain('2024-01-15T10:30:00Z') // No raw ISO date
    })

    test('should provide actionable messages for temporary errors', () => {
      const error = BulkCodeErrorFactory.createConcurrentAccessConflictError('test-code-id', 101, 100)
      
      expect(error.userMessage).toContain('high demand')
      expect(error.userMessage).toContain('try again in a moment')
      expect(error.recoverable).toBe(true)
    })

    test('should provide appropriate messages for system errors', () => {
      const error = BulkCodeErrorFactory.createDatabaseError('capacity_check', 'test-code-id')
      
      expect(error.userMessage).toContain('temporary system error')
      expect(error.userMessage).toContain('try again in a moment')
      expect(error.userMessage).not.toContain('database') // No technical jargon
      expect(error.recoverable).toBe(true)
    })

    test('should provide support contact for critical errors', () => {
      const error = BulkCodeErrorFactory.createRollbackFailedError('test-code-id')
      
      expect(error.userMessage).toContain('contact support')
      expect(error.recoverable).toBe(false)
    })
  })

  describe('Error Serialization', () => {
    test('should serialize errors to JSON correctly', () => {
      const error = BulkCodeErrorFactory.createCapacityExceededError(100, 100, 'test-code-id')
      const json = error.toJSON()
      
      expect(json).toHaveProperty('name', 'BulkCodeError')
      expect(json).toHaveProperty('code', BulkCodeErrorCode.CAPACITY_EXCEEDED)
      expect(json).toHaveProperty('statusCode', 403)
      expect(json).toHaveProperty('recoverable', false)
      expect(json).toHaveProperty('timestamp')
      expect(json).toHaveProperty('details')
    })
  })
})

// Integration test for the complete error handling flow
describe('Error Handling Integration', () => {
  test('should handle complete error flow with logging and recovery', async () => {
    const logger = BulkCodeLogger.getInstance()
    const recoveryManager = BulkCodeRecoveryManager.getInstance()
    
    // Simulate a capacity exceeded error
    const error = BulkCodeErrorFactory.createCapacityExceededError(100, 100, 'test-code-id')
    
    // Log the error
    logger.logBulkCodeError(error, 'CAPACITY_CHECK', {
      codeId: 'test-code-id',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0'
    })
    
    // Attempt recovery (should fail for capacity exceeded)
    const recoveryResult = await recoveryManager.attemptRecovery(error, {
      codeId: 'test-code-id',
      operation: 'capacity_check'
    })
    
    expect(recoveryResult.success).toBe(false)
    expect(recoveryResult.recoveryAction).toBe('no_recovery_strategy')
    
    // Verify error was logged
    const recentErrors = logger.getRecentErrors(60)
    expect(recentErrors).toHaveLength(1)
    expect(recentErrors[0].error.code).toBe(BulkCodeErrorCode.CAPACITY_EXCEEDED)
  })
})

console.log('Bulk code error handling tests completed')