"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Button } from "./button"
import { Card } from "./card"
import { useRouter } from "next/navigation"
import { LogOut, User } from "lucide-react"

type Role = "operator" | "admin" | "referrer"

export function UserBox() {
  const [user, setUser] = useState<any>(null)
  const [role, setRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    let initialSessionChecked = false;
    setLoading(true);

    const getUser = async () => {
      try {
        console.log("UserBox: Getting user...")
        const { data: { user }, error } = await supabase.auth.getUser()
        console.log("UserBox: getUser response:", { user, error })
        
        if (error) {
          console.error("UserBox: Error getting user:", error)
          return
        }

        setUser(user)

        if (user) {
          console.log("UserBox: Getting profile for user:", user.email)
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("role")
            .eq("email", user.email)
            .single()
          
          console.log("UserBox: Profile response:", { profile, profileError })
          
          if (profileError) {
            console.error("UserBox: Error getting profile:", profileError)
            return
          }

          setRole(profile?.role ?? null)
        }
      } catch (error) {
        console.error("UserBox: Unexpected error:", error)
      } finally {
        setLoading(false)
      }
    }

    getUser()

    console.log("UserBox: Setting up auth state change listener")
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") {
        initialSessionChecked = true;
        setUser(session?.user ?? null);
        setLoading(false);
      } else {
        setUser(session?.user ?? null);
      }
    })

    return () => {
      console.log("UserBox: Cleaning up auth state change listener")
      subscription.unsubscribe()
    }
  }, [supabase])

  const handleLogout = async () => {
    console.log("UserBox: Logging out...")
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error("UserBox: Error during logout:", error)
      return
    }
    console.log("UserBox: Logout successful")
    router.push("/auth/login")
    router.refresh()
  }

  if (loading) {
    return (
      <Card className="p-4 animate-pulse">
        <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-muted rounded w-1/2"></div>
      </Card>
    )
  }

  if (!user) {
    return (
      <Card className="p-4">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => router.push("/auth/login")}
        >
          <User className="mr-2 h-4 w-4" />
          Accedi
        </Button>
      </Card>
    )
  }

  const roleLabels: Record<Role, string> = {
    operator: "Operatore",
    admin: "Amministratore",
    referrer: "Referente"
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{user.email}</p>
          <p className="text-xs text-muted-foreground">{role ? roleLabels[role] : "Utente"}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          title="Logout"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  )
} 