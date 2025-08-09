'use client'

import { useEffect, useState } from 'react'

export function AdminFooter() {
  const [siteName, setSiteName] = useState('Secure Live Stream Portal')

  // Load site settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/admin/settings')
        const data = await response.json()
        
        if (data.success && data.settings.general) {
          setSiteName(data.settings.general.siteName || 'Secure Live Stream Portal')
        }
      } catch (error) {
        console.error('Error loading settings for footer:', error)
      }
    }

    loadSettings()
  }, [])

  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="px-6 py-4">
        <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-gray-500">
          <div className="mb-2 sm:mb-0">
            © {new Date().getFullYear()} {siteName} • Admin Dashboard
          </div>
          <div className="flex items-center gap-4">
            <span>All rights reserved</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">Secure Access Portal</span>
          </div>
        </div>
      </div>
    </footer>
  )
}