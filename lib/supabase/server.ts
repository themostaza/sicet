import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import type { Database } from "@/lib/database.types"

export async function createServerSupabaseClient() {
  return createServerComponentClient<Database>({ cookies })
} 