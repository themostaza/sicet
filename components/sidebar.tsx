"use client"

import React, { useEffect, useState } from "react"
import { LayoutGrid, Layers, ClipboardList, FileText, Menu, BellRing, AlertCircle, Users } from "lucide-react"
import NavLinkWithLoading from "./ui/NavLinkWithLoading"
import { Button } from "./ui/button"
import {
  Sidebar as UISidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  useSidebar
} from "./ui/sidebar"
import { UserBox } from "./ui/user-box"
import { createBrowserClient } from "@supabase/ssr"

type Role = "admin" | "operator" | "referrer"

// Define menu items for each role based on middleware permissions
const menuItemsByRole: Record<Role, Array<{
  href: string
  icon: React.ReactNode
  label: string
  title?: string
}>> = {
  admin: [
    {
      href: "/dashboard",
      icon: <LayoutGrid size={20} />,
      label: "Dashboard"
    },
    {
      href: "/summary",
      icon: <LayoutGrid size={20} />,
      label: "Statistiche"
    },
    {
      href: "/devices",
      icon: <Layers size={20} />,
      label: "Punti di Controllo"
    },
    {
      href: "/kpis",
      icon: <FileText size={20} />,
      label: "Controlli"
    },
    {
      href: "/todolist",
      icon: <ClipboardList size={20} />,
      label: "Todolist"
    },
    {
      href: "/export",
      icon: <FileText size={20} />,
      label: "Esporta Dati"
    },
    {
      href: "/alerts",
      icon: <BellRing size={20} />,
      label: "Alert"
    },
    {
      href: "/admin/preregister",
      icon: <Users size={20} />,
      label: "Pre-registra Utenti"
    }
  ],
  operator: [
    {
      href: "/devices",
      icon: <Layers size={20} />,
      label: "Punti di Controllo"
    }
  ],
  referrer: [
    {
      href: "/summary",
      icon: <LayoutGrid size={20} />,
      label: "Statistiche"
    }
  ]
}

export default function Sidebar() {
  const { isMobile, toggleSidebar, isOpen } = useSidebar()
  const [role, setRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const getUserRole = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (!user) {
          setRole(null)
          setLoading(false)
          return
        }
        
        if (authError && authError.message !== 'JWT expired') {
          throw new Error("Errore di autenticazione")
        }
        
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("email", user.email)
          .single()
        
        if (profileError) {
          throw new Error("Errore nel recupero del profilo")
        }
        
        if (!profile) {
          throw new Error("Profilo non trovato")
        }

        setRole(profile.role as Role)
      } catch (error) {
        console.error("Error getting user role:", error)
        if (error instanceof Error && error.message !== "JWT expired") {
          setError(error.message)
        }
        setRole(null)
      } finally {
        setLoading(false)
      }
    }

    getUserRole()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        try {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("role")
            .eq("email", session.user.email)
            .single()
          
          if (profileError) {
            throw new Error("Errore nel recupero del profilo")
          }
          
          if (!profile) {
            throw new Error("Profilo non trovato")
          }

          setRole(profile.role as Role)
          setError(null)
        } catch (error) {
          console.error("Error updating user role:", error)
          if (error instanceof Error) {
            setError(error.message)
          }
          setRole(null)
        }
      } else {
        setRole(null)
        setError(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  // Get menu items based on role
  const menuItems = role ? menuItemsByRole[role] : []

  // If there's an error and we have a role, show the error
  if (error && role) {
    return (
      <UISidebar>
        <SidebarHeader>
          <div className="flex items-center justify-between px-4">
            <h1 className="text-lg font-semibold">SICET</h1>
            {isMobile && (
              <Button variant="ghost" size="icon" onClick={toggleSidebar}>
                <Menu className="h-5 w-5" />
              </Button>
            )}
          </div>
        </SidebarHeader>
        <SidebarContent>
          <div className="p-4 text-red-500">
            <AlertCircle className="h-5 w-5 inline mr-2" />
            {error}
          </div>
        </SidebarContent>
      </UISidebar>
    )
  }

  return (
    <UISidebar>
      <SidebarHeader>
        <div className="flex items-center justify-between px-4">
          <h1 className="text-lg font-semibold">SICET</h1>
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={toggleSidebar}>
              <Menu className="h-5 w-5" />
            </Button>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <UserBox />
        {!loading && (
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <NavLinkWithLoading href={item.href}>
                  {item.icon}
                  <span>{item.label}</span>
                </NavLinkWithLoading>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        )}
      </SidebarContent>
    </UISidebar>
  )
}
