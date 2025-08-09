# STPPL UK and Europe - Implementation Roadmap

## Phase 1: Project Foundation (Day 1-2)

### 1.1 Initialize Next.js Project
```bash
npx create-next-app@latest live-streaming-portal --typescript --tailwind --app
cd live-streaming-portal
```

### 1.2 Install Core Dependencies
```bash
# Core UI Libraries
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
npm install @radix-ui/react-label @radix-ui/react-select
npm install @radix-ui/react-tabs @radix-ui/react-toast
npm install class-variance-authority clsx tailwind-merge
npm install lucide-react

# Supabase
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs

# Form & Validation
npm install react-hook-form zod @hookform/resolvers

# Data Fetching
npm install @tanstack/react-query

# Date & Time
npm install date-fns

# Charts for Analytics
npm install recharts

# Email
npm install @sendinblue/client
```

### 1.3 Project Structure
```
live-streaming-portal/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── code-entry/
│   │       └── page.tsx
│   ├── (admin)/
│   │   ├── admin/
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── codes/
│   │   │   │   └── page.tsx
│   │   │   ├── attendance/
│   │   │   │   └── page.tsx
│   │   │   └── emails/
│   │   │       └── page.tsx
│   ├── stream/
│   │   └── page.tsx
│   ├── api/
│   │   ├── auth/
│   │   ├── codes/
│   │   ├── sessions/
│   │   └── emails/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/
│   ├── auth/
│   ├── admin/
│   └── stream/
├── lib/
│   ├── supabase/
│   ├── email/
│   └── utils/
├── hooks/
├── types/
└── styles/
```

## Phase 2: Database & Authentication Setup (Day 3-4)

### 2.1 Supabase Configuration
```typescript
// lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// lib/supabase/server.ts
import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function createServerSupabaseClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}
```

### 2.2 Database Types
```typescript
// types/database.ts
export interface AdminUser {
  id: string
  email: string
  role: 'admin' | 'super_admin'
  created_at: string
  updated_at: string
}

export interface AccessCode {
  id: string
  code: string
  type: 'center' | 'individual'
  name: string
  email?: string
  max_concurrent_sessions: number
  is_active: boolean
  created_by: string
  created_at: string
  expires_at?: string
}

export interface Session {
  id: string
  code_id: string
  session_token: string
  ip_address: string
  user_agent: string
  started_at: string
  last_activity: string
  ended_at?: string
  is_active: boolean
}

export interface AttendanceLog {
  id: string
  code_id: string
  session_id: string
  date: string
  login_time: string
  logout_time?: string
  duration_minutes?: number
}
```

## Phase 3: Core Features Implementation (Day 5-10)

### 3.1 Code Authentication Component
```typescript
// components/auth/CodeEntry.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

const codeSchema = z.object({
  code: z.string().min(6).max(20),
})

export function CodeEntry() {
  const router = useRouter()
  const [error, setError] = useState('')
  
  const form = useForm({
    resolver: zodResolver(codeSchema),
  })
  
  const onSubmit = async (data: z.infer<typeof codeSchema>) => {
    try {
      const response = await fetch('/api/auth/code-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (response.ok) {
        const { sessionToken } = await response.json()
        // Store session token in cookie
        document.cookie = `session=${sessionToken}; path=/; secure; samesite=strict`
        router.push('/stream')
      } else {
        const error = await response.json()
        setError(error.message)
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    }
  }
  
  return (
    // Form UI implementation
  )
}
```

### 3.2 Session Management API
```typescript
// app/api/auth/code-login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { generateSessionToken } from '@/lib/auth/session'

export async function POST(request: NextRequest) {
  const { code } = await request.json()
  const supabase = await createServerSupabaseClient()
  
  // Validate code
  const { data: accessCode, error } = await supabase
    .from('access_codes')
    .select('*')
    .eq('code', code)
    .eq('is_active', true)
    .single()
  
  if (error || !accessCode) {
    return NextResponse.json(
      { message: 'Invalid code' },
      { status: 401 }
    )
  }
  
  // Check concurrent sessions
  const { data: activeSessions } = await supabase
    .from('sessions')
    .select('*')
    .eq('code_id', accessCode.id)
    .eq('is_active', true)
  
  if (accessCode.type === 'center' && activeSessions?.length >= 1) {
    return NextResponse.json(
      { message: 'This center code is already in use' },
      { status: 403 }
    )
  }
  
  if (activeSessions?.length >= accessCode.max_concurrent_sessions) {
    return NextResponse.json(
      { message: 'Maximum concurrent sessions reached' },
      { status: 403 }
    )
  }
  
  // Create new session
  const sessionToken = generateSessionToken()
  const { data: session } = await supabase
    .from('sessions')
    .insert({
      code_id: accessCode.id,
      session_token: sessionToken,
      ip_address: request.ip || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
    })
    .select()
    .single()
  
  // Log attendance
  await supabase
    .from('attendance_logs')
    .insert({
      code_id: accessCode.id,
      session_id: session.id,
      date: new Date().toISOString().split('T')[0],
      login_time: new Date().toISOString(),
    })
  
  return NextResponse.json({ sessionToken })
}
```

### 3.3 Admin Dashboard Components
```typescript
// components/admin/CodeGenerator.tsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { generateRandomCode } from '@/lib/utils/code-generator'

interface CodeGeneratorProps {
  onGenerate: (codes: any[]) => void
}

export function CodeGenerator({ onGenerate }: CodeGeneratorProps) {
  const [generatedCodes, setGeneratedCodes] = useState<any[]>([])
  
  const form = useForm({
    defaultValues: {
      type: 'individual',
      count: 1,
      maxSessions: 1,
      prefix: 'STPPL',
      expiresAt: '',
    }
  })
  
  const handleGenerate = async (data: any) => {
    const codes = []
    for (let i = 0; i < data.count; i++) {
      codes.push({
        code: `${data.prefix}-${generateRandomCode()}`,
        type: data.type,
        max_concurrent_sessions: data.maxSessions,
        expires_at: data.expiresAt || null,
      })
    }
    
    // Save to database
    const response = await fetch('/api/codes/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codes }),
    })
    
    if (response.ok) {
      const savedCodes = await response.json()
      setGeneratedCodes(savedCodes)
      onGenerate(savedCodes)
    }
  }
  
  return (
    // Form UI for code generation
  )
}
```

## Phase 4: Video Streaming Integration (Day 11-12)

### 4.1 Video Player Component
```typescript
// components/stream/VideoPlayer.tsx
'use client'

import { useEffect, useRef } from 'react'

interface VideoPlayerProps {
  embedCode?: string
  sessionId: string
}

export function VideoPlayer({ embedCode, sessionId }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    if (embedCode && containerRef.current) {
      // Insert Flow Player embed code
      containerRef.current.innerHTML = embedCode
      
      // Track viewing time
      const interval = setInterval(async () => {
        await fetch('/api/sessions/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        })
      }, 30000) // Every 30 seconds
      
      return () => clearInterval(interval)
    }
  }, [embedCode, sessionId])
  
  // Fallback player if no embed code
  if (!embedCode) {
    return (
      <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
        <video
          controls
          className="w-full h-full"
          poster="/placeholder-video.jpg"
        >
          <source src="/sample-video.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
    )
  }
  
  return <div ref={containerRef} className="aspect-video" />
}
```

## Phase 5: Email Integration (Day 13-14)

### 5.1 Brevo Email Service
```typescript
// lib/email/brevo.ts
import * as SibApiV3Sdk from '@sendinblue/client'

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi()
apiInstance.setApiKey(
  SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY!
)

export async function sendAccessCodeEmail(
  to: string,
  name: string,
  code: string,
  type: 'center' | 'individual'
) {
  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail()
  
  sendSmtpEmail.subject = 'Your STPPL UK and Europe Access Code'
  sendSmtpEmail.htmlContent = `
    <h2>Welcome to STPPL UK and Europe!</h2>
    <p>Dear ${name},</p>
    <p>Your access code for the event is: <strong>${code}</strong></p>
    <p>Event Dates: August 14-17, 2025</p>
    ${type === 'center' ? 
      '<p><em>Note: This is a center code and can only be used at one location at a time.</em></p>' :
      '<p><em>This code can be used for multiple concurrent sessions as configured.</em></p>'
    }
    <p>Visit <a href="${process.env.NEXT_PUBLIC_APP_URL}">${process.env.NEXT_PUBLIC_APP_URL}</a> to access the stream.</p>
  `
  sendSmtpEmail.sender = {
    name: 'STPPL Events',
    email: process.env.BREVO_SENDER_EMAIL!,
  }
  sendSmtpEmail.to = [{ email: to, name }]
  
  try {
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail)
    return { success: true, messageId: data.messageId }
  } catch (error) {
    console.error('Email send error:', error)
    return { success: false, error }
  }
}
```

## Phase 6: Analytics & Reporting (Day 15-16)

### 6.1 Attendance Dashboard
```typescript
// components/admin/AttendanceChart.tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'

export function AttendanceChart() {
  const { data } = useQuery({
    queryKey: ['attendance'],
    queryFn: async () => {
      const response = await fetch('/api/attendance/daily')
      return response.json()
    },
  })
  
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Daily Attendance</h3>
      <LineChart width={800} height={400} data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="centers" stroke="#8884d8" />
        <Line type="monotone" dataKey="individuals" stroke="#82ca9d" />
      </LineChart>
    </div>
  )
}
```

## Phase 7: Testing & Optimization (Day 17-18)

### 7.1 Testing Checklist
- [ ] Code validation (valid/invalid/expired)
- [ ] Concurrent session limits
- [ ] Session timeout handling
- [ ] Email delivery
- [ ] Video streaming quality
- [ ] Admin dashboard functionality
- [ ] Attendance tracking accuracy
- [ ] Mobile responsiveness
- [ ] Load testing (multiple concurrent users)
- [ ] Security testing (SQL injection, XSS)

### 7.2 Performance Optimizations
```typescript
// next.config.js
module.exports = {
  images: {
    domains: ['your-cdn.com'],
  },
  experimental: {
    optimizeCss: true,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
}
```

## Phase 8: Deployment (Day 19-20)

### 8.1 Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables in Vercel dashboard
```

### 8.2 Production Checklist
- [ ] Environment variables configured
- [ ] Database migrations completed
- [ ] SSL certificates active
- [ ] CDN configured for static assets
- [ ] Error tracking (Sentry) configured
- [ ] Analytics configured
- [ ] Backup strategy in place
- [ ] Monitoring alerts set up
- [ ] Load balancing configured
- [ ] Rate limiting enabled

## Estimated Timeline

| Phase | Duration | Deliverables |
|-------|----------|-------------|
| Foundation | 2 days | Project setup, dependencies |
| Database & Auth | 2 days | Supabase integration, schemas |
| Core Features | 6 days | Code auth, session management |
| Video Streaming | 2 days | Flow Player integration |
| Email Integration | 2 days | Brevo setup, templates |
| Analytics | 2 days | Dashboard, reporting |
| Testing | 2 days | QA, bug fixes |
| Deployment | 2 days | Production setup |
| **Total** | **20 days** | **Complete platform** |

## Risk Mitigation

1. **Video Streaming Issues**
   - Fallback to backup CDN
   - Multiple quality options
   - Buffering optimization

2. **Database Overload**
   - Connection pooling
   - Read replicas
   - Caching layer (Redis)

3. **Authentication Failures**
   - Retry mechanism
   - Offline code validation
   - Manual override option

4. **Email Delivery**
   - Multiple email providers
   - Retry queue
   - SMS backup (optional)