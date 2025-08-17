/**
 * Cleanup Scheduler for Bulk Code Sessions
 * 
 * This module provides utilities for scheduling and managing cleanup tasks
 * for bulk access codes and their associated sessions.
 */

import { createServiceClient } from '@/lib/supabase/server'

export interface CleanupStats {
  regular_sessions_cleaned: number
  bulk_sessions_cleaned: number
  bulk_codes_decremented: number
  bulk_codes_deactivated: number
  bulk_sessions_terminated: number
  timestamp: string
}

export interface CleanupConfig {
  enabled: boolean
  interval_minutes: number
  max_retries: number
  log_results: boolean
}

export class BulkCodeCleanupScheduler {
  private config: CleanupConfig
  private isRunning: boolean = false
  private intervalId: NodeJS.Timeout | null = null

  constructor(config: Partial<CleanupConfig> = {}) {
    this.config = {
      enabled: true,
      interval_minutes: 5, // Run every 5 minutes by default
      max_retries: 3,
      log_results: true,
      ...config
    }
  }

  /**
   * Start the scheduled cleanup process
   */
  start(): void {
    if (this.isRunning || !this.config.enabled) {
      return
    }

    this.isRunning = true
    const intervalMs = this.config.interval_minutes * 60 * 1000

    if (this.config.log_results) {
      console.log(`Starting bulk code cleanup scheduler (interval: ${this.config.interval_minutes} minutes)`)
    }

    // Run initial cleanup
    this.runCleanup()

    // Schedule recurring cleanup
    this.intervalId = setInterval(() => {
      this.runCleanup()
    }, intervalMs)
  }

  /**
   * Stop the scheduled cleanup process
   */
  stop(): void {
    if (!this.isRunning) {
      return
    }

    this.isRunning = false
    
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    if (this.config.log_results) {
      console.log('Bulk code cleanup scheduler stopped')
    }
  }

  /**
   * Run cleanup immediately
   */
  async runCleanup(): Promise<CleanupStats | null> {
    let retries = 0
    
    while (retries < this.config.max_retries) {
      try {
        const supabase = await createServiceClient()
        
            // Run cleanup using existing functions
        const { data: regularResult, error: regularError } = await supabase
          .rpc('cleanup_inactive_sessions')

        if (regularError) {
          throw new Error(`Regular cleanup error: ${regularError.message}`)
        }

        // Manual bulk code cleanup
        let bulkCodesDeactivated = 0
        let bulkSessionsTerminated = 0

        // Clean up expired bulk codes
        const now = new Date().toISOString()
        const { data: expiredBulkCodes, error: expiredError } = await supabase
          .from('access_codes')
          .select('id, usage_count')
          .eq('type', 'bulk')
          .eq('is_active', true)
          .lt('expires_at', now)

        if (!expiredError && expiredBulkCodes && expiredBulkCodes.length > 0) {
          for (const code of expiredBulkCodes) {
            // Deactivate expired bulk code
            const { error: deactivateError } = await supabase
              .from('access_codes')
              .update({ is_active: false, usage_count: 0 })
              .eq('id', code.id)

            if (!deactivateError) {
              bulkCodesDeactivated++

              // Terminate active sessions for this expired code
              const { data: terminatedSessions, error: terminateError } = await supabase
                .from('sessions')
                .update({ is_active: false, ended_at: now })
                .eq('code_id', code.id)
                .eq('is_active', true)
                .select('id')

              if (!terminateError && terminatedSessions) {
                bulkSessionsTerminated += terminatedSessions.length
              }
            }
          }
        }

        const stats: CleanupStats = {
          regular_sessions_cleaned: regularResult || 0,
          bulk_sessions_cleaned: 0, // This is handled by regular cleanup now
          bulk_codes_decremented: 0, // This is handled by regular cleanup now
          bulk_codes_deactivated: bulkCodesDeactivated,
          bulk_sessions_terminated: bulkSessionsTerminated,
          timestamp: new Date().toISOString()
        }

        if (this.config.log_results) {
          const totalCleaned = stats.regular_sessions_cleaned + stats.bulk_sessions_cleaned
          if (totalCleaned > 0 || stats.bulk_codes_deactivated > 0) {
            console.log('Cleanup completed:', {
              total_sessions_cleaned: totalCleaned,
              bulk_codes_deactivated: stats.bulk_codes_deactivated,
              bulk_sessions_terminated: stats.bulk_sessions_terminated,
              timestamp: stats.timestamp
            })
          }
        }

        return stats

      } catch (error) {
        retries++
        console.error(`Cleanup attempt ${retries} failed:`, error)
        
        if (retries >= this.config.max_retries) {
          console.error(`Cleanup failed after ${this.config.max_retries} attempts`)
          return null
        }
        
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000))
      }
    }

    return null
  }

  /**
   * Run cleanup for expired bulk codes only
   */
  async cleanupExpiredCodes(): Promise<{ deactivated: number; terminated: number } | null> {
    try {
      const supabase = await createServiceClient()
      
      let deactivated = 0
      let terminated = 0

      // Clean up expired bulk codes manually
      const now = new Date().toISOString()
      const { data: expiredBulkCodes, error: expiredError } = await supabase
        .from('access_codes')
        .select('id')
        .eq('type', 'bulk')
        .eq('is_active', true)
        .lt('expires_at', now)

      if (!expiredError && expiredBulkCodes && expiredBulkCodes.length > 0) {
        for (const code of expiredBulkCodes) {
          // Deactivate expired bulk code
          const { error: deactivateError } = await supabase
            .from('access_codes')
            .update({ is_active: false, usage_count: 0 })
            .eq('id', code.id)

          if (!deactivateError) {
            deactivated++

            // Terminate active sessions for this expired code
            const { data: terminatedSessions, error: terminateError } = await supabase
              .from('sessions')
              .update({ is_active: false, ended_at: now })
              .eq('code_id', code.id)
              .eq('is_active', true)
              .select('id')

            if (!terminateError && terminatedSessions) {
              terminated += terminatedSessions.length
            }
          }
        }
      }

      const stats = { deactivated, terminated }

      if (this.config.log_results && (stats.deactivated > 0 || stats.terminated > 0)) {
        console.log('Expired bulk codes cleanup:', stats)
      }

      return stats

    } catch (error) {
      console.error('Failed to cleanup expired bulk codes:', error)
      return null
    }
  }

  /**
   * Get current cleanup statistics
   */
  async getCleanupStats(): Promise<any> {
    try {
      const supabase = await createServiceClient()
      
      // Get bulk codes statistics manually
      const { data: bulkCodesStats, error: bulkCodesError } = await supabase
        .from('access_codes')
        .select('id, is_active, expires_at, usage_count, max_usage_count')
        .eq('type', 'bulk')

      if (bulkCodesError) {
        throw new Error(`Failed to fetch bulk codes stats: ${bulkCodesError.message}`)
      }

      // Get bulk sessions statistics manually
      const { data: bulkSessionsStats, error: bulkSessionsError } = await supabase
        .from('sessions')
        .select(`
          id, 
          is_active, 
          last_activity,
          access_codes!inner(type)
        `)
        .eq('access_codes.type', 'bulk')

      if (bulkSessionsError) {
        throw new Error(`Failed to fetch bulk sessions stats: ${bulkSessionsError.message}`)
      }

      const monitoringData = []

      if (bulkCodesStats) {
        const totalCodes = bulkCodesStats.length
        const activeCodes = bulkCodesStats.filter(c => c.is_active).length
        const expiredActiveCodes = bulkCodesStats.filter(c => 
          c.is_active && c.expires_at && new Date(c.expires_at) < new Date()
        ).length

        monitoringData.push({
          cleanup_type: 'bulk_codes',
          total_codes: totalCodes,
          active_codes: activeCodes,
          expired_active_codes: expiredActiveCodes
        })
      }

      if (bulkSessionsStats) {
        const totalSessions = bulkSessionsStats.length
        const activeSessions = bulkSessionsStats.filter(s => s.is_active).length
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
        const inactiveSessions = bulkSessionsStats.filter(s => 
          s.is_active && new Date(s.last_activity) < thirtyMinutesAgo
        ).length

        monitoringData.push({
          cleanup_type: 'bulk_sessions',
          total_sessions: totalSessions,
          active_sessions: activeSessions,
          inactive_sessions: inactiveSessions
        })
      }

      return monitoringData

    } catch (error) {
      console.error('Failed to get cleanup stats:', error)
      return null
    }
  }

  /**
   * Check if cleanup is needed
   */
  async needsCleanup(): Promise<boolean> {
    try {
      const supabase = await createServiceClient()
      
      // Check for expired bulk codes
      const { data: expiredCodes, error: expiredError } = await supabase
        .from('access_codes')
        .select('id')
        .eq('type', 'bulk')
        .eq('is_active', true)
        .lt('expires_at', new Date().toISOString())
        .limit(1)

      if (expiredError) {
        console.error('Error checking expired codes:', expiredError)
        return false
      }

      if (expiredCodes && expiredCodes.length > 0) {
        return true
      }

      // Check for inactive sessions
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
      const { data: inactiveSessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('id')
        .eq('is_active', true)
        .lt('last_activity', thirtyMinutesAgo)
        .limit(1)

      if (sessionsError) {
        console.error('Error checking inactive sessions:', sessionsError)
        return false
      }

      return inactiveSessions && inactiveSessions.length > 0

    } catch (error) {
      console.error('Error checking cleanup needs:', error)
      return false
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): { running: boolean; config: CleanupConfig } {
    return {
      running: this.isRunning,
      config: this.config
    }
  }
}

// Export a default instance
export const defaultCleanupScheduler = new BulkCodeCleanupScheduler()

// Utility functions for manual cleanup operations
export async function runManualCleanup(): Promise<CleanupStats | null> {
  const scheduler = new BulkCodeCleanupScheduler({ log_results: true })
  return await scheduler.runCleanup()
}

export async function cleanupExpiredBulkCodes(): Promise<{ deactivated: number; terminated: number } | null> {
  const scheduler = new BulkCodeCleanupScheduler({ log_results: true })
  return await scheduler.cleanupExpiredCodes()
}