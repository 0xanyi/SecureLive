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
  Settings 
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Access Codes', href: '/admin/codes', icon: Ticket },
  { name: 'Email Center', href: '/admin/emails', icon: Mail },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Active Sessions', href: '/admin/sessions', icon: Users },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()
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
        console.error('Error loading settings for sidebar:', error)
      }
    }

    loadSettings()
  }, [])

  return (
    <div className="w-64 bg-white shadow-sm border-r border-gray-200">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-900">{siteName.split(' ').slice(0, 2).join(' ')} Admin</h2>
        <p className="text-sm text-gray-500">{siteDescription}</p>
      </div>
      
      <nav className="px-3 pb-6">
        <ul className="space-y-1">
          {navigation.map((item) => {
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