'use client'

import { useEffect, useState } from 'react'

export function DashboardHeader() {
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
        console.error('Error loading settings for dashboard header:', error)
      }
    }

    loadSettings()
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="text-gray-600">
        Overview of {siteName} management
      </p>
    </div>
  )
}