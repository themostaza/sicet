import { createServerClient } from "@supabase/ssr"
import { Database } from "@/supabase/database.types"
import { cookies } from "next/headers"
import type { SupabaseClient } from "@supabase/supabase-js"

export async function createServerSupabaseClient(): Promise<SupabaseClient<Database>> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const cookieStore = await cookies();
  return createServerClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll: () => cookieStore.getAll().map((cookie) => ({ name: cookie.name, value: cookie.value })),
        setAll: () => {}, // Non serve per le azioni di sola lettura
      }
    }
  )
} 