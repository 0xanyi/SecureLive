'use client'

import { useState } from 'react'
import { formatDate } from '@/lib/utils'
import { 
  Building2, 
  User, 
  Copy, 
  Mail, 
  MoreHorizontal, 
  Edit, 
  Trash2,
  CheckCircle,
  XCircle
} from 'lucide-react'

interface AccessCode {
  id: string
  code: string
  type: 'center' | 'individual'
  name: string
  email?: string
  max_concurrent_sessions: number
  is_active: boolean
  created_at: string
  expires_at?: string
  admin_users?: {
    email: string
  } | null
}

interface CodesTableProps {
  codes: AccessCode[]
}

export function CodesTable({ codes }: CodesTableProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Code & Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name & Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sessions
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {codes.map((code) => (
              <tr key={code.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      code.type === 'center' 
                        ? 'bg-blue-100 text-blue-600' 
                        : 'bg-green-100 text-green-600'
                    }`}>
                      {code.type === 'center' ? (
                        <Building2 className="w-4 h-4" />
                      ) : (
                        <User className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium text-gray-900">
                          {code.code}
                        </span>
                        <button
                          onClick={() => copyToClipboard(code.code)}
                          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                          title="Copy code"
                        >
                          {copiedCode === code.code ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 capitalize">
                        {code.type}
                      </p>
                    </div>
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {code.name}
                    </p>
                    {code.email && (
                      <p className="text-sm text-gray-500">{code.email}</p>
                    )}
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900">
                    {code.max_concurrent_sessions === 1 
                      ? 'Single session' 
                      : `Up to ${code.max_concurrent_sessions}`
                    }
                  </span>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {code.is_active ? (
                      <>
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span className="text-sm text-green-600 font-medium">Active</span>
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 bg-red-500 rounded-full" />
                        <span className="text-sm text-red-600 font-medium">Inactive</span>
                      </>
                    )}
                  </div>
                  {code.expires_at && (
                    <p className="text-xs text-gray-500 mt-1">
                      Expires: {formatDate(code.expires_at)}
                    </p>
                  )}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <p className="text-sm text-gray-900">
                      {formatDate(code.created_at)}
                    </p>
                    <p className="text-xs text-gray-500">
                      by {code.admin_users?.email || 'Unknown'}
                    </p>
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {code.email && (
                      <button
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Send email"
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                    )}
                    
                    <button
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Edit code"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    
                    <button
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete code"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    
                    <button
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      title="More options"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {codes.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Building2 className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No access codes yet
            </h3>
            <p className="text-gray-500">
              Generate your first access codes to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}