import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Define route permissions for each role
const rolePermissions = {
  admin: ['*'], // Admin can access everything
  operator: [
    '/devices', 
    '/device/*', 
    '/device/*/scan',  // Allow access to scan route
    '/todolist/view/*/*/*'  // Allow access to todolist view when redirected from scan
  ],
  referrer: ['/summary'] // Referrer can only access summary page
} as const

type Role = keyof typeof rolePermissions

// Helper function to check if a path matches a pattern
function pathMatches(pattern: string, path: string): boolean {
  if (pattern === '*') return true
  if (pattern.endsWith('*')) {
    const base = pattern.slice(0, -1)
    return path.startsWith(base)
  }
  return pattern === path
}

// Helper function to check if a role has access to a path
function hasAccess(role: Role, path: string, referer?: string): boolean {
  const allowedPaths = rolePermissions[role]
  
  // Special case for operator accessing todolist
  if (role === 'operator' && path.startsWith('/todolist/view/')) {
    // Only allow access if coming from a device scan page
    return (referer?.includes('/device/') && referer?.includes('/scan')) ?? false
  }

  // Special case for referrer accessing todolist
  if (role === 'referrer' && path.startsWith('/todolist/')) {
    return true // Allow referrers to access all todolist routes
  }
  
  return allowedPaths.some(pattern => pathMatches(pattern, path))
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  // Create a Supabase client using the SSR package with recommended cookie methods
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => {
          const cookie = req.cookies.get(name)
          return cookie?.value
        },
        set: (name: string, value: string, options: CookieOptions) => {
          try {
            // Ensure the value is a string before setting
            const stringValue = typeof value === 'string' ? value : JSON.stringify(value)
            res.cookies.set({
              name,
              value: stringValue,
              ...options,
            })
          } catch (error) {
            console.error('Error setting cookie:', error)
          }
        },
        remove: (name: string, options: CookieOptions) => {
          res.cookies.set({
            name,
            value: '',
            ...options,
            maxAge: 0
          })
        }
      }
    }
  )

  // Get the current path and referer
  const path = req.nextUrl.pathname
  const referer = req.headers.get('referer')

  // Define public routes that don't require authentication
  const publicRoutes = ['/auth/login', '/register', '/auth/reset-password']

  // Check if the path is public
  if (publicRoutes.includes(path)) {
    // For public routes, we still need to check if user is authenticated
    // to redirect them if they try to access login/register while logged in
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      // Get user role to determine where to redirect
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('email', user.email)
        .single()

      // If user is authenticated and trying to access login/register, redirect based on role
      const redirectUrl = new URL(
        profile?.role === 'referrer' ? '/summary' : '/devices',
        req.url
      )
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
    .eq('email', user.email)
    .single()

  if (profileError || !profile) {
    // If profile not found, redirect to login
    const redirectUrl = new URL('/auth/login', req.url)
    return NextResponse.redirect(redirectUrl)
  }

  const role = profile.role as Role | undefined

  // If role is not found or user doesn't have access to the path
  if (!role || !hasAccess(role, path, referer ?? undefined)) {
    // Redirect based on role
    const redirectUrl = new URL(
      role === 'referrer' ? '/summary' : '/devices',
      req.url
    )
    return NextResponse.redirect(redirectUrl)
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