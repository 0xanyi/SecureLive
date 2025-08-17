'use client'

import { useState } from 'react'
import { formatDate } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { 
  Building2, 
  User, 
  Copy, 
  Mail, 
  MoreHorizontal, 
  Edit, 
  Trash2,
  CheckCircle,
  XCircle,
  UserCheck,
  Clock,
  AlertTriangle
} from 'lucide-react'

interface AccessCode {
  id: string
  code: string
  type: 'center' | 'individual' | 'bulk'
  name: string
  email?: string
  max_concurrent_sessions: number
  usage_count?: number
  max_usage_count?: number
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
  const [editingCode, setEditingCode] = useState<AccessCode | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const router = useRouter()

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleEdit = (code: AccessCode) => {
    setEditingCode(code)
  }

  const handleSaveEdit = async (updatedCode: AccessCode) => {
    try {
      const response = await fetch(`/api/admin/codes/${updatedCode.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: updatedCode.name,
          email: updatedCode.email,
          max_concurrent_sessions: updatedCode.max_concurrent_sessions,
          max_usage_count: updatedCode.max_usage_count,
          is_active: updatedCode.is_active,
          expires_at: updatedCode.expires_at
        }),
      })

      if (response.ok) {
        setEditingCode(null)
        router.refresh()
      } else {
        console.error('Failed to update code')
      }
    } catch (error) {
      console.error('Error updating code:', error)
    }
  }

  const handleDelete = async (codeId: string) => {
    if (!confirm('Are you sure you want to delete this access code? This action cannot be undone.')) {
      return
    }

    setIsDeleting(codeId)
    try {
      const response = await fetch(`/api/admin/codes/${codeId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        router.refresh()
      } else {
        console.error('Failed to delete code')
      }
    } catch (error) {
      console.error('Error deleting code:', error)
    } finally {
      setIsDeleting(null)
    }
  }

  return (
    <>
      {/* Edit Modal */}
      {editingCode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit Access Code</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSaveEdit(editingCode)
              }}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={editingCode.name}
                    onChange={(e) => setEditingCode({ ...editingCode, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email (optional)
                  </label>
                  <input
                    type="email"
                    value={editingCode.email || ''}
                    onChange={(e) => setEditingCode({ ...editingCode, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                {editingCode.type === 'bulk' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Usage Count
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="400"
                      value={editingCode.max_usage_count || 1}
                      onChange={(e) => setEditingCode({ ...editingCode, max_usage_count: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Current usage: {editingCode.usage_count || 0}
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Concurrent Sessions
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={editingCode.max_concurrent_sessions}
                      onChange={(e) => setEditingCode({ ...editingCode, max_concurrent_sessions: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                )}
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={editingCode.is_active}
                    onChange={(e) => setEditingCode({ ...editingCode, is_active: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
                    Active
                  </label>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingCode(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                        : code.type === 'bulk'
                        ? 'bg-indigo-100 text-indigo-600'
                        : 'bg-green-100 text-green-600'
                    }`}>
                      {code.type === 'center' ? (
                        <Building2 className="w-4 h-4" />
                      ) : code.type === 'bulk' ? (
                        <UserCheck className="w-4 h-4" />
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
                  {code.type === 'bulk' ? (
                    <div>
                      <div className="text-sm text-gray-900">
                        {code.usage_count || 0} / {code.max_usage_count || 0}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            ((code.usage_count || 0) / (code.max_usage_count || 1)) >= 1
                              ? 'bg-red-500'
                              : ((code.usage_count || 0) / (code.max_usage_count || 1)) >= 0.8
                              ? 'bg-amber-500'
                              : 'bg-green-500'
                          }`}
                          style={{ 
                            width: `${Math.min(((code.usage_count || 0) / (code.max_usage_count || 1)) * 100, 100)}%` 
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-900">
                      {code.max_concurrent_sessions === 1 
                        ? 'Single session' 
                        : `Up to ${code.max_concurrent_sessions}`
                      }
                    </span>
                  )}
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
                    
                    {/* Bulk code capacity warning */}
                    {code.type === 'bulk' && code.is_active && (
                      ((code.usage_count || 0) / (code.max_usage_count || 1)) >= 0.8 && (
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                      )
                    )}
                  </div>
                  
                  {code.expires_at && (
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <p className="text-xs text-gray-500">
                        Expires: {formatDate(code.expires_at)}
                      </p>
                    </div>
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
                      onClick={() => handleEdit(code)}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Edit code"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => handleDelete(code.id)}
                      disabled={isDeleting === code.id}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
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
    </>
  )
}