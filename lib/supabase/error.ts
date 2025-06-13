import type { PostgrestError } from "@supabase/supabase-js"

export function handlePostgrestError(error: PostgrestError): never {
  console.error("Postgrest error:", error)
  throw new Error(error.message)
} 