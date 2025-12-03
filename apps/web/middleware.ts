/**
 * Next.js Middleware
 * 
 * WHAT IS MIDDLEWARE?
 * Middleware runs BEFORE every request to your app. Think of it as a bouncer
 * at a club - it checks if you're allowed in before you even reach the door.
 * 
 * WHAT DOES THIS DO?
 * 1. Refreshes the user's session (so they don't get randomly logged out)
 * 2. Redirects logged-out users away from protected pages (like /dashboard)
 * 3. Redirects logged-in users away from auth pages (like /auth)
 * 
 * The `matcher` config at the bottom tells Next.js which routes to run
 * middleware on. We exclude static files and images for performance.
 */

import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (images, etc.)
     * 
     * This regex is the recommended pattern from Supabase docs.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

