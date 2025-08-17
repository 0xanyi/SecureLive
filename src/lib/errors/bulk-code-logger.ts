/**
 * Logging system for bulk code errors and operations
 * Provides structured logging with different severity levels
 */

import { BulkCodeError, BulkCodeErrorCode } from './bulk-code-errors'

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export interface BulkCodeLogEntry {
  timestamp: string
  level: LogLevel
  operation: string
  codeId?: string
  userId?: string
  sessionId?: string
  ipAddress?: string
  userAgent?: string
  error?: BulkCodeError
  details?: Record<string, any>
  duration?: number
}

export class BulkCodeLogger {
  private static instance: BulkCodeLogger
  private logs: BulkCodeLogEntry[] = []
  private maxLogs: number = 1000

  private constructor() {}

  static getInstance(): BulkCodeLogger {
    if (!BulkCodeLogger.instance) {
      BulkCodeLogger.instance = new BulkCodeLogger()
    }
    return BulkCodeLogger.instance
  }

  private createLogEntry(
    level: LogLevel,
    operation: string,
    details?: Partial<BulkCodeLogEntry>
  ): BulkCodeLogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      operation,
      ...details
    }
  }

  private addLog(entry: BulkCodeLogEntry): void {
    this.logs.push(entry)
    
    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    // Console logging based on level
    const logMessage = this.formatLogMessage(entry)
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(logMessage)
        break
      case LogLevel.INFO:
        console.info(logMessage)
        break
      case LogLevel.WARN:
        console.warn(logMessage)
        break
      case LogLevel.ERROR:
        console.error(logMessage)
        break
      case LogLevel.CRITICAL:
        console.error('🚨 CRITICAL:', logMessage)
        break
    }
  }

  private formatLogMessage(entry: BulkCodeLogEntry): string {
    const parts = [
      `[${entry.timestamp}]`,
      `[${entry.level.toUpperCase()}]`,
      `[${entry.operation}]`
    ]

    if (entry.codeId) {
      parts.push(`CodeID: ${entry.codeId}`)
    }

    if (entry.sessionId) {
      parts.push(`SessionID: ${entry.sessionId}`)
    }

    if (entry.error) {
      parts.push(`Error: ${entry.error.code} - ${entry.error.message}`)
    }

    if (entry.duration) {
      parts.push(`Duration: ${entry.duration}ms`)
    }

    return parts.join(' ')
  }

  // Public logging methods
  logBulkCodeAccess(codeId: string, sessionId: string, ipAddress?: string, userAgent?: string): void {
    this.addLog(this.createLogEntry(LogLevel.INFO, 'BULK_CODE_ACCESS', {
      codeId,
      sessionId,
      ipAddress,
      userAgent,
      details: { action: 'successful_access' }
    }))
  }

  logBulkCodeError(error: BulkCodeError, operation: string, context?: {
    codeId?: string
    sessionId?: string
    ipAddress?: string
    userAgent?: string
    duration?: number
  }): void {
    const level = this.getErrorLogLevel(error.code)
    
    this.addLog(this.createLogEntry(level, operation, {
      ...context,
      error,
      details: {
        errorCode: error.code,
        statusCode: error.statusCode,
        recoverable: error.recoverable,
        ...error.details
      }
    }))
  }

  logCapacityCheck(codeId: string, currentUsage: number, maxCapacity: number, result: boolean): void {
    this.addLog(this.createLogEntry(LogLevel.DEBUG, 'CAPACITY_CHECK', {
      codeId,
      details: {
        currentUsage,
        maxCapacity,
        capacityPercentage: Math.round((currentUsage / maxCapacity) * 100),
        result,
        remainingCapacity: maxCapacity - currentUsage
      }
    }))
  }

  logUsageIncrement(codeId: string, previousUsage: number, newUsage: number, success: boolean): void {
    const level = success ? LogLevel.INFO : LogLevel.ERROR
    
    this.addLog(this.createLogEntry(level, 'USAGE_INCREMENT', {
      codeId,
      details: {
        previousUsage,
        newUsage,
        increment: newUsage - previousUsage,
        success
      }
    }))
  }

  logUsageDecrement(codeId: string, previousUsage: number, newUsage: number, reason: string): void {
    this.addLog(this.createLogEntry(LogLevel.INFO, 'USAGE_DECREMENT', {
      codeId,
      details: {
        previousUsage,
        newUsage,
        decrement: previousUsage - newUsage,
        reason
      }
    }))
  }

  logSessionCreation(codeId: string, sessionId: string, success: boolean, duration?: number): void {
    const level = success ? LogLevel.INFO : LogLevel.ERROR
    
    this.addLog(this.createLogEntry(level, 'SESSION_CREATION', {
      codeId,
      sessionId,
      duration,
      details: { success }
    }))
  }

  logRollbackAttempt(codeId: string, operation: string, success: boolean, reason: string): void {
    const level = success ? LogLevel.WARN : LogLevel.CRITICAL
    
    this.addLog(this.createLogEntry(level, 'ROLLBACK_ATTEMPT', {
      codeId,
      details: {
        operation,
        success,
        reason
      }
    }))
  }

  logConcurrentAccessAttempt(codeId: string, attemptCount: number, maxCapacity: number): void {
    this.addLog(this.createLogEntry(LogLevel.WARN, 'CONCURRENT_ACCESS_ATTEMPT', {
      codeId,
      details: {
        attemptCount,
        maxCapacity,
        isNearCapacity: attemptCount >= maxCapacity * 0.8
      }
    }))
  }

  logBulkCodeExpiration(codeId: string, expirationDate: string, activeSessionsCount: number): void {
    this.addLog(this.createLogEntry(LogLevel.INFO, 'BULK_CODE_EXPIRATION', {
      codeId,
      details: {
        expirationDate,
        activeSessionsCount,
        requiresSessionCleanup: activeSessionsCount > 0
      }
    }))
  }

  private getErrorLogLevel(errorCode: BulkCodeErrorCode): LogLevel {
    switch (errorCode) {
      case BulkCodeErrorCode.CAPACITY_EXCEEDED:
      case BulkCodeErrorCode.EXPIRED:
      case BulkCodeErrorCode.INVALID:
        return LogLevel.WARN // Expected user errors

      case BulkCodeErrorCode.CONCURRENT_ACCESS_CONFLICT:
        return LogLevel.WARN // High load scenario

      case BulkCodeErrorCode.CAPACITY_CHECK_FAILED:
      case BulkCodeErrorCode.USAGE_INCREMENT_FAILED:
      case BulkCodeErrorCode.SESSION_CREATION_FAILED:
      case BulkCodeErrorCode.DATABASE_ERROR:
        return LogLevel.ERROR // System errors

      case BulkCodeErrorCode.ROLLBACK_FAILED:
        return LogLevel.CRITICAL // Data consistency issues

      default:
        return LogLevel.ERROR
    }
  }

  // Query methods for monitoring and analytics
  getRecentErrors(minutes: number = 60): BulkCodeLogEntry[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000).toISOString()
    return this.logs.filter(log => 
      log.timestamp >= cutoff && 
      (log.level === LogLevel.ERROR || log.level === LogLevel.CRITICAL)
    )
  }

  getErrorsByCode(errorCode: BulkCodeErrorCode, hours: number = 24): BulkCodeLogEntry[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
    return this.logs.filter(log => 
      log.timestamp >= cutoff && 
      log.error?.code === errorCode
    )
  }

  getBulkCodeActivity(codeId: string, hours: number = 24): BulkCodeLogEntry[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
    return this.logs.filter(log => 
      log.timestamp >= cutoff && 
      log.codeId === codeId
    )
  }

  getErrorStats(hours: number = 24): Record<string, number> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
    const errorLogs = this.logs.filter(log => 
      log.timestamp >= cutoff && 
      log.error
    )

    const stats: Record<string, number> = {}
    errorLogs.forEach(log => {
      if (log.error) {
        stats[log.error.code] = (stats[log.error.code] || 0) + 1
      }
    })

    return stats
  }

  // Clear logs (for testing or maintenance)
  clearLogs(): void {
    this.logs = []
  }

  // Export logs for external analysis
  exportLogs(hours: number = 24): BulkCodeLogEntry[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
    return this.logs.filter(log => log.timestamp >= cutoff)
  }
}