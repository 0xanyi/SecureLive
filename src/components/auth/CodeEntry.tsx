'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Loader2, AlertCircle, CheckCircle, RefreshCw, Clock } from 'lucide-react'
import { isValidCode } from '@/lib/utils'

const codeSchema = z.object({
  code: z.string()
    .min(6, 'Code must be at least 6 characters')
    .max(20, 'Code must be no more than 20 characters')
    .refine(isValidCode, 'Code must contain only letters, numbers, and hyphens'),
})

type CodeFormData = z.infer<typeof codeSchema>

interface ErrorDetails {
  message: string
  type: 'capacity_exceeded' | 'expired' | 'invalid' | 'temporary' | 'unknown'
  recoverable: boolean
  retryAfter?: number
}

export function CodeEntry() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<ErrorDetails | null>(null)
  const [success, setSuccess] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [retryTimer, setRetryTimer] = useState<number | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<CodeFormData>({
    resolver: zodResolver(codeSchema),
  })

  const codeValue = watch('code', '')

  const parseErrorResponse = (response: Response, result: any): ErrorDetails => {
    const message = result.error || result.message || 'Invalid access code'
    
    // Determine error type based on status code and message content
    if (response.status === 403) {
      if (message.includes('maximum capacity')) {
        return {
          message,
          type: 'capacity_exceeded',
          recoverable: false
        }
      }
    }
    
    if (response.status === 401) {
      if (message.includes('expired')) {
        return {
          message,
          type: 'expired',
          recoverable: false
        }
      }
      return {
        message,
        type: 'invalid',
        recoverable: true
      }
    }
    
    if (response.status === 409) {
      return {
        message,
        type: 'temporary',
        recoverable: true,
        retryAfter: 2000 // 2 seconds for concurrent access conflicts
      }
    }
    
    if (response.status === 503 || response.status >= 500) {
      return {
        message,
        type: 'temporary',
        recoverable: true,
        retryAfter: Math.min(1000 * Math.pow(2, retryCount), 10000) // Exponential backoff, max 10s
      }
    }
    
    return {
      message,
      type: 'unknown',
      recoverable: true
    }
  }

  const startRetryTimer = (seconds: number) => {
    setRetryTimer(seconds)
    const interval = setInterval(() => {
      setRetryTimer(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval)
          return null
        }
        return prev - 1
      })
    }, 1000)
  }

  const onSubmit = async (data: CodeFormData) => {
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch('/api/auth/code-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: data.code.toUpperCase() }),
      })

      const result = await response.json()

      if (response.ok) {
        setSuccess(true)
        setRetryCount(0) // Reset retry count on success
        // Small delay to show success state
        setTimeout(() => {
          router.push('/stream')
        }, 1000)
      } else {
        const errorDetails = parseErrorResponse(response, result)
        setError(errorDetails)
        setRetryCount(prev => prev + 1)
        
        // Start retry timer for temporary errors
        if (errorDetails.recoverable && errorDetails.retryAfter) {
          startRetryTimer(Math.ceil(errorDetails.retryAfter / 1000))
        }
      }
    } catch (err) {
      setError({
        message: 'Connection error. Please check your internet connection and try again.',
        type: 'temporary',
        recoverable: true,
        retryAfter: 3000
      })
      setRetryCount(prev => prev + 1)
      startRetryTimer(3)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRetry = () => {
    if (error?.recoverable && !isLoading && retryTimer === null) {
      const form = document.querySelector('form') as HTMLFormElement
      if (form) {
        form.requestSubmit()
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
      
        <div className="relative">
          <input
            {...register('code')}
            type="text"
            id="code"
            placeholder="Enter your access code"
            className={`w-full px-4 py-3 border-2 rounded-lg text-lg font-mono uppercase tracking-wider transition-colors focus:outline-none focus:ring-0 ${
              errors.code
                ? 'border-red-300 focus:border-red-500'
                : success
                ? 'border-green-300 focus:border-green-500'
                : 'border-gray-300 focus:border-blue-500'
            }`}
            disabled={isLoading || success}
            autoComplete="off"
            autoFocus
          />
          
          {/* Success indicator */}
          {success && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
          )}
        </div>

        {/* Validation feedback */}
        {errors.code && (
          <div className="mt-2 flex items-center gap-2 text-red-600">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{errors.code.message}</span>
          </div>
        )}

        {/* Helper text */}
        {!errors.code && !error && !success && (
          <p className="mt-2 text-sm text-gray-500 flex items-center gap-2">
            
          </p>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className={`p-4 border rounded-lg ${
          error.type === 'temporary' 
            ? 'bg-yellow-50 border-yellow-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className={`flex items-center gap-2 ${
            error.type === 'temporary' ? 'text-yellow-700' : 'text-red-700'
          }`}>
            {error.type === 'capacity_exceeded' && <AlertCircle className="w-5 h-5" />}
            {error.type === 'expired' && <Clock className="w-5 h-5" />}
            {error.type === 'invalid' && <AlertCircle className="w-5 h-5" />}
            {error.type === 'temporary' && <RefreshCw className="w-5 h-5" />}
            {error.type === 'unknown' && <AlertCircle className="w-5 h-5" />}
            <span className="font-medium">
              {error.type === 'capacity_exceeded' && 'Code at Capacity'}
              {error.type === 'expired' && 'Code Expired'}
              {error.type === 'invalid' && 'Invalid Code'}
              {error.type === 'temporary' && 'Temporary Issue'}
              {error.type === 'unknown' && 'Access Denied'}
            </span>
          </div>
          <p className={`mt-1 text-sm ${
            error.type === 'temporary' ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {error.message}
          </p>
          
          {/* Retry information for recoverable errors */}
          {error.recoverable && (
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                {retryTimer !== null ? (
                  <>
                    <Clock className="w-4 h-4" />
                    <span>Retry in {retryTimer} seconds</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>You can try again</span>
                  </>
                )}
              </div>
              
              {retryTimer === null && (
                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={isLoading}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
                >
                  Retry Now
                </button>
              )}
            </div>
          )}
          
          {/* Additional help for specific error types */}
          {error.type === 'capacity_exceeded' && (
            <div className="mt-2 text-xs text-gray-500">
              This code has reached its user limit. Contact the administrator for assistance.
            </div>
          )}
          
          {error.type === 'expired' && (
            <div className="mt-2 text-xs text-gray-500">
              Request a new access code from the administrator.
            </div>
          )}
          
          {error.type === 'invalid' && retryCount > 2 && (
            <div className="mt-2 text-xs text-gray-500">
              Double-check your code or contact the administrator if you continue having issues.
            </div>
          )}
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Access Granted</span>
          </div>
          <p className="mt-1 text-sm text-green-600">
            Redirecting to stream...
          </p>
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={isLoading || success || !codeValue || retryTimer !== null}
        className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-all duration-200 ${
          isLoading || success || !codeValue || retryTimer !== null
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 hover:shadow-lg'
        }`}
      >
        {isLoading ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>
              {retryCount > 0 ? `Retrying... (${retryCount})` : 'Validating...'}
            </span>
          </div>
        ) : success ? (
          <div className="flex items-center justify-center gap-2">
            <CheckCircle className="w-5 h-5" />
            <span>Success!</span>
          </div>
        ) : retryTimer !== null ? (
          <div className="flex items-center justify-center gap-2">
            <Clock className="w-5 h-5" />
            <span>Wait {retryTimer}s</span>
          </div>
        ) : (
          'Enter Stream'
        )}
      </button>

      
    </form>
  )
}