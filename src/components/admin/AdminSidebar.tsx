'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { 
  LayoutDashboard, 
  Ticket, 
  Mail, 
  BarChart3, 
  Users, 
  Settings,
  Calendar,
  UserCog
} from 'lucide-react'
import { Logo } from '@/components/ui/Logo'

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
}

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard, permission: null },
  { name: 'Events', href: '/admin/events', icon: Calendar, permission: 'canManageEvents' as const },
  { name: 'Access Codes', href: '/admin/codes', icon: Ticket, permission: 'canGenerateCodes' as const },
  { name: 'Email Center', href: '/admin/emails', icon: Mail, permission: 'canManageEmails' as const },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3, permission: 'canViewAnalytics' as const },
  { name: 'Active Sessions', href: '/admin/sessions', icon: Users, permission: null },
  { name: 'Admin Users', href: '/admin/users', icon: UserCog, permission: 'canManageUsers' as const },
  { name: 'Settings', href: '/admin/settings', icon: Settings, permission: 'canManageSettings' as const },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null)

  useEffect(() => {
    // Load current user info to check permissions
    const loadCurrentUser = async () => {
      try {
        const response = await fetch('/api/admin/validate')
        const data = await response.json()
        if (data.success && data.admin) {
          setCurrentUser(data.admin)
        }
      } catch (error) {
        console.error('Error loading current user:', error)
      }
    }
    
    loadCurrentUser()
  }, [])

  const hasPermission = (permission: string | null): boolean => {
    if (!permission) return true // No permission required
    if (!currentUser) return false
    if (currentUser.role === 'super_admin') return true
    return currentUser.permissions[permission as keyof typeof currentUser.permissions] === true
  }

  const visibleNavigation = navigation.filter(item => hasPermission(item.permission))

  return (
    <div className="w-64 bg-white shadow-sm border-r border-gray-200">
      <div className="p-6 flex justify-center">
        <Logo size="md" variant="dark" showText={false} />
      </div>
      
      <nav className="px-3 pb-6">
        <ul className="space-y-1">
          {visibleNavigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}