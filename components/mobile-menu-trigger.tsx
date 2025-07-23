"use client"

import { useSidebar, SidebarTrigger } from "@/components/ui/sidebar"
import { Menu } from "lucide-react"

export default function MobileMenuTrigger() {
  const { isMobile } = useSidebar()
  
  if (!isMobile) return null
  
  return (
    <SidebarTrigger className="fixed top-4 left-4 z-50 lg:hidden bg-background border shadow-md">
      <Menu className="h-5 w-5" />
    </SidebarTrigger>
  )
} 