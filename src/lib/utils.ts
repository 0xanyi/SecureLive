import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateRandomCode(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export function generateSessionToken(): string {
  return crypto.randomUUID()
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(date))
}

export function formatEventPeriod(startDate: string | Date, endDate: string | Date): string {
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  const formatDateWithComma = (date: Date): string => {
    const weekday = date.toLocaleDateString('en-GB', { weekday: 'long' })
    const day = date.toLocaleDateString('en-GB', { day: 'numeric' })
    const month = date.toLocaleDateString('en-GB', { month: 'long' })
    const year = date.toLocaleDateString('en-GB', { year: '2-digit' })
    
    return `${weekday}, ${day} ${month} ${year}`
  }
  
  const startDay = formatDateWithComma(start)
  const endDay = formatDateWithComma(end)
  
  // If same day, just show the day
  if (start.toDateString() === end.toDateString()) {
    return startDay
  }
  
  return `${startDay} - ${endDay}`
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  
  if (hours === 0) {
    return `${mins}m`
  }
  
  return `${hours}h ${mins}m`
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function isValidCode(code: string): boolean {
  // Code should be 6-20 characters, alphanumeric with hyphens
  const codeRegex = /^[A-Z0-9-]{6,20}$/
  return codeRegex.test(code)
}

export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  return 'unknown'
}

export function getUserAgent(request: Request): string {
  return request.headers.get('user-agent') || 'unknown'
}

export function calculateDuration(startTime: string, endTime: string): number {
  const start = new Date(startTime)
  const end = new Date(endTime)
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60))
}

export function isEventActive(): boolean {
  const now = new Date()
  const eventStart = new Date('2025-08-14T00:00:00Z')
  const eventEnd = new Date('2025-08-17T23:59:59Z')
  
  return now >= eventStart && now <= eventEnd
}

export function getEventDays(): Array<{ date: string; day: string; active: boolean }> {
  const days = [
    { date: '2025-08-14', day: 'Thursday', active: false },
    { date: '2025-08-15', day: 'Friday', active: false },
    { date: '2025-08-16', day: 'Saturday', active: false },
    { date: '2025-08-17', day: 'Sunday', active: false },
  ]
  
  const today = new Date().toISOString().split('T')[0]
  
  return days.map(day => ({
    ...day,
    active: day.date === today
  }))
}