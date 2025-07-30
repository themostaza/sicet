import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { CookieOptions } from '@supabase/ssr'

type Role = 'admin' | 'operator' | 'referrer'

// Define route permissions for each role
const rolePermissions = {
  admin: ['*'], // Admin can access everything
  operator: [
    // '/devices', 
    // '/device/*', 
    '/device/*/scan',  // Allow access to scan route
    '/todolist',  // Allow access to todolist list page
    '/todolist/view/*/*/*/*'  // Allow access to todolist view with todolist ID
  ],
  referrer: [
    '/devices',
    '/device/*',
    '/kpis', 
    '/kpi/*',
    '/todolist',
    '/todolist/view/*/*/*/*'
  ]
} as const

// Helper function to check if a path matches a pattern
function pathMatches(pattern: string, path: string): boolean {
  if (pattern === '*') return true
  
  // If pattern contains wildcards, convert to regex
  if (pattern.includes('*')) {
    // Escape special regex characters except *
    const escapedPattern = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    // Replace * with regex pattern for matching any characters except /
    const regexPattern = '^' + escapedPattern.replace(/\*/g, '[^/]*') + '$'
    const regex = new RegExp(regexPattern)
    return regex.test(path)
  }
  
  return pattern === path
}

// Helper function to check if a role has access to a path
function hasAccess(role: Role, path: string, referer?: string): boolean {
  const allowedPaths = rolePermissions[role]
  
  // Special case for operator accessing todolist
  if (role === 'operator') {
    if (path === '/todolist') {
      // Allow access to todolist list page
      return true
    }
    if (path.startsWith('/todolist/view/')) {
      // Allow access if coming from a device scan page or todolist list page
      return ((referer?.includes('/device/') && referer?.includes('/scan')) || 
              referer?.includes('/todolist')) ?? false
    }
  }

  // Special case for referrer accessing todolist
  if (role === 'referrer' && path.startsWith('/todolist/')) {
    return true // Allow referrers to access all todolist routes
  }
  
  return allowedPaths.some(pattern => pathMatches(pattern, path))
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  // Create a Supabase client using our existing server client function
  const supabase = await createServerSupabaseClient()

  // Get the current path and referer
  const path = req.nextUrl.pathname
  const referer = req.headers.get('referer')

  // Skip middleware for API routes - they handle their own authentication
  if (path.startsWith('/api/')) {
    return res
  }

  // Define public routes that don't require authentication
  const publicRoutes = [
    '/auth/login', 
    '/register', 
    '/auth/reset-password',
    '/reset'  // Pagina di reset password
  ]

  // Check if the path is public
  if (publicRoutes.includes(path)) {
    // For public routes, we still need to check if user is authenticated
    // to redirect them if they try to access login/register while logged in
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      // If there's an error getting the user, allow access to public routes
      return res
    }
    
    if (user) {
      // Get user role to determine where to redirect
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('auth_id', user.id)
        .single()

      // If user is authenticated and trying to access login/register, redirect based on role
      let defaultPath = '/devices'
      if (profile?.role === 'operator') {
        defaultPath = '/todolist'
      } else if (profile?.role === 'referrer') {
        defaultPath = '/devices'
      }
      
      const redirectUrl = new URL(defaultPath, req.url)
      return NextResponse.redirect(redirectUrl)
    }
    
    // If not authenticated, allow access to public routes
    return res
  }

  // For protected routes, verify authentication
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    // If not authenticated, redirect to login
    // but preserve the original URL to redirect back after login
    const redirectUrl = new URL('/auth/login', req.url)
    redirectUrl.searchParams.set('redirectTo', req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // If authenticated, check role-based permissions
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('auth_id', user.id)
    .single()

  if (profileError || !profile) {
    // If profile not found, redirect to login
    const redirectUrl = new URL('/auth/login', req.url)
    return NextResponse.redirect(redirectUrl)
  }

  const role = profile.role as Role | undefined

  // If role is not found or user doesn't have access to the path
  if (!role || !hasAccess(role, path, referer ?? undefined)) {
    // Redirect based on role to their appropriate default page
    let defaultPath = '/devices'
    if (role === 'operator') {
      defaultPath = '/todolist'
    } else if (role === 'referrer') {
      defaultPath = '/devices'
    }
    
    const redirectUrl = new URL(defaultPath, req.url)
    return NextResponse.redirect(redirectUrl)
  }

  // Blocca l'accesso alle pagine di creazione per operator
  const creationPages = ['/device/new', '/kpi/new', '/todolist/new']
  if (role === 'operator' && creationPages.includes(path)) {
    // Redirect alla pagina principale consentita
    return NextResponse.redirect(new URL('/todolist', req.url))
  }

  return res
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
} 