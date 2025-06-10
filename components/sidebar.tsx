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

// Define menu items for each role
const menuItemsByRole: Record<Role, Array<{
  href: string
  icon: JSX.Element
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
      href: "/devices",
      icon: <Layers size={20} />,
      label: "Punti di Controllo"
    },
    {
      href: "/todolist",
      icon: <ClipboardList size={20} />,
      label: "Todolist"
    }
  ]
}

export default function Sidebar() {
  const { isMobile, toggleSidebar, isOpen } = useSidebar()
  const [role, setRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const getUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("email", user.email)
            .single()
          
          setRole(profile?.role as Role ?? null)
        }
      } catch (error) {
        console.error("Error getting user role:", error)
      } finally {
        setLoading(false)
      }
    }

    getUserRole()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        supabase
          .from("profiles")
          .select("role")
          .eq("email", session.user.email)
          .single()
          .then(({ data: profile }) => {
            setRole(profile?.role as Role ?? null)
          })
      } else {
        setRole(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  // Get menu items based on role
  const menuItems = role ? menuItemsByRole[role] : []

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
