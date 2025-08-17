import { NextRequest, NextResponse } from 'next/server'
import { validateAdminSession } from '@/lib/auth/admin'
import { BulkCodeLogger } from '@/lib/errors/bulk-code-logger'
import { BulkCodeRecoveryManager } from '@/lib/errors/bulk-code-recovery'
import type { ApiResponse } from '@/types/database'

export async function GET(request: NextRequest) {
  try {
    const adminUser = await validateAdminSession()
    if (!adminUser) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const hours = parseInt(searchParams.get('hours') || '24')
    const errorCode = searchParams.get('errorCode')
    const codeId = searchParams.get('codeId')

    const logger = BulkCodeLogger.getInstance()
    const recoveryManager = BulkCodeRecoveryManager.getInstance()

    let errorLogs
    if (codeId) {
      errorLogs = logger.getBulkCodeActivity(codeId, hours)
    } else if (errorCode) {
      errorLogs = logger.getErrorsByCode(errorCode as any, hours)
    } else {
      errorLogs = logger.getRecentErrors(hours * 60) // Convert hours to minutes
    }

    const errorStats = logger.getErrorStats(hours)
    const recoveryStats = recoveryManager.getRecoveryStats()
    const activeRecoveries = recoveryManager.getActiveRecoveries()

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        errors: errorLogs,
        stats: errorStats,
        recovery: {
          active: activeRecoveries,
          stats: recoveryStats
        },
        timeRange: {
          hours,
          from: new Date(Date.now() - hours * 60 * 60 * 1000).toISOString(),
          to: new Date().toISOString()
        }
      }
    })
  } catch (error) {
    console.error('Error fetching bulk code errors:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to fetch error logs' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const adminUser = await validateAdminSession()
    if (!adminUser || adminUser.role !== 'super_admin') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized - Super admin required' },
        { status: 401 }
      )
    }

    const logger = BulkCodeLogger.getInstance()
    logger.clearLogs()

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Error logs cleared successfully'
    })
  } catch (error) {
    console.error('Error clearing bulk code logs:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to clear error logs' },
      { status: 500 }
    )
  }
}