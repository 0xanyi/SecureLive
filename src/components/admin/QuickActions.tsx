'use client'

import Link from 'next/link'
import { Plus, Mail, BarChart3, Download, Users, Settings } from 'lucide-react'

export function QuickActions() {
  const actions = [
    {
      title: 'Generate Codes',
      description: 'Create new access codes',
      href: '/admin/codes/generate',
      icon: Plus,
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      title: 'Send Emails',
      description: 'Send codes via email',
      href: '/admin/emails',
      icon: Mail,
      color: 'bg-green-500 hover:bg-green-600',
    },
    {
      title: 'View Analytics',
      description: 'Check attendance stats',
      href: '/admin/analytics',
      icon: BarChart3,
      color: 'bg-purple-500 hover:bg-purple-600',
    },
    {
      title: 'Export Data',
      description: 'Download reports',
      href: '/admin/export',
      icon: Download,
      color: 'bg-orange-500 hover:bg-orange-600',
    },
    {
      title: 'Active Sessions',
      description: 'Monitor live users',
      href: '/admin/sessions',
      icon: Users,
      color: 'bg-red-500 hover:bg-red-600',
    },
    {
      title: 'Settings',
      description: 'Configure system',
      href: '/admin/settings',
      icon: Settings,
      color: 'bg-gray-500 hover:bg-gray-600',
    },
  ]

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
        <p className="text-sm text-gray-600">Common administrative tasks</p>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-1 gap-3">
          {actions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors group"
            >
              <div className={`p-2 rounded-lg text-white transition-colors ${action.color}`}>
                <action.icon className="w-4 h-4" />
              </div>
              
              <div className="flex-1">
                <p className="font-medium text-gray-900 group-hover:text-gray-700">
                  {action.title}
                </p>
                <p className="text-sm text-gray-600">
                  {action.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}