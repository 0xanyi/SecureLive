/**
 * Comprehensive error handling for bulk access codes
 * Implements specific error types, user-friendly messages, and recovery mechanisms
 */

// Error codes for bulk code operations
export enum BulkCodeErrorCode {
  CAPACITY_EXCEEDED = 'BULK_CODE_CAPACITY_EXCEEDED',
  EXPIRED = 'BULK_CODE_EXPIRED',
  INVALID = 'BULK_CODE_INVALID',
  CAPACITY_CHECK_FAILED = 'BULK_CODE_CAPACITY_CHECK_FAILED',
  USAGE_INCREMENT_FAILED = 'BULK_CODE_USAGE_INCREMENT_FAILED',
  SESSION_CREATION_FAILED = 'BULK_CODE_SESSION_CREATION_FAILED',
  ROLLBACK_FAILED = 'BULK_CODE_ROLLBACK_FAILED',
  CONCURRENT_ACCESS_CONFLICT = 'BULK_CODE_CONCURRENT_ACCESS_CONFLICT',
  DATABASE_ERROR = 'BULK_CODE_DATABASE_ERROR'
}

// Base error class for bulk code operations
export class BulkCodeError extends Error {
  public readonly code: BulkCodeErrorCode
  public readonly statusCode: number
  public readonly userMessage: string
  public readonly details?: Record<string, any>
  public readonly timestamp: string
  public readonly recoverable: boolean

  constructor(
    code: BulkCodeErrorCode,
    message: string,
    userMessage: string,
    statusCode: number = 500,
    details?: Record<string, any>,
    recoverable: boolean = false
  ) {
    super(message)
    this.name = 'BulkCodeError'
    this.code = code
    this.statusCode = statusCode
    this.userMessage = userMessage
    this.details = details
    this.timestamp = new Date().toISOString()
    this.recoverable = recoverable
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      userMessage: this.userMessage,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
      recoverable: this.recoverable
    }
  }
}

// Specific error classes for different bulk code scenarios
export class BulkCodeCapacityExceededError extends BulkCodeError {
  constructor(currentUsage: number, maxCapacity: number, codeId?: string) {
    const userMessage = `This access code has reached its maximum capacity of ${maxCapacity} users. Currently ${currentUsage} users have accessed with this code.`
    const details = { currentUsage, maxCapacity, codeId }
    
    super(
      BulkCodeErrorCode.CAPACITY_EXCEEDED,
      `Bulk code capacity exceeded: ${currentUsage}/${maxCapacity}`,
      userMessage,
      403,
      details,
      false // Not recoverable - user needs different code
    )
  }
}

export class BulkCodeExpiredError extends BulkCodeError {
  constructor(expirationDate: string, codeId?: string) {
    const expiredDate = new Date(expirationDate).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
    
    const userMessage = `This access code expired on ${expiredDate}. Please contact the administrator for a new code.`
    const details = { expirationDate, codeId }
    
    super(
      BulkCodeErrorCode.EXPIRED,
      `Bulk code expired at ${expirationDate}`,
      userMessage,
      401,
      details,
      false // Not recoverable - code is expired
    )
  }
}

export class BulkCodeInvalidError extends BulkCodeError {
  constructor(code: string) {
    const userMessage = 'Invalid or inactive access code. Please check your code and try again.'
    const details = { code: code.substring(0, 3) + '***' } // Partial code for logging
    
    super(
      BulkCodeErrorCode.INVALID,
      `Invalid bulk code: ${code}`,
      userMessage,
      401,
      details,
      true // Recoverable - user can try different code
    )
  }
}

export class BulkCodeCapacityCheckFailedError extends BulkCodeError {
  constructor(codeId: string, originalError?: any) {
    const userMessage = 'Unable to validate access code capacity. Please try again in a moment.'
    const details = { codeId, originalError: originalError?.message }
    
    super(
      BulkCodeErrorCode.CAPACITY_CHECK_FAILED,
      `Failed to check bulk code capacity for ${codeId}`,
      userMessage,
      500,
      details,
      true // Recoverable - temporary issue
    )
  }
}

export class BulkCodeUsageIncrementFailedError extends BulkCodeError {
  constructor(codeId: string, originalError?: any) {
    const userMessage = 'Unable to process your access request. Please try again.'
    const details = { codeId, originalError: originalError?.message }
    
    super(
      BulkCodeErrorCode.USAGE_INCREMENT_FAILED,
      `Failed to increment usage for bulk code ${codeId}`,
      userMessage,
      500,
      details,
      true // Recoverable - can retry
    )
  }
}

export class BulkCodeSessionCreationFailedError extends BulkCodeError {
  constructor(codeId: string, originalError?: any) {
    const userMessage = 'Unable to create your session. Please try again.'
    const details = { codeId, originalError: originalError?.message }
    
    super(
      BulkCodeErrorCode.SESSION_CREATION_FAILED,
      `Failed to create session for bulk code ${codeId}`,
      userMessage,
      500,
      details,
      true // Recoverable - can retry
    )
  }
}

export class BulkCodeRollbackFailedError extends BulkCodeError {
  constructor(codeId: string, originalError?: any) {
    const userMessage = 'A system error occurred. Please contact support if this persists.'
    const details = { codeId, originalError: originalError?.message }
    
    super(
      BulkCodeErrorCode.ROLLBACK_FAILED,
      `Failed to rollback usage increment for bulk code ${codeId}`,
      userMessage,
      500,
      details,
      false // Not recoverable - requires manual intervention
    )
  }
}

export class BulkCodeConcurrentAccessConflictError extends BulkCodeError {
  constructor(codeId: string, attemptedUsage: number, maxCapacity: number) {
    const userMessage = 'This access code is currently at capacity due to high demand. Please try again in a moment.'
    const details = { codeId, attemptedUsage, maxCapacity }
    
    super(
      BulkCodeErrorCode.CONCURRENT_ACCESS_CONFLICT,
      `Concurrent access conflict for bulk code ${codeId}`,
      userMessage,
      409,
      details,
      true // Recoverable - user can retry
    )
  }
}

export class BulkCodeDatabaseError extends BulkCodeError {
  constructor(operation: string, codeId?: string, originalError?: any) {
    const userMessage = 'A temporary system error occurred. Please try again in a moment.'
    const details = { operation, codeId, originalError: originalError?.message }
    
    super(
      BulkCodeErrorCode.DATABASE_ERROR,
      `Database error during ${operation}`,
      userMessage,
      500,
      details,
      true // Recoverable - temporary database issue
    )
  }
}

// Error factory for creating appropriate error instances
export class BulkCodeErrorFactory {
  static createCapacityExceededError(currentUsage: number, maxCapacity: number, codeId?: string): BulkCodeCapacityExceededError {
    return new BulkCodeCapacityExceededError(currentUsage, maxCapacity, codeId)
  }

  static createExpiredError(expirationDate: string, codeId?: string): BulkCodeExpiredError {
    return new BulkCodeExpiredError(expirationDate, codeId)
  }

  static createInvalidError(code: string): BulkCodeInvalidError {
    return new BulkCodeInvalidError(code)
  }

  static createCapacityCheckFailedError(codeId: string, originalError?: any): BulkCodeCapacityCheckFailedError {
    return new BulkCodeCapacityCheckFailedError(codeId, originalError)
  }

  static createUsageIncrementFailedError(codeId: string, originalError?: any): BulkCodeUsageIncrementFailedError {
    return new BulkCodeUsageIncrementFailedError(codeId, originalError)
  }

  static createSessionCreationFailedError(codeId: string, originalError?: any): BulkCodeSessionCreationFailedError {
    return new BulkCodeSessionCreationFailedError(codeId, originalError)
  }

  static createRollbackFailedError(codeId: string, originalError?: any): BulkCodeRollbackFailedError {
    return new BulkCodeRollbackFailedError(codeId, originalError)
  }

  static createConcurrentAccessConflictError(codeId: string, attemptedUsage: number, maxCapacity: number): BulkCodeConcurrentAccessConflictError {
    return new BulkCodeConcurrentAccessConflictError(codeId, attemptedUsage, maxCapacity)
  }

  static createDatabaseError(operation: string, codeId?: string, originalError?: any): BulkCodeDatabaseError {
    return new BulkCodeDatabaseError(operation, codeId, originalError)
  }
}

// Error recovery strategies
export interface ErrorRecoveryStrategy {
  canRecover(error: BulkCodeError): boolean
  recover(error: BulkCodeError): Promise<boolean>
}

export class BulkCodeErrorRecovery implements ErrorRecoveryStrategy {
  canRecover(error: BulkCodeError): boolean {
    return error.recoverable
  }

  async recover(error: BulkCodeError): Promise<boolean> {
    // Log recovery attempt
    console.log(`Attempting recovery for error: ${error.code}`, {
      errorId: error.timestamp,
      details: error.details
    })

    switch (error.code) {
      case BulkCodeErrorCode.CAPACITY_CHECK_FAILED:
      case BulkCodeErrorCode.USAGE_INCREMENT_FAILED:
      case BulkCodeErrorCode.SESSION_CREATION_FAILED:
      case BulkCodeErrorCode.DATABASE_ERROR:
        // For temporary errors, suggest retry with exponential backoff
        return true

      case BulkCodeErrorCode.CONCURRENT_ACCESS_CONFLICT:
        // For concurrent access conflicts, suggest immediate retry
        return true

      case BulkCodeErrorCode.INVALID:
        // For invalid codes, user can try a different code
        return true

      default:
        // Non-recoverable errors
        return false
    }
  }
}