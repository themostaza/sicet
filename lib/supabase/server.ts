import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "@/supabase/database.types"

export async function createServerSupabaseClient() {
  try {
    const cookieStore = await cookies()
    
    const client = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
    
    // Verify the client is working by making a simple query
    const { error } = await client.from("profiles").select("id").limit(1)
    if (error) {
      console.error("Error verifying Supabase client:", error)
      throw new Error("Failed to initialize Supabase client")
    }
    
    return client
  } catch (error) {
    console.error("Error creating Supabase client:", error)
    throw new Error("Failed to create Supabase client")
  }
} 
