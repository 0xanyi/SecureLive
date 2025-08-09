'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, LogOut, User, Clock, Loader2 } from 'lucide-react'
import { LogoIcon } from '@/components/ui/LogoIcon'
import type { Session, AccessCode } from '@/types/database'

interface StreamHeaderProps {
  accessCode: AccessCode
  session: Session
}

export function StreamHeader({ accessCode, session }: StreamHeaderProps) {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id }),
      })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Redirect regardless of API success/failure
      router.push('/')
    }
  }

  const sessionDuration = () => {
    const start = new Date(session.started_at)
    const now = new Date()
    const diffMs = now.getTime() - start.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const hours = Math.floor(diffMins / 60)
    const minutes = diffMins % 60
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  return (
    <header className="bg-gray-800 border-b border-gray-700">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Left side - Logo and Title */}
          <div className="flex items-center gap-4">
            <LogoIcon size={40} />
            <div>
              <h1 className="text-white font-semibold text-lg">
                Secure Live Stream Portal
              </h1>
              <p className="text-gray-400 text-sm hidden sm:block">
                Live Stream Access
              </p>
            </div>
          </div>



          {/* Right side - User info and logout */}
          <div className="flex items-center gap-4">
            {/* Session info */}
            <div className="hidden md:flex items-center gap-4 text-sm text-gray-300">
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                <span>{accessCode.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{sessionDuration()}</span>
              </div>
            </div>

            <div className="h-6 w-px bg-gray-600 hidden md:block"></div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

        {/* Mobile session info */}
        <div className="md:hidden pb-3 flex items-center justify-between text-sm text-gray-300">
          <div className="flex items-center gap-1">
            <User className="w-4 h-4" />
            <span>{accessCode.name}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{sessionDuration()}</span>
          </div>
        </div>
      </div>
    </header>
  )
}