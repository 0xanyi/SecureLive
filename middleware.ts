import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const secretKey = process.env.JWT_SECRET
const key = new TextEncoder().encode(secretKey)

export async function middleware(request: NextRequest) {
  // Only apply middleware to admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    
    const adminSession = request.cookies.get('admin_session')?.value

    if (!adminSession) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    try {
      await jwtVerify(adminSession, key, {
        algorithms: ['HS256'],
      })
      // Session is valid, continue
      return NextResponse.next()
    } catch (error) {
      // Invalid session, redirect to login
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('admin_session')
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*']
}