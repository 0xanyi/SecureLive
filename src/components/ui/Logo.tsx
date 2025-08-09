'use client'

import { Shield, Play } from 'lucide-react'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'light' | 'dark'
  showText?: boolean
  className?: string
}

export function Logo({ 
  size = 'md', 
  variant = 'dark', 
  showText = true, 
  className = '' 
}: LogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  }

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl'
  }

  const colorClasses = {
    light: 'text-white',
    dark: 'text-gray-900'
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Logo Icon */}
      <div className={`relative ${sizeClasses[size]} flex items-center justify-center`}>
        {/* Background Circle */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-full shadow-lg"></div>
        
        {/* Shield Icon */}
        <Shield className="relative z-10 w-1/2 h-1/2 text-white" />
        
        {/* Play Icon Overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Play className="w-1/3 h-1/3 text-white/80 ml-0.5" fill="currentColor" />
        </div>
      </div>

      {/* Logo Text */}
      {showText && (
        <div className={`${colorClasses[variant]}`}>
          <div className={`font-bold ${textSizeClasses[size]} leading-tight`}>
            Secure Live Stream Portal
          </div>
          {size !== 'sm' && (
            <div className={`text-xs ${variant === 'light' ? 'text-gray-300' : 'text-gray-600'} uppercase tracking-wide`}>
              Professional Streaming
            </div>
          )}
        </div>
      )}
    </div>
  )
}