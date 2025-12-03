/**
 * Browser/Client Supabase Client
 * 
 * USE THIS IN:
 * - Client components (components with 'use client' directive)
 * - Event handlers (onClick, onSubmit, etc.)
 * - useEffect hooks
 * 
 * WHY A SEPARATE CLIENT?
 * In the browser, cookies are accessed via `document.cookie`.
 * The @supabase/ssr package's `createBrowserClient` handles this automatically.
 * It also sets up listeners to keep the session in sync across tabs.
 */

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}


