"use client"

import React, { useEffect, useState } from "react"
import { LayoutGrid, Layers, ClipboardList, FileText, Menu, BellRing, AlertCircle, Users, BarChart2, Database, Table, Table2, ChevronsLeft, ChevronsRight, FileSpreadsheet } from "lucide-react"
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
import Image from "next/image"
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar"

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
      icon: <BarChart2 size={20} />,
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
      href: "/matrix",
      icon: <Table size={20} />,
      label: "Matrice Todolist"
    },
    {
      href: "/reports",
      icon: <FileSpreadsheet size={20} />,
      label: "Report"
    },
    {
      href: "/matrix/madre",
      icon: <Table2 size={20} />,
      label: "Matrice Madre"
    },
    {
      href: "/export",
      icon: <Database size={20} />,
      label: "Esporta"
    },
    {
      href: "/alerts",
      icon: <BellRing size={20} />,
      label: "Alert"
    },
    {
      href: "/alerts/logs",
      icon: <AlertCircle size={20} />,
      label: "Log Alert"
    },
    {
      href: "/admin/preregister",
      icon: <Users size={20} />,
      label: "Pre-registra Utenti"
    }
  ],
  operator: [
    // {
    //   href: "/devices",
    //   icon: <Layers size={20} />,
    //   label: "Punti di Controllo"
    // },
    {
      href: "/todolist",
      icon: <ClipboardList size={20} />,
      label: "Todolist"
    }
  ],
  referrer: [
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
    let initialSessionChecked = false;
    setLoading(true);

    const getUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("email", user.email)
        .single();
      setRole(profile?.role ?? null);
      setLoading(false);
    };

    getUserRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") {
        initialSessionChecked = true;
        if (session?.user) {
          supabase
            .from("profiles")
            .select("role")
            .eq("email", session.user.email)
            .single()
            .then(({ data: profile }) => {
              setRole(profile?.role ?? null);
              setLoading(false);
            });
        } else {
          setRole(null);
          setLoading(false);
        }
      } else if (session?.user) {
        supabase
          .from("profiles")
          .select("role")
          .eq("email", session.user.email)
          .single()
          .then(({ data: profile }) => {
            setRole(profile?.role ?? null);
          });
      } else {
        setRole(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Get menu items based on role
  const menuItems = role ? menuItemsByRole[role] : []

  // If there's an error and we have a role, show the error
  if (error && role) {
    return (
      <UISidebar>
        <SidebarHeader>
          <div className="flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              {/* Mostra il logo se sidebar aperta su desktop o se è mobile (sempre aperta) */}
              {((!isMobile && isOpen) || isMobile) && (
                <Avatar className="h-8 w-8 rounded-sm">
                  <AvatarImage
                    src="/logo.webp"
                    alt="Sicet Logo"
                    className="rounded-sm"
                  />
                  <AvatarFallback className="rounded-sm bg-muted">
                    <LayoutGrid className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}
              {/* Mostra il titolo se sidebar aperta su desktop o se è mobile (sempre aperta) */}
              {((!isMobile && isOpen) || isMobile) && <h1 className="text-lg font-semibold">Controlli</h1>}
            </div>
            {/* Bottone toggle solo su desktop, cambia icona a seconda dello stato */}
            {!isMobile && (
              <Button variant="ghost" size="icon" onClick={toggleSidebar} title={isOpen ? 'Collassa' : 'Espandi'}>
                {isOpen ? <ChevronsLeft className="h-5 w-5" /> : <ChevronsRight className="h-5 w-5" />}
              </Button>
            )}
            {/* Bottone mobile come prima, resta Menu */}
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
          <div className="flex items-center gap-2">
            {/* Mostra il logo se sidebar aperta su desktop o se è mobile (sempre aperta) */}
            {((!isMobile && isOpen) || isMobile) && (
              <Avatar className="h-8 w-8 rounded-sm">
                <AvatarImage
                  src="/logo.webp"
                  alt="Sicet Logo"
                  className="rounded-sm"
                />
                <AvatarFallback className="rounded-sm bg-muted">
                  <LayoutGrid className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            )}
            {/* Mostra il titolo se sidebar aperta su desktop o se è mobile (sempre aperta) */}
            {((!isMobile && isOpen) || isMobile) && <h1 className="text-lg font-semibold">Controlli</h1>}
          </div>
          {/* Bottone toggle solo su desktop, cambia icona a seconda dello stato */}
          {!isMobile && (
            <Button variant="ghost" size="icon" onClick={toggleSidebar} title={isOpen ? 'Collassa' : 'Espandi'}>
              {isOpen ? <ChevronsLeft className="h-5 w-5" /> : <ChevronsRight className="h-5 w-5" />}
            </Button>
          )}
          {/* Bottone mobile come prima, resta Menu */}
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={toggleSidebar}>
              <Menu className="h-5 w-5" />
            </Button>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
          {/* UserBox se sidebar aperta su desktop o se è mobile (sempre aperta) */}
          {((!isMobile && isOpen) || isMobile) && <UserBox />}
          {!loading && (
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <NavLinkWithLoading href={item.href}>
                  {item.icon}
                  {/* Mostra label se sidebar aperta su desktop o se è mobile (sempre aperta) */}
                  {((!isMobile && isOpen) || isMobile) && <span>{item.label}</span>}
                </NavLinkWithLoading>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        )}
      </SidebarContent>
    </UISidebar>
  )
}
