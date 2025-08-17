import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import type { ApiResponse, BulkCodeUsage } from '@/types/database'
import { BulkCodeCache } from '@/lib/cache/bulk-code-cache'
import { BulkCodePerformanceMonitor } from '@/lib/monitoring/bulk-code-performance'

export async function GET(request: NextRequest) {
  const cache = BulkCodeCache.getInstance()
  const performanceMonitor = BulkCodePerformanceMonitor.getInstance()
  const startTime = Date.now()
  const operationId = performanceMonitor.startOperation('bulk_code_usage_api')

  try {
    const { searchParams } = new URL(request.url)
    const codeId = searchParams.get('codeId')

    const supabase = await createServiceClient()

    if (codeId) {
      // Get usage data for a specific bulk code
      
      // Try cache first
      const cachedUsage = cache.getUsageData(codeId)
      if (cachedUsage) {
        performanceMonitor.endOperation(operationId, 'bulk_code_usage_api', startTime, true, codeId, { 
          cache_hit: true,
          single_code: true 
        })
        
        return NextResponse.json<ApiResponse<BulkCodeUsage>>({
          success: true,
          data: cachedUsage
        })
      }

      // Cache miss - use optimized batch function
      const batchStart = Date.now()
      const { data: batchResults, error: batchError } = await supabase
        .rpc('get_bulk_code_usage_batch', { p_code_ids: [codeId] })

      performanceMonitor.recordMetric('batch_usage_lookup', Date.now() - batchStart, !batchError, codeId)

      if (batchError || !batchResults || batchResults.length === 0) {
        performanceMonitor.endOperation(operationId, 'bulk_code_usage_api', startTime, false, codeId, { 
          error: 'code_not_found',
          single_code: true 
        })
        
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Bulk code not found' },
          { status: 404 }
        )
      }

      const result = batchResults[0]
      const usageData: BulkCodeUsage = {
        code_id: result.code_id,
        current_usage: result.current_usage,
        max_capacity: result.max_capacity,
        active_sessions: Number(result.active_sessions),
        capacity_percentage: result.capacity_percentage,
        is_near_capacity: result.is_near_capacity,
        is_expired: result.is_expired,
        time_remaining_minutes: result.time_remaining_minutes
      }

      // Cache the result
      cache.setUsageData(usageData)

      performanceMonitor.endOperation(operationId, 'bulk_code_usage_api', startTime, true, codeId, { 
        cache_hit: false,
        single_code: true 
      })

      return NextResponse.json<ApiResponse<BulkCodeUsage>>({
        success: true,
        data: usageData
      })

    } else {
      // Get usage data for all active bulk codes using optimized batch function
      const batchStart = Date.now()
      const { data: batchResults, error: batchError } = await supabase
        .rpc('get_bulk_code_usage_batch', { p_code_ids: null })

      performanceMonitor.recordMetric('batch_usage_lookup_all', Date.now() - batchStart, !batchError)

      if (batchError) {
        console.error('Error fetching bulk code usage data:', batchError)
        performanceMonitor.endOperation(operationId, 'bulk_code_usage_api', startTime, false, undefined, { 
          error: 'batch_lookup_failed',
          single_code: false 
        })
        
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Failed to fetch bulk code usage data' },
          { status: 500 }
        )
      }

      const allUsageData: BulkCodeUsage[] = (batchResults || []).map(result => {
        const usageData: BulkCodeUsage = {
          code_id: result.code_id,
          current_usage: result.current_usage,
          max_capacity: result.max_capacity,
          active_sessions: Number(result.active_sessions),
          capacity_percentage: result.capacity_percentage,
          is_near_capacity: result.is_near_capacity,
          is_expired: result.is_expired,
          time_remaining_minutes: result.time_remaining_minutes
        }

        // Cache each result
        cache.setUsageData(usageData)
        
        return usageData
      })

      performanceMonitor.endOperation(operationId, 'bulk_code_usage_api', startTime, true, undefined, { 
        single_code: false,
        result_count: allUsageData.length 
      })

      return NextResponse.json<ApiResponse<BulkCodeUsage[]>>({
        success: true,
        data: allUsageData
      })
    }

  } catch (error) {
    console.error('Bulk code usage API error:', error)
    performanceMonitor.endOperation(operationId, 'bulk_code_usage_api', startTime, false, codeId || undefined, { 
      error: 'unexpected_error' 
    })
    
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}