'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { AdminFooter } from '@/components/admin/AdminFooter'
import type { AdminUser } from '@/types/database'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const validateSession = async () => {
      try {
        const response = await fetch('/api/admin/validate', {
          credentials: 'include'
        })
        
        if (response.ok) {
          const data = await response.json()
          setAdmin(data.admin)
        } else {
          router.push('/login')
          return
        }
      } catch (error) {
        console.error('Session validation error:', error)
        router.push('/login')
        return
      } finally {
        setIsLoading(false)
      }
    }

    validateSession()
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!admin) {
    return null // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AdminHeader admin={admin} />
      <div className="flex flex-1">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <main className="flex-1 p-6">
            {children}
          </main>
          <AdminFooter />
        </div>
      </div>
    </div>
  )
}