import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import type { Database } from "@/supabase/database.types"

export async function createServerSupabaseClient() {
  try {
    const client = await createServerComponentClient<Database>({ 
      cookies: async () => await cookies()
    })
    
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
