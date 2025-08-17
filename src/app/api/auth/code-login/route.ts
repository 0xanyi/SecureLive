import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createSession } from '@/lib/auth/session'
import { generateSessionToken, getClientIP, getUserAgent } from '@/lib/utils'
import type { ApiResponse } from '@/types/database'
import { 
  BulkCodeError, 
  BulkCodeErrorFactory,
  BulkCodeErrorCode 
} from '@/lib/errors/bulk-code-errors'
import { BulkCodeLogger } from '@/lib/errors/bulk-code-logger'
import { BulkCodeRecoveryManager } from '@/lib/errors/bulk-code-recovery'
import { BulkCodeCache } from '@/lib/cache/bulk-code-cache'
import { BulkCodePerformanceMonitor } from '@/lib/monitoring/bulk-code-performance'

export async function POST(request: NextRequest) {
  const logger = BulkCodeLogger.getInstance()
  const recoveryManager = BulkCodeRecoveryManager.getInstance()
  const cache = BulkCodeCache.getInstance()
  const performanceMonitor = BulkCodePerformanceMonitor.getInstance()
  const clientIP = getClientIP(request)
  const userAgent = getUserAgent(request)
  const startTime = Date.now()

  // Start performance monitoring
  const operationId = performanceMonitor.startOperation('code_login')

  try {
    const { code } = await request.json()

    if (!code || typeof code !== 'string') {
      performanceMonitor.endOperation(operationId, 'code_login', startTime, false, undefined, { error: 'missing_code' })
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Access code is required' },
        { status: 400 }
      )
    }

    const supabase = await createServiceClient()
    let accessCode: any = null

    // Try to get from cache first for bulk codes
    const cachedCode = cache.getBulkCode(code)
    if (cachedCode) {
      // Use cached data for initial validation
      accessCode = {
        id: cachedCode.id,
        code: cachedCode.code,
        type: cachedCode.type,
        name: cachedCode.name,
        usage_count: cachedCode.usage_count,
        max_usage_count: cachedCode.max_usage_count,
        is_active: cachedCode.is_active,
        expires_at: cachedCode.expires_at,
        created_at: cachedCode.created_at
      }

      // Quick capacity pre-check using cache
      if (cache.isLikelyAtCapacity(cachedCode.id)) {
        const error = BulkCodeErrorFactory.createCapacityExceededError(
          cachedCode.usage_count, 
          cachedCode.max_usage_count, 
          cachedCode.id
        )
        logger.logBulkCodeError(error, 'CAPACITY_EXCEEDED_CACHE_CHECK', {
          codeId: cachedCode.id,
          ipAddress: clientIP,
          userAgent,
          duration: Date.now() - startTime
        })
        
        performanceMonitor.endOperation(operationId, 'code_login', startTime, false, cachedCode.id, { 
          error: 'capacity_exceeded',
          cache_hit: true 
        })
        
        return NextResponse.json<ApiResponse>(
          { success: false, error: error.userMessage },
          { status: error.statusCode }
        )
      }
    } else {
      // Cache miss - fetch from database
      const dbLookupStart = Date.now()
      const { data: dbAccessCode, error: codeError } = await supabase
        .from('access_codes')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .single()

      performanceMonitor.recordMetric('db_code_lookup', Date.now() - dbLookupStart, !codeError)

      if (codeError || !dbAccessCode) {
        const error = BulkCodeErrorFactory.createInvalidError(code)
        logger.logBulkCodeError(error, 'CODE_LOOKUP_FAILED', {
          ipAddress: clientIP,
          userAgent,
          duration: Date.now() - startTime
        })
        
        performanceMonitor.endOperation(operationId, 'code_login', startTime, false, undefined, { 
          error: 'invalid_code',
          cache_hit: false 
        })
        
        return NextResponse.json<ApiResponse>(
          { success: false, error: error.userMessage },
          { status: error.statusCode }
        )
      }

      accessCode = dbAccessCode

      // Cache bulk codes for future requests
      if (accessCode.type === 'bulk') {
        cache.setBulkCode({
          id: accessCode.id,
          code: accessCode.code,
          type: accessCode.type,
          name: accessCode.name,
          usage_count: accessCode.usage_count || 0,
          max_usage_count: accessCode.max_usage_count || 1,
          is_active: accessCode.is_active,
          expires_at: accessCode.expires_at,
          created_at: accessCode.created_at
        })
      }
    }

    if (codeError || !accessCode) {
      const error = BulkCodeErrorFactory.createInvalidError(code)
      logger.logBulkCodeError(error, 'CODE_LOOKUP_FAILED', {
        ipAddress: clientIP,
        userAgent,
        duration: Date.now() - startTime
      })
      
      return NextResponse.json<ApiResponse>(
        { success: false, error: error.userMessage },
        { status: error.statusCode }
      )
    }

    // Check if code has expired
    if (accessCode.expires_at && new Date(accessCode.expires_at) < new Date()) {
      const error = BulkCodeErrorFactory.createExpiredError(accessCode.expires_at, accessCode.id)
      logger.logBulkCodeError(error, 'CODE_EXPIRED_CHECK', {
        codeId: accessCode.id,
        ipAddress: clientIP,
        userAgent,
        duration: Date.now() - startTime
      })
      
      return NextResponse.json<ApiResponse>(
        { success: false, error: error.userMessage },
        { status: error.statusCode }
      )
    }

    // Clean up any inactive sessions first
    await supabase.rpc('cleanup_inactive_sessions')

    // Handle bulk codes differently from individual/center codes
    if (accessCode.type === 'bulk') {
      // For bulk codes, use optimized capacity check function
      let hasCapacity: boolean = false
      
      try {
        const capacityCheckStart = Date.now()
        const { data: capacityResult, error: capacityCheckError } = await supabase
          .rpc('check_bulk_code_capacity_optimized', { p_code_id: accessCode.id })

        performanceMonitor.recordMetric('capacity_check', Date.now() - capacityCheckStart, !capacityCheckError, accessCode.id)

        if (capacityCheckError) {
          const error = BulkCodeErrorFactory.createCapacityCheckFailedError(accessCode.id, capacityCheckError)
          logger.logBulkCodeError(error, 'CAPACITY_CHECK_FAILED', {
            codeId: accessCode.id,
            ipAddress: clientIP,
            userAgent,
            duration: Date.now() - startTime
          })

          // Attempt recovery
          const recoveryResult = await recoveryManager.attemptRecovery(error, {
            codeId: accessCode.id,
            operation: 'capacity_check'
          })

          if (!recoveryResult.success) {
            performanceMonitor.endOperation(operationId, 'code_login', startTime, false, accessCode.id, { 
              error: 'capacity_check_failed' 
            })
            return NextResponse.json<ApiResponse>(
              { success: false, error: error.userMessage },
              { status: error.statusCode }
            )
          }

          // Retry capacity check after recovery
          const retryStart = Date.now()
          const { data: retryCapacityResult, error: retryCapacityError } = await supabase
            .rpc('check_bulk_code_capacity_optimized', { p_code_id: accessCode.id })

          performanceMonitor.recordMetric('capacity_check_retry', Date.now() - retryStart, !retryCapacityError, accessCode.id)

          if (retryCapacityError) {
            performanceMonitor.endOperation(operationId, 'code_login', startTime, false, accessCode.id, { 
              error: 'capacity_check_retry_failed' 
            })
            return NextResponse.json<ApiResponse>(
              { success: false, error: error.userMessage },
              { status: error.statusCode }
            )
          }

          hasCapacity = retryCapacityResult || false
        } else {
          hasCapacity = capacityResult || false
        }

        // Log capacity check result
        logger.logCapacityCheck(
          accessCode.id,
          accessCode.usage_count || 0,
          accessCode.max_usage_count || 1,
          hasCapacity
        )

        if (!hasCapacity) {
          const currentUsage = accessCode.usage_count || 0
          const maxCapacity = accessCode.max_usage_count || 1
          
          const error = BulkCodeErrorFactory.createCapacityExceededError(currentUsage, maxCapacity, accessCode.id)
          logger.logBulkCodeError(error, 'CAPACITY_EXCEEDED', {
            codeId: accessCode.id,
            ipAddress: clientIP,
            userAgent,
            duration: Date.now() - startTime
          })

          performanceMonitor.endOperation(operationId, 'code_login', startTime, false, accessCode.id, { 
            error: 'capacity_exceeded' 
          })

          return NextResponse.json<ApiResponse>(
            { success: false, error: error.userMessage },
            { status: error.statusCode }
          )
        }
      } catch (unexpectedError) {
        const error = BulkCodeErrorFactory.createDatabaseError('capacity_check', accessCode.id, unexpectedError)
        logger.logBulkCodeError(error, 'CAPACITY_CHECK_UNEXPECTED_ERROR', {
          codeId: accessCode.id,
          ipAddress: clientIP,
          userAgent,
          duration: Date.now() - startTime
        })

        performanceMonitor.endOperation(operationId, 'code_login', startTime, false, accessCode.id, { 
          error: 'capacity_check_unexpected' 
        })

        return NextResponse.json<ApiResponse>(
          { success: false, error: error.userMessage },
          { status: error.statusCode }
        )
      }
    } else {
      // For individual/center codes, use existing concurrent session logic
      const { data: canCreateSession, error: sessionCheckError } = await supabase
        .rpc('check_concurrent_sessions', { p_code_id: accessCode.id })

      if (sessionCheckError) {
        console.error('Session check error:', sessionCheckError)
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Failed to validate session limits' },
          { status: 500 }
        )
      }

      if (!canCreateSession) {
        // Get current active sessions for better error message
        const { data: activeSessions } = await supabase
          .from('sessions')
          .select('id, started_at, last_activity')
          .eq('code_id', accessCode.id)
          .eq('is_active', true)
          .gte('last_activity', new Date(Date.now() - 30 * 60 * 1000).toISOString())

        const sessionCount = activeSessions?.length || 0
        
        const errorMessage = accessCode.type === 'center'
          ? `This center code is already in use. There is currently ${sessionCount} active session. Please wait for the current user to log out before trying again.`
          : `Maximum concurrent sessions (${accessCode.max_concurrent_sessions}) reached for this code. Currently ${sessionCount} active sessions.`

        return NextResponse.json<ApiResponse>(
          { success: false, error: errorMessage },
          { status: 403 }
        )
      }
    }

    // Create new session with atomic transaction for bulk codes
    const sessionToken = generateSessionToken()
    const clientIP = getClientIP(request)
    const userAgent = getUserAgent(request)
    const now = new Date().toISOString()

    let session: any = null

    if (accessCode.type === 'bulk') {
      // For bulk codes, use optimized atomic transaction to increment usage and create session
      let incrementResult: boolean = false
      
      try {
        const incrementStart = Date.now()
        const { data: result, error: incrementError } = await supabase
          .rpc('increment_bulk_code_usage_optimized', { p_code_id: accessCode.id })

        performanceMonitor.recordMetric('usage_increment', Date.now() - incrementStart, !incrementError, accessCode.id)

        if (incrementError) {
          const error = BulkCodeErrorFactory.createUsageIncrementFailedError(accessCode.id, incrementError)
          logger.logBulkCodeError(error, 'USAGE_INCREMENT_FAILED', {
            codeId: accessCode.id,
            ipAddress: clientIP,
            userAgent,
            duration: Date.now() - startTime
          })

          // Attempt recovery
          const recoveryResult = await recoveryManager.attemptRecovery(error, {
            codeId: accessCode.id,
            operation: 'usage_increment'
          })

          if (!recoveryResult.success) {
            performanceMonitor.endOperation(operationId, 'code_login', startTime, false, accessCode.id, { 
              error: 'usage_increment_failed' 
            })
            return NextResponse.json<ApiResponse>(
              { success: false, error: error.userMessage },
              { status: error.statusCode }
            )
          }

          // Recovery indicates we should retry the full operation
          performanceMonitor.endOperation(operationId, 'code_login', startTime, false, accessCode.id, { 
            error: 'usage_increment_recovery' 
          })
          return NextResponse.json<ApiResponse>(
            { success: false, error: 'Please try again in a moment.' },
            { status: 503 }
          )
        }

        incrementResult = result || false
        
        // Log usage increment
        logger.logUsageIncrement(
          accessCode.id,
          accessCode.usage_count || 0,
          (accessCode.usage_count || 0) + 1,
          incrementResult
        )

        if (!incrementResult) {
          // Capacity was exceeded between our check and increment attempt (race condition)
          const currentUsage = accessCode.usage_count || 0
          const maxCapacity = accessCode.max_usage_count || 1
          
          const error = BulkCodeErrorFactory.createConcurrentAccessConflictError(
            accessCode.id,
            currentUsage + 1,
            maxCapacity
          )
          
          logger.logBulkCodeError(error, 'CONCURRENT_ACCESS_CONFLICT', {
            codeId: accessCode.id,
            ipAddress: clientIP,
            userAgent,
            duration: Date.now() - startTime
          })

          performanceMonitor.endOperation(operationId, 'code_login', startTime, false, accessCode.id, { 
            error: 'concurrent_access_conflict' 
          })

          return NextResponse.json<ApiResponse>(
            { success: false, error: error.userMessage },
            { status: error.statusCode }
          )
        }

        // Update cache with new usage count
        cache.updateUsageCount(accessCode.id, (accessCode.usage_count || 0) + 1)
      } catch (unexpectedError) {
        const error = BulkCodeErrorFactory.createDatabaseError('usage_increment', accessCode.id, unexpectedError)
        logger.logBulkCodeError(error, 'USAGE_INCREMENT_UNEXPECTED_ERROR', {
          codeId: accessCode.id,
          ipAddress: clientIP,
          userAgent,
          duration: Date.now() - startTime
        })

        return NextResponse.json<ApiResponse>(
          { success: false, error: error.userMessage },
          { status: error.statusCode }
        )
      }

      // Create session after successful usage increment
      try {
        const { data: newSession, error: sessionError } = await supabase
          .from('sessions')
          .insert({
            code_id: accessCode.id,
            session_token: sessionToken,
            ip_address: clientIP,
            user_agent: userAgent,
            started_at: now,
            last_activity: now,
          })
          .select()
          .single()

        if (sessionError || !newSession) {
          const error = BulkCodeErrorFactory.createSessionCreationFailedError(accessCode.id, sessionError)
          logger.logBulkCodeError(error, 'SESSION_CREATION_FAILED', {
            codeId: accessCode.id,
            ipAddress: clientIP,
            userAgent,
            duration: Date.now() - startTime
          })
          
          // Rollback the usage increment if session creation fails
          try {
            const rollbackStart = Date.now()
            await supabase.rpc('decrement_bulk_code_usage_optimized', { p_code_id: accessCode.id })
            performanceMonitor.recordMetric('usage_rollback', Date.now() - rollbackStart, true, accessCode.id)
            
            // Update cache to reflect rollback
            cache.updateUsageCount(accessCode.id, Math.max(0, (accessCode.usage_count || 0)))
            
            logger.logRollbackAttempt(accessCode.id, 'session_creation_failure', true, 'usage_decremented')
          } catch (rollbackError) {
            const rollbackErr = BulkCodeErrorFactory.createRollbackFailedError(accessCode.id, rollbackError)
            logger.logBulkCodeError(rollbackErr, 'ROLLBACK_FAILED', {
              codeId: accessCode.id,
              ipAddress: clientIP,
              userAgent
            })
            performanceMonitor.recordMetric('usage_rollback', Date.now() - startTime, false, accessCode.id)
          }
          
          return NextResponse.json<ApiResponse>(
            { success: false, error: error.userMessage },
            { status: error.statusCode }
          )
        }

        // Log successful session creation
        logger.logSessionCreation(accessCode.id, newSession.id, true, Date.now() - startTime)
        session = newSession
      } catch (unexpectedError) {
        const error = BulkCodeErrorFactory.createDatabaseError('session_creation', accessCode.id, unexpectedError)
        logger.logBulkCodeError(error, 'SESSION_CREATION_UNEXPECTED_ERROR', {
          codeId: accessCode.id,
          ipAddress: clientIP,
          userAgent,
          duration: Date.now() - startTime
        })

        // Attempt rollback
        try {
          const rollbackStart = Date.now()
          await supabase.rpc('decrement_bulk_code_usage_optimized', { p_code_id: accessCode.id })
          performanceMonitor.recordMetric('usage_rollback', Date.now() - rollbackStart, true, accessCode.id)
          
          // Update cache to reflect rollback
          cache.updateUsageCount(accessCode.id, Math.max(0, (accessCode.usage_count || 0)))
          
          logger.logRollbackAttempt(accessCode.id, 'session_creation_unexpected_error', true, 'usage_decremented')
        } catch (rollbackError) {
          const rollbackErr = BulkCodeErrorFactory.createRollbackFailedError(accessCode.id, rollbackError)
          logger.logBulkCodeError(rollbackErr, 'ROLLBACK_FAILED', {
            codeId: accessCode.id,
            ipAddress: clientIP,
            userAgent
          })
          performanceMonitor.recordMetric('usage_rollback', Date.now() - startTime, false, accessCode.id)
        }

        return NextResponse.json<ApiResponse>(
          { success: false, error: error.userMessage },
          { status: error.statusCode }
        )
      }
    } else {
      // For individual/center codes, create session normally
      const { data: newSession, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          code_id: accessCode.id,
          session_token: sessionToken,
          ip_address: clientIP,
          user_agent: userAgent,
          started_at: now,
          last_activity: now,
        })
        .select()
        .single()

      if (sessionError || !newSession) {
        console.error('Session creation error:', sessionError)
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Failed to create session' },
          { status: 500 }
        )
      }

      session = newSession
    }

    // Log attendance
    const today = new Date().toISOString().split('T')[0]
    const { error: attendanceError } = await supabase
      .from('attendance_logs')
      .insert({
        code_id: accessCode.id,
        session_id: session.id,
        date: today,
        login_time: now,
      })

    if (attendanceError) {
      console.error('Attendance logging error:', attendanceError)
      // Don't fail the login for attendance logging errors
    }

    // For bulk codes linked to events, automatically register user for the event
    let eventInfo = null
    if (accessCode.type === 'bulk' && accessCode.event_id) {
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id, title, description, start_date, end_date')
        .eq('id', accessCode.event_id)
        .single()

      if (!eventError && event) {
        eventInfo = {
          id: event.id,
          title: event.title,
          description: event.description,
          start_date: event.start_date,
          end_date: event.end_date
        }
      }
    }

    // Create encrypted session cookie
    await createSession(session.id, accessCode.id)

    // Log successful access
    logger.logBulkCodeAccess(accessCode.id, session.id, clientIP, userAgent)

    // Record successful operation
    performanceMonitor.endOperation(operationId, 'code_login', startTime, true, accessCode.id, {
      session_id: session.id,
      code_type: accessCode.type
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Access granted',
      data: {
        sessionId: session.id,
        codeType: accessCode.type,
        codeName: accessCode.name,
        event: eventInfo, // Include event info if user accessed via bulk code linked to event
      },
    })

  } catch (error) {
    // Handle any unexpected errors that weren't caught by specific error handling
    const bulkCodeError = error instanceof BulkCodeError 
      ? error 
      : BulkCodeErrorFactory.createDatabaseError('authentication', undefined, error)
    
    logger.logBulkCodeError(bulkCodeError, 'AUTHENTICATION_UNEXPECTED_ERROR', {
      ipAddress: clientIP,
      userAgent,
      duration: Date.now() - startTime
    })

    // Record failed operation
    performanceMonitor.endOperation(operationId, 'code_login', startTime, false, undefined, {
      error: 'unexpected_error',
      error_type: bulkCodeError.code
    })

    return NextResponse.json<ApiResponse>(
      { success: false, error: bulkCodeError.userMessage },
      { status: bulkCodeError.statusCode }
    )
  }
}