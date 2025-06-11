import { createClient } from "@supabase/supabase-js"
import { createBrowserClient, createServerClient } from "@supabase/ssr"
import { Database } from "@/supabase/database.types"
import { cookies } from "next/headers"

// Crea un singolo client Supabase per il lato server (ora async!)
export const createServerSupabaseClient = async () => {
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

// Crea un singolo client Supabase per il lato client
export const createClientSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createBrowserClient<Database>(
    supabaseUrl,
    supabaseKey
  )
}
