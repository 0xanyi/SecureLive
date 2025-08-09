'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { isValidCode } from '@/lib/utils'

const codeSchema = z.object({
  code: z.string()
    .min(6, 'Code must be at least 6 characters')
    .max(20, 'Code must be no more than 20 characters')
    .refine(isValidCode, 'Code must contain only letters, numbers, and hyphens'),
})

type CodeFormData = z.infer<typeof codeSchema>

export function CodeEntry() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<CodeFormData>({
    resolver: zodResolver(codeSchema),
  })

  const codeValue = watch('code', '')

  const onSubmit = async (data: CodeFormData) => {
    setIsLoading(true)
    setError('')
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
        // Small delay to show success state
        setTimeout(() => {
          router.push('/stream')
        }, 1000)
      } else {
        setError(result.error || result.message || 'Invalid access code')
      }
    } catch (err) {
      setError('Connection error. Please try again.')
    } finally {
      setIsLoading(false)
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
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Access Denied</span>
          </div>
          <p className="mt-1 text-sm text-red-600">{error}</p>
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
        disabled={isLoading || success || !codeValue}
        className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-all duration-200 ${
          isLoading || success || !codeValue
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 hover:shadow-lg'
        }`}
      >
        {isLoading ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Validating...</span>
          </div>
        ) : success ? (
          <div className="flex items-center justify-center gap-2">
            <CheckCircle className="w-5 h-5" />
            <span>Success!</span>
          </div>
        ) : (
          'Enter Stream'
        )}
      </button>

      
    </form>
  )
}