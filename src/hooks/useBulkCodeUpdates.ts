'use client'

import { useState, useEffect, useCallback } from 'react'
import { BulkCodeUsage } from '@/types/database'

interface UseBulkCodeUpdatesOptions {
  refreshInterval?: number
  onUpdate?: (usage: BulkCodeUsage[]) => void
}

export function useBulkCodeUpdates({ 
  refreshInterval = 30000, // 30 seconds
  onUpdate 
}: UseBulkCodeUpdatesOptions = {}) {
  const [bulkCodeUsages, setBulkCodeUsages] = useState<BulkCodeUsage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBulkCodeUsages = useCallback(async () => {
    try {
      setError(null)
      const response = await fetch('/api/admin/bulk-codes/status')
      
      if (!response.ok) {
        throw new Error('Failed to fetch bulk code usages')
      }
      
      const data = await response.json()
      const usages = data.bulkCodes || []
      
      setBulkCodeUsages(usages)
      
      if (onUpdate) {
        onUpdate(usages)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [onUpdate])

  useEffect(() => {
    fetchBulkCodeUsages()
    
    const interval = setInterval(fetchBulkCodeUsages, refreshInterval)
    return () => clearInterval(interval)
  }, [fetchBulkCodeUsages, refreshInterval])

  const refreshNow = useCallback(() => {
    setIsLoading(true)
    fetchBulkCodeUsages()
  }, [fetchBulkCodeUsages])

  return {
    bulkCodeUsages,
    isLoading,
    error,
    refreshNow
  }
}