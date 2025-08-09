'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { generateRandomCode } from '@/lib/utils'
import { Loader2, Plus, Download, Mail } from 'lucide-react'

const codeGenerationSchema = z.object({
  type: z.enum(['center', 'individual']),
  count: z.number().min(1).max(100),
  prefix: z.string().min(1).max(10),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required').optional().or(z.literal('')),
  maxSessions: z.number().min(1).max(10),
  expiresAt: z.string().optional(),
  sendEmail: z.boolean(),
}).refine((data) => {
  // If sendEmail is true, email must be provided
  if (data.sendEmail && (!data.email || data.email === '')) {
    return false
  }
  return true
}, {
  message: "Email is required when 'Send codes via email' is checked",
  path: ["email"]
})

type CodeGenerationData = z.infer<typeof codeGenerationSchema>

interface GeneratedCode {
  code: string
  type: 'center' | 'individual'
  name: string
  email?: string
  max_concurrent_sessions: number
  expires_at?: string
}

export function CodeGenerator() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedCodes, setGeneratedCodes] = useState<GeneratedCode[]>([])
  const [showResults, setShowResults] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(codeGenerationSchema),
    defaultValues: {
      type: 'individual' as const,
      count: 1,
      prefix: 'STPPL',
      name: '',
      email: '',
      maxSessions: 1,
      sendEmail: false,
    },
  })

  const watchType = watch('type')
  const watchCount = watch('count')

  const onSubmit = async (data: CodeGenerationData) => {
    setIsGenerating(true)
    
    try {
      // Generate codes locally first
      const codes: GeneratedCode[] = []
      for (let i = 0; i < data.count; i++) {
        codes.push({
          code: `${data.prefix}-${generateRandomCode()}`,
          type: data.type,
          name: data.count === 1 ? data.name : `${data.name} ${i + 1}`,
          email: data.email || undefined,
          max_concurrent_sessions: data.type === 'center' ? 1 : data.maxSessions,
          expires_at: data.expiresAt || undefined,
        })
      }

      // Save to database
      const response = await fetch('/api/admin/codes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          codes,
          sendEmail: data.sendEmail 
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setGeneratedCodes(result.codes)
        setShowResults(true)
        reset()
      } else {
        const error = await response.json()
        alert(`Error: ${error.message}`)
      }
    } catch (error) {
      console.error('Generation error:', error)
      alert('Failed to generate codes. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadCodes = () => {
    const csv = [
      'Code,Type,Name,Email,Max Sessions,Expires At',
      ...generatedCodes.map(code => 
        `${code.code},${code.type},${code.name},${code.email || ''},${code.max_concurrent_sessions},${code.expires_at || ''}`
      )
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `access-codes-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (showResults) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            {generatedCodes.length} Codes Generated Successfully!
          </h3>
          <p className="text-gray-600">
            Your access codes are ready to use
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6 max-h-60 overflow-y-auto">
          <div className="grid gap-2">
            {generatedCodes.map((code, index) => (
              <div key={index} className="bg-white p-4 rounded border">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-mono font-medium text-lg">{code.code}</span>
                    <span className="ml-2 text-sm text-gray-500 capitalize">({code.type})</span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {code.max_concurrent_sessions} session{code.max_concurrent_sessions > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="text-sm text-gray-700">
                  <p className="font-medium">{code.name}</p>
                  {code.email && <p className="text-gray-500">{code.email}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={downloadCodes}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download CSV
          </button>
          
          <button
            onClick={() => setShowResults(false)}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Generate More
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Generate Access Codes</h3>
        <p className="text-gray-600">Create new access codes for centers or individuals</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Code Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Code Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                {...register('type')}
                type="radio"
                value="center"
                className="mr-3"
              />
              <div>
                <p className="font-medium">Center Code</p>
                <p className="text-sm text-gray-500">Single location use</p>
              </div>
            </label>
            <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                {...register('type')}
                type="radio"
                value="individual"
                className="mr-3"
              />
              <div>
                <p className="font-medium">Individual Code</p>
                <p className="text-sm text-gray-500">Multiple sessions</p>
              </div>
            </label>
          </div>
        </div>

        {/* Name and Email */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {watchType === 'center' ? 'Center Name' : 'Individual Name'} *
            </label>
            <input
              {...register('name')}
              type="text"
              placeholder={watchType === 'center' ? 'e.g. Community Center' : 'e.g. John Doe'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.name && (
              <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              {...register('email')}
              type="email"
              placeholder="email@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.email && (
              <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>
            )}
            <p className="text-sm text-gray-500 mt-1">
              Required if sending codes via email
            </p>
          </div>
        </div>

        {/* Count and Prefix */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Codes
            </label>
            <input
              {...register('count', { valueAsNumber: true })}
              type="number"
              min="1"
              max="100"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.count && (
              <p className="text-red-600 text-sm mt-1">{errors.count.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Code Prefix
            </label>
            <input
              {...register('prefix')}
              type="text"
              placeholder="STPPL"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.prefix && (
              <p className="text-red-600 text-sm mt-1">{errors.prefix.message}</p>
            )}
          </div>
        </div>

        {/* Max Sessions (for individual codes) */}
        {watchType === 'individual' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Concurrent Sessions
            </label>
            <input
              {...register('maxSessions', { valueAsNumber: true })}
              type="number"
              min="1"
              max="10"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              How many devices can use this code simultaneously
            </p>
          </div>
        )}

        {/* Expiration Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Expiration Date (Optional)
          </label>
          <input
            {...register('expiresAt')}
            type="datetime-local"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Send Email Option */}
        <div>
          <label className="flex items-center">
            <input
              {...register('sendEmail')}
              type="checkbox"
              className="mr-2"
            />
            <span className="text-sm text-gray-700">
              Send codes via email (requires email addresses)
            </span>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isGenerating}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating {watchCount} code{watchCount > 1 ? 's' : ''}...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Generate {watchCount} Code{watchCount > 1 ? 's' : ''}
            </>
          )}
        </button>
      </form>
    </div>
  )
}