/**
 * Auth Callback Route Handler
 * 
 * WHAT IS THIS?
 * When users click the confirmation link in their email, Supabase redirects
 * them here with a special `code` parameter. This route:
 * 
 * 1. Extracts the code from the URL
 * 2. Exchanges it for a session (using Supabase's exchangeCodeForSession)
 * 3. Sets session cookies
 * 4. Redirects to the dashboard
 * 
 * WHY A ROUTE HANDLER (not a page)?
 * Route handlers are for API-like endpoints. We don't need to render
 * any UI here - we just process the code and redirect. Using a route
 * handler is cleaner and faster than a full page component.
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Where to redirect after successful auth (default: dashboard)
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    
    // Exchange the code for a session
    // This sets the auth cookies automatically
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Success! Redirect to dashboard (or wherever 'next' points)
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // If we get here, something went wrong
  // Redirect to an error page (or back to auth with error)
  return NextResponse.redirect(`${origin}/auth?error=Could not authenticate`)
}

