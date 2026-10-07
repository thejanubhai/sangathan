import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import { NextResponse } from 'next/server'

import 'server-only'

export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase secret-key configuration')
  }

  // Use the service role key to bypass RLS.
  // This client should ONLY be used in:
  // 1. Webhooks
  // 2. Cron jobs
  // 3. Admin-specific server actions that need to bypass normal RLS rules
  return createSupabaseClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

const ALLOWED_IPS = (process.env.ALLOWED_SERVICE_IPS || '').split(',').filter(Boolean)

export function getCallerIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
    || 'unknown'
}

export function checkServiceAccess(request: Request): { allowed: boolean; reason?: string } {
  const ip = getCallerIp(request)

  if (ALLOWED_IPS.length === 0) {
    // Fail-closed: if no IPs are configured, only allow localhost/known-safe origins
    if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') {
      return { allowed: true }
    }
    return { allowed: false, reason: 'Service access not configured - ALLOWED_SERVICE_IPS is empty' }
  }

  if (ip === 'unknown') {
    return { allowed: false, reason: 'Could not determine caller IP' }
  }

  if (!ALLOWED_IPS.includes(ip)) {
    return { allowed: false, reason: `IP ${ip} not in whitelist` }
  }

  return { allowed: true }
}

export function serviceAccessGuard(request: Request): NextResponse | null {
  const check = checkServiceAccess(request)
  if (!check.allowed) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }
  return null
}
