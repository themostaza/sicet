import { createBrowserClient } from "@supabase/ssr"
import { Database } from "@/supabase/database.types"

// Crea un singolo client Supabase per il lato client
export const createClientSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createBrowserClient<Database>(
    supabaseUrl,
    supabaseKey
  )
}
