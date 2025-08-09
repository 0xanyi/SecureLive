'use client'

import { Shield, Play } from 'lucide-react'

interface LogoIconProps {
  size?: number
  className?: string
}

export function LogoIcon({ size = 32, className = '' }: LogoIconProps) {
  return (
    <div 
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Background Circle */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-full shadow-lg"></div>
      
      {/* Shield Icon */}
      <Shield 
        className="relative z-10 text-white" 
        size={size * 0.5}
      />
      
      {/* Play Icon Overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <Play 
          className="text-white/80 ml-0.5" 
          size={size * 0.33}
          fill="currentColor" 
        />
      </div>
    </div>
  )
}