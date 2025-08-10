'use client'

import { useState, useEffect } from 'react'
import { Users, Plus, Edit, Trash2, Shield, UserCheck, Loader2, Eye, EyeOff } from 'lucide-react'

interface AdminUser {
  id: string
  email: string
  name: string
  role: 'admin' | 'super_admin' | 'code_generator'
  permissions: {
    canManageUsers?: boolean
    canManageSettings?: boolean
    canManageEvents?: boolean
    canGenerateCodes?: boolean
    canViewAnalytics?: boolean
    canManageEmails?: boolean
  }
  last_login?: string
  created_at: string
  created_by?: string
}

export function UserManagement() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    role: 'code_generator' as 'admin' | 'super_admin' | 'code_generator',
    permissions: {
      canManageUsers: false,
      canManageSettings: false,
      canManageEvents: false,
      canGenerateCodes: true,
      canViewAnalytics: false,
      canManageEmails: false
    }
  })

  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/users')
      const data = await response.json()
      
      if (data.success) {
        setUsers(data.users)
      } else {
        alert('Error loading users: ' + data.error)
      }
    } catch (error) {
      console.error('Error loading users:', error)
      alert('Error loading users. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      email: '',
      name: '',
      password: '',
      role: 'code_generator',
      permissions: {
        canManageUsers: false,
        canManageSettings: false,
        canManageEvents: false,
        canGenerateCodes: true,
        canViewAnalytics: false,
        canManageEmails: false
      }
    })
    setEditingUser(null)
    setShowCreateModal(false)
    setShowPassword(false)
  }

  const handleRoleChange = (role: 'admin' | 'super_admin' | 'code_generator') => {
    const defaultPermissions = {
      admin: {
        canManageUsers: false,
        canManageSettings: true,
        canManageEvents: true,
        canGenerateCodes: true,
        canViewAnalytics: true,
        canManageEmails: true
      },
      super_admin: {
        canManageUsers: true,
        canManageSettings: true,
        canManageEvents: true,
        canGenerateCodes: true,
        canViewAnalytics: true,
        canManageEmails: true
      },
      code_generator: {
        canManageUsers: false,
        canManageSettings: false,
        canManageEvents: false,
        canGenerateCodes: true,
        canViewAnalytics: false,
        canManageEmails: false
      }
    }

    setFormData(prev => ({
      ...prev,
      role,
      permissions: defaultPermissions[role]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.email || !formData.name || (!editingUser && !formData.password)) {
      alert('Please fill in all required fields')
      return
    }

    try {
      setIsSubmitting(true)
      
      const url = editingUser 
        ? `/api/admin/users/${editingUser.id}`
        : '/api/admin/users'
      
      const method = editingUser ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()
      
      if (data.success) {
        alert(data.message)
        resetForm()
        loadUsers()
      } else {
        alert('Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error saving user:', error)
      alert('Error saving user. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (user: AdminUser) => {
    setFormData({
      email: user.email,
      name: user.name,
      password: '',
      role: user.role,
      permissions: user.permissions
    })
    setEditingUser(user)
    setShowCreateModal(true)
  }

  const handleDelete = async (user: AdminUser) => {
    if (!confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()
      
      if (data.success) {
        alert(data.message)
        loadUsers()
      } else {
        alert('Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Error deleting user. Please try again.')
    }
  }

  const getRoleBadge = (role: string) => {
    const styles = {
      super_admin: 'bg-red-100 text-red-800 border-red-200',
      admin: 'bg-blue-100 text-blue-800 border-blue-200',
      code_generator: 'bg-green-100 text-green-800 border-green-200'
    }
    
    const labels = {
      super_admin: 'Super Admin',
      admin: 'Admin',
      code_generator: 'Code Generator'
    }

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${styles[role as keyof typeof styles]}`}>
        {labels[role as keyof typeof labels]}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading users...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="text-gray-600">Manage admin users and their permissions</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Permissions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRoleBadge(user.role)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(user.permissions).map(([key, value]) => {
                        if (!value) return null
                        const labels = {
                          canManageUsers: 'Users',
                          canManageSettings: 'Settings',
                          canManageEvents: 'Events',
                          canGenerateCodes: 'Codes',
                          canViewAnalytics: 'Analytics',
                          canManageEmails: 'Emails'
                        }
                        return (
                          <span key={key} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                            {labels[key as keyof typeof labels]}
                          </span>
                        )
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded"
                        title="Edit user"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        className="text-red-600 hover:text-red-900 p-1 rounded"
                        title="Delete user"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingUser ? 'Edit User' : 'Create New User'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password {!editingUser && '*'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required={!editingUser}
                    placeholder={editingUser ? 'Leave blank to keep current password' : ''}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => handleRoleChange(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="code_generator">Code Generator</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permissions
                </label>
                <div className="space-y-2">
                  {Object.entries(formData.permissions).map(([key, value]) => {
                    const labels = {
                      canManageUsers: 'Manage Users',
                      canManageSettings: 'Manage Settings',
                      canManageEvents: 'Manage Events',
                      canGenerateCodes: 'Generate Codes',
                      canViewAnalytics: 'View Analytics',
                      canManageEmails: 'Manage Emails'
                    }
                    return (
                      <label key={key} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            permissions: {
                              ...prev.permissions,
                              [key]: e.target.checked
                            }
                          }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {labels[key as keyof typeof labels]}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {editingUser ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4" />
                      {editingUser ? 'Update User' : 'Create User'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}