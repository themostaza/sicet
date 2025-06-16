import { NextRequest, NextResponse } from "next/server"
import { deleteDevice } from "@/app/actions/actions-device"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  // Verifica ruolo admin
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user?.email) return NextResponse.json({ error: "Non autorizzato" }, { status: 403 })
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("email", session.user.email)
    .single()
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Solo admin" }, { status: 403 })
  }

  try {
    await deleteDevice(id)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Errore" }, { status: 500 })
  }
} 