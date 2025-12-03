/**
 * Test Page - Validates Supabase Connection
 * 
 * WHAT CHANGED?
 * - Using .maybeSingle() instead of .single()
 * 
 * WHY?
 * - .single() throws an error if 0 rows are returned
 * - .maybeSingle() returns null if 0 rows (no error)
 * 
 * This is useful when you're not sure if data exists yet.
 */

import { createClient } from '@/lib/supabase/server';

export default async function TestPage() {
    const supabase = await createClient();
    
    // Get current user (if logged in)
    const { data: { user } } = await supabase.auth.getUser();
    
    // Try to get profile - maybeSingle() won't error on 0 rows
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .limit(1)
        .maybeSingle();

    return (
        <div className="min-h-screen bg-slate-950 p-8">
            <div className="max-w-2xl mx-auto space-y-6">
                <h1 className="text-3xl font-bold text-white">Supabase Connection Test</h1>
                
                {/* Auth Status */}
                <div className="rounded-xl bg-slate-900 border border-slate-800 p-6">
                    <h2 className="text-lg font-semibold text-white mb-3">Auth Status</h2>
                    {user ? (
                        <div className="text-emerald-400">
                            ✓ Logged in as: {user.email}
                        </div>
                    ) : (
                        <div className="text-amber-400">
                            ⚠ Not logged in - <a href="/auth" className="underline hover:text-amber-300">Sign in here</a>
                        </div>
                    )}
                </div>
                
                {/* Profile Data */}
                <div className="rounded-xl bg-slate-900 border border-slate-800 p-6">
                    <h2 className="text-lg font-semibold text-white mb-3">Profile Data</h2>
                    {profileError ? (
                        <div className="text-red-400">
                            Error: {profileError.message}
                        </div>
                    ) : profile ? (
                        <pre className="text-sm text-slate-300 overflow-auto">
                            {JSON.stringify(profile, null, 2)}
                        </pre>
                    ) : (
                        <div className="text-slate-400">
                            No profile found. This is expected if you haven&apos;t signed up yet.
                        </div>
                    )}
                </div>
                
                {/* Raw Response */}
                <details className="rounded-xl bg-slate-900 border border-slate-800 p-6">
                    <summary className="text-sm text-slate-500 cursor-pointer">Raw Response</summary>
                    <pre className="mt-4 text-xs text-slate-400 overflow-auto">
                        User: {JSON.stringify(user, null, 2)}
                        {'\n\n'}
                        Profile: {JSON.stringify(profile, null, 2)}
                        {'\n\n'}
                        Error: {JSON.stringify(profileError, null, 2)}
                    </pre>
                </details>
            </div>
        </div>
    );
}