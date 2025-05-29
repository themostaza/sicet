"use client"

import { LayoutGrid, Layers, ClipboardList, FileText, Menu, BellRing, AlertCircle } from "lucide-react"
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

export default function Sidebar() {
  const { isMobile, toggleSidebar, isOpen } = useSidebar()

  const menuItems = [
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
      title: "Alert",
      href: "/alerts",
      icon: <BellRing size={20} />,
    },
    {
      title: "Log Alert",
      href: "/alerts/logs",
      icon: <AlertCircle size={20} />
    }
  ]

  return (
    <>
      {/* Mobile menu button - only show when menu is closed */}
      {isMobile && !isOpen && (
        <div className="fixed top-1 right-1 z-[100] md:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 bg-background/80 backdrop-blur-sm hover:bg-background"
            onClick={toggleSidebar}
            aria-label="Toggle Menu"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>
      )}

      <UISidebar>
        <SidebarHeader>
          <h1 className="text-xl font-bold">Sistema di Gestione</h1>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <NavLinkWithLoading
                  href={item.href}
                  className="flex items-center p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  {item.icon}
                  <span className="ml-2">{item.label}</span>
                </NavLinkWithLoading>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
      </UISidebar>
    </>
  )
}
