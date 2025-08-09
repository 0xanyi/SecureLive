'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, User, LogOut, Loader2 } from 'lucide-react'
import type { AdminUser } from '@/types/database'

interface AdminHeaderProps {
  admin: AdminUser
}

export function AdminHeader({ admin }: AdminHeaderProps) {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [siteName, setSiteName] = useState('Secure Live Stream Portal')
  const [siteDescription, setSiteDescription] = useState('Admin Dashboard')

  // Load site settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/admin/settings')
        const data = await response.json()
        
        if (data.success && data.settings.general) {
          setSiteName(data.settings.general.siteName || 'Secure Live Stream Portal')
          setSiteDescription(data.settings.general.siteDescription || 'Admin Dashboard')
        }
      } catch (error) {
        console.error('Error loading settings for header:', error)
      }
    }

    loadSettings()
  }, [])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
      })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      router.push('/login')
    }
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left side - Title */}
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {siteName} Admin
            </h1>
            <p className="text-sm text-gray-500">
              {siteDescription}
            </p>
          </div>

          {/* Right side - User menu */}
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
              <Bell className="w-5 h-5" />
            </button>

            {/* User info */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {admin.email}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {admin.role.replace('_', ' ')}
                </p>
              </div>
              
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingOut ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}