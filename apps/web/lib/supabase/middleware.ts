/**
 * Middleware Supabase Client
 * 
 * USE THIS IN:
 * - middleware.ts at the root of your app
 * 
 * WHY A SEPARATE CLIENT?
 * Middleware runs BEFORE your page loads. It intercepts every request.
 * It has access to both the incoming `request` and outgoing `response`.
 * 
 * This is crucial for auth because:
 * 1. We can refresh expired sessions before the page loads
 * 2. We can redirect unauthenticated users away from protected routes
 * 3. We can redirect authenticated users away from auth pages
 * 
 * The cookie handling here is different:
 * - We read from `request.cookies`
 * - We write to `response.cookies` (so the browser gets the updated session)
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // Start with a basic response that continues to the requested page
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // First, set cookies on the request (for downstream code)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // Then create a new response with updated cookies
          supabaseResponse = NextResponse.next({
            request,
          })
          // Finally, set cookies on the response (for the browser)
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: DO NOT remove this line!
  // Calling getUser() refreshes the session if it's expired.
  // Without this, users would be logged out after the session expires
  // (default: 1 hour) even if they're still active.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Define which routes require authentication
  const protectedRoutes = ['/dashboard', '/workouts', '/nutrition', '/profile']
  const authRoutes = ['/auth', '/auth/callback']
  
  const isProtectedRoute = protectedRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )
  const isAuthRoute = authRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )

  // Redirect unauthenticated users to login
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from auth pages
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}


