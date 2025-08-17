/**
 * Error recovery mechanisms for bulk code operations
 * Implements retry logic, rollback procedures, and recovery strategies
 */

import { createServiceClient } from '@/lib/supabase/server'
import { BulkCodeError, BulkCodeErrorCode } from './bulk-code-errors'
import { BulkCodeLogger } from './bulk-code-logger'

export interface RecoveryContext {
  codeId: string
  sessionId?: string
  operation: string
  attemptCount: number
  maxAttempts: number
  backoffMs: number
  startTime: number
}

export interface RecoveryResult {
  success: boolean
  error?: BulkCodeError
  attemptCount: number
  totalDuration: number
  recoveryAction?: string
}

export class BulkCodeRecoveryManager {
  private static instance: BulkCodeRecoveryManager
  private logger: BulkCodeLogger
  private activeRecoveries: Map<string, RecoveryContext> = new Map()

  private constructor() {
    this.logger = BulkCodeLogger.getInstance()
  }

  static getInstance(): BulkCodeRecoveryManager {
    if (!BulkCodeRecoveryManager.instance) {
      BulkCodeRecoveryManager.instance = new BulkCodeRecoveryManager()
    }
    return BulkCodeRecoveryManager.instance
  }

  /**
   * Attempts to recover from a bulk code error with appropriate strategy
   */
  async attemptRecovery(error: BulkCodeError, context: Partial<RecoveryContext>): Promise<RecoveryResult> {
    const recoveryId = `${context.codeId}-${context.operation}-${Date.now()}`
    const recoveryContext: RecoveryContext = {
      codeId: context.codeId || '',
      sessionId: context.sessionId,
      operation: context.operation || 'unknown',
      attemptCount: 0,
      maxAttempts: this.getMaxAttemptsForError(error.code),
      backoffMs: this.getInitialBackoffForError(error.code),
      startTime: Date.now()
    }

    this.activeRecoveries.set(recoveryId, recoveryContext)

    try {
      const result = await this.executeRecoveryStrategy(error, recoveryContext)
      this.activeRecoveries.delete(recoveryId)
      return result
    } catch (recoveryError) {
      this.activeRecoveries.delete(recoveryId)
      this.logger.logBulkCodeError(
        error,
        'RECOVERY_FAILED',
        {
          codeId: recoveryContext.codeId,
          sessionId: recoveryContext.sessionId,
          duration: Date.now() - recoveryContext.startTime
        }
      )
      
      return {
        success: false,
        error: recoveryError as BulkCodeError,
        attemptCount: recoveryContext.attemptCount,
        totalDuration: Date.now() - recoveryContext.startTime
      }
    }
  }

  private async executeRecoveryStrategy(error: BulkCodeError, context: RecoveryContext): Promise<RecoveryResult> {
    switch (error.code) {
      case BulkCodeErrorCode.USAGE_INCREMENT_FAILED:
        return await this.recoverUsageIncrementFailure(error, context)
      
      case BulkCodeErrorCode.SESSION_CREATION_FAILED:
        return await this.recoverSessionCreationFailure(error, context)
      
      case BulkCodeErrorCode.CAPACITY_CHECK_FAILED:
        return await this.recoverCapacityCheckFailure(error, context)
      
      case BulkCodeErrorCode.CONCURRENT_ACCESS_CONFLICT:
        return await this.recoverConcurrentAccessConflict(error, context)
      
      case BulkCodeErrorCode.DATABASE_ERROR:
        return await this.recoverDatabaseError(error, context)
      
      default:
        return {
          success: false,
          error,
          attemptCount: 0,
          totalDuration: Date.now() - context.startTime,
          recoveryAction: 'no_recovery_strategy'
        }
    }
  }

  private async recoverUsageIncrementFailure(error: BulkCodeError, context: RecoveryContext): Promise<RecoveryResult> {
    const supabase = await createServiceClient()
    
    while (context.attemptCount < context.maxAttempts) {
      context.attemptCount++
      
      try {
        // Wait for backoff period
        if (context.attemptCount > 1) {
          await this.sleep(context.backoffMs * Math.pow(2, context.attemptCount - 2))
        }

        // Retry the usage increment operation
        const { data: incrementResult, error: incrementError } = await supabase
          .rpc('increment_bulk_code_usage', { p_code_id: context.codeId })

        if (incrementError) {
          this.logger.logBulkCodeError(
            error,
            'RECOVERY_ATTEMPT_FAILED',
            {
              codeId: context.codeId,
              details: { attemptCount: context.attemptCount, error: incrementError.message }
            }
          )
          continue
        }

        if (incrementResult) {
          this.logger.logUsageIncrement(context.codeId, 0, 1, true) // We don't have previous usage in recovery
          return {
            success: true,
            attemptCount: context.attemptCount,
            totalDuration: Date.now() - context.startTime,
            recoveryAction: 'usage_increment_retry_success'
          }
        } else {
          // Capacity was exceeded during retry
          return {
            success: false,
            error,
            attemptCount: context.attemptCount,
            totalDuration: Date.now() - context.startTime,
            recoveryAction: 'capacity_exceeded_during_retry'
          }
        }
      } catch (retryError) {
        this.logger.logBulkCodeError(
          error,
          'RECOVERY_RETRY_ERROR',
          {
            codeId: context.codeId,
            details: { attemptCount: context.attemptCount, retryError: (retryError as Error).message }
          }
        )
      }
    }

    return {
      success: false,
      error,
      attemptCount: context.attemptCount,
      totalDuration: Date.now() - context.startTime,
      recoveryAction: 'max_attempts_exceeded'
    }
  }

  private async recoverSessionCreationFailure(error: BulkCodeError, context: RecoveryContext): Promise<RecoveryResult> {
    const supabase = await createServiceClient()
    
    // First, attempt to rollback any usage increment that might have occurred
    try {
      await supabase.rpc('decrement_bulk_code_usage', { p_code_id: context.codeId })
      this.logger.logRollbackAttempt(context.codeId, 'session_creation_failure', true, 'usage_decremented')
    } catch (rollbackError) {
      this.logger.logRollbackAttempt(context.codeId, 'session_creation_failure', false, (rollbackError as Error).message)
    }

    // Then retry the entire operation (capacity check + increment + session creation)
    while (context.attemptCount < context.maxAttempts) {
      context.attemptCount++
      
      try {
        if (context.attemptCount > 1) {
          await this.sleep(context.backoffMs * Math.pow(2, context.attemptCount - 2))
        }

        // This would need to be called from the main authentication flow
        // For now, we just indicate that a retry should be attempted
        return {
          success: false,
          error,
          attemptCount: context.attemptCount,
          totalDuration: Date.now() - context.startTime,
          recoveryAction: 'retry_full_authentication_flow'
        }
      } catch (retryError) {
        this.logger.logBulkCodeError(
          error,
          'SESSION_RECOVERY_RETRY_ERROR',
          {
            codeId: context.codeId,
            sessionId: context.sessionId,
            details: { attemptCount: context.attemptCount, retryError: (retryError as Error).message }
          }
        )
      }
    }

    return {
      success: false,
      error,
      attemptCount: context.attemptCount,
      totalDuration: Date.now() - context.startTime,
      recoveryAction: 'session_creation_max_attempts_exceeded'
    }
  }

  private async recoverCapacityCheckFailure(error: BulkCodeError, context: RecoveryContext): Promise<RecoveryResult> {
    const supabase = await createServiceClient()
    
    while (context.attemptCount < context.maxAttempts) {
      context.attemptCount++
      
      try {
        if (context.attemptCount > 1) {
          await this.sleep(context.backoffMs * Math.pow(2, context.attemptCount - 2))
        }

        // Retry capacity check
        const { data: hasCapacity, error: capacityCheckError } = await supabase
          .rpc('check_bulk_code_capacity', { p_code_id: context.codeId })

        if (capacityCheckError) {
          this.logger.logBulkCodeError(
            error,
            'CAPACITY_CHECK_RECOVERY_FAILED',
            {
              codeId: context.codeId,
              details: { attemptCount: context.attemptCount, error: capacityCheckError.message }
            }
          )
          continue
        }

        // Get current usage for logging
        const { data: accessCode } = await supabase
          .from('access_codes')
          .select('usage_count, max_usage_count')
          .eq('id', context.codeId)
          .single()

        if (accessCode) {
          this.logger.logCapacityCheck(
            context.codeId,
            accessCode.usage_count || 0,
            accessCode.max_usage_count || 1,
            hasCapacity || false
          )
        }

        return {
          success: true,
          attemptCount: context.attemptCount,
          totalDuration: Date.now() - context.startTime,
          recoveryAction: 'capacity_check_retry_success'
        }
      } catch (retryError) {
        this.logger.logBulkCodeError(
          error,
          'CAPACITY_CHECK_RETRY_ERROR',
          {
            codeId: context.codeId,
            details: { attemptCount: context.attemptCount, retryError: (retryError as Error).message }
          }
        )
      }
    }

    return {
      success: false,
      error,
      attemptCount: context.attemptCount,
      totalDuration: Date.now() - context.startTime,
      recoveryAction: 'capacity_check_max_attempts_exceeded'
    }
  }

  private async recoverConcurrentAccessConflict(error: BulkCodeError, context: RecoveryContext): Promise<RecoveryResult> {
    // For concurrent access conflicts, we use a shorter backoff and more attempts
    const maxAttempts = 5
    const baseBackoffMs = 100 // Shorter backoff for concurrent access

    while (context.attemptCount < maxAttempts) {
      context.attemptCount++
      
      // Exponential backoff with jitter to reduce thundering herd
      const jitter = Math.random() * 0.1 * baseBackoffMs
      const backoff = baseBackoffMs * Math.pow(1.5, context.attemptCount - 1) + jitter
      
      await this.sleep(backoff)

      this.logger.logConcurrentAccessAttempt(
        context.codeId,
        context.attemptCount,
        error.details?.maxCapacity || 0
      )

      // Return success to indicate retry should be attempted
      // The actual retry logic is handled by the calling code
      return {
        success: true,
        attemptCount: context.attemptCount,
        totalDuration: Date.now() - context.startTime,
        recoveryAction: 'concurrent_access_backoff_complete'
      }
    }

    return {
      success: false,
      error,
      attemptCount: context.attemptCount,
      totalDuration: Date.now() - context.startTime,
      recoveryAction: 'concurrent_access_max_attempts_exceeded'
    }
  }

  private async recoverDatabaseError(error: BulkCodeError, context: RecoveryContext): Promise<RecoveryResult> {
    // For database errors, we use a longer backoff and fewer attempts
    const maxAttempts = 3
    const baseBackoffMs = 1000

    while (context.attemptCount < maxAttempts) {
      context.attemptCount++
      
      if (context.attemptCount > 1) {
        await this.sleep(baseBackoffMs * Math.pow(2, context.attemptCount - 2))
      }

      // Test database connectivity
      try {
        const supabase = await createServiceClient()
        const { error: testError } = await supabase
          .from('access_codes')
          .select('id')
          .limit(1)

        if (!testError) {
          return {
            success: true,
            attemptCount: context.attemptCount,
            totalDuration: Date.now() - context.startTime,
            recoveryAction: 'database_connectivity_restored'
          }
        }
      } catch (testError) {
        this.logger.logBulkCodeError(
          error,
          'DATABASE_RECOVERY_TEST_FAILED',
          {
            codeId: context.codeId,
            details: { attemptCount: context.attemptCount, testError: (testError as Error).message }
          }
        )
      }
    }

    return {
      success: false,
      error,
      attemptCount: context.attemptCount,
      totalDuration: Date.now() - context.startTime,
      recoveryAction: 'database_recovery_failed'
    }
  }

  private getMaxAttemptsForError(errorCode: BulkCodeErrorCode): number {
    switch (errorCode) {
      case BulkCodeErrorCode.CONCURRENT_ACCESS_CONFLICT:
        return 5 // More attempts for concurrent access
      case BulkCodeErrorCode.CAPACITY_CHECK_FAILED:
      case BulkCodeErrorCode.USAGE_INCREMENT_FAILED:
        return 3 // Standard retry count
      case BulkCodeErrorCode.SESSION_CREATION_FAILED:
        return 2 // Fewer attempts for session creation
      case BulkCodeErrorCode.DATABASE_ERROR:
        return 3 // Standard retry for database issues
      default:
        return 1 // Single attempt for other errors
    }
  }

  private getInitialBackoffForError(errorCode: BulkCodeErrorCode): number {
    switch (errorCode) {
      case BulkCodeErrorCode.CONCURRENT_ACCESS_CONFLICT:
        return 100 // Short backoff for concurrent access
      case BulkCodeErrorCode.CAPACITY_CHECK_FAILED:
      case BulkCodeErrorCode.USAGE_INCREMENT_FAILED:
        return 500 // Medium backoff
      case BulkCodeErrorCode.SESSION_CREATION_FAILED:
        return 1000 // Longer backoff for session creation
      case BulkCodeErrorCode.DATABASE_ERROR:
        return 1000 // Longer backoff for database issues
      default:
        return 500 // Default backoff
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Utility methods for monitoring active recoveries
  getActiveRecoveries(): RecoveryContext[] {
    return Array.from(this.activeRecoveries.values())
  }

  getRecoveryStats(): { total: number; byOperation: Record<string, number> } {
    const recoveries = this.getActiveRecoveries()
    const byOperation: Record<string, number> = {}
    
    recoveries.forEach(recovery => {
      byOperation[recovery.operation] = (byOperation[recovery.operation] || 0) + 1
    })

    return {
      total: recoveries.length,
      byOperation
    }
  }
}