import { createServerClient } from "@supabase/ssr"
import { Database } from "@/supabase/database.types"
import { cookies } from "next/headers"
import type { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@supabase/supabase-js"

export async function createServerSupabaseClient(): Promise<SupabaseClient<Database>> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const cookieStore = await cookies()
 
  return createServerClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll: () => {
          return cookieStore.getAll().map(cookie => ({
            name: cookie.name,
            value: cookie.value
          }))
        },
        setAll: () => {
          // This is a server component, we don't need to set cookies here
          // Cookies will be set by the middleware
        }
      }
    }
  )
}

export function createServerSupabaseAdminClient(): SupabaseClient<Database> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
} 