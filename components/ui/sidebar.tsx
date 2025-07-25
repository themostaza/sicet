"use client"

import * as React from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./sheet"
import { cn } from "@/lib/utils"

interface SidebarContextType {
  isOpen: boolean
  isMobile: boolean
  toggleSidebar: () => void
  setIsOpen: (open: boolean) => void
}

const SidebarContext = React.createContext<SidebarContextType | undefined>(undefined)

export function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider")
  }
  return context
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(true)
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 1024 // Changed from 768 to 1024 for better tablet support
      setIsMobile(mobile)
      if (mobile) {
        setIsOpen(false)
      }
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const toggleSidebar = () => setIsOpen((prev) => !prev)

  return (
    <SidebarContext.Provider value={{ isOpen, isMobile, toggleSidebar, setIsOpen }}>
      {children}
    </SidebarContext.Provider>
  )
}

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function Sidebar({ children }: { children: React.ReactNode }) {
  const { isOpen, isMobile, toggleSidebar } = useSidebar()

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={toggleSidebar}>
        <SheetContent side="left" className="w-[280px] p-0 sm:max-w-[280px] flex flex-col">
          <SheetHeader className="p-4 border-b flex-shrink-0">
            <SheetTitle className="text-left">Sistema di Gestione</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto min-h-0 sidebar-scroll">
            {children}
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <aside className={cn(
      "border-r bg-background transition-all duration-300",
      isOpen ? "w-[var(--sidebar-width)]" : "w-[var(--sidebar-width-collapsed)]"
    )}>
      {children}
    </aside>
  )
}

export function SidebarHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 border-b", className)} {...props} />
}

export function SidebarContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex-1 overflow-y-auto py-4 min-h-0 sidebar-scroll", className)} {...props} />
}

export function SidebarMenu({ className, ...props }: React.HTMLAttributes<HTMLUListElement>) {
  return <ul className={cn("space-y-1 px-2 pb-4", className)} {...props} />
}

export function SidebarMenuItem({ children }: { children: React.ReactNode }) {
  const { toggleSidebar, isMobile } = useSidebar()

  const handleClick = () => {
    if (isMobile) {
      toggleSidebar()
    }
  }

  return (
    <div onClick={handleClick} className="px-2">
      {children}
    </div>
  )
}

export function SidebarMenuButton({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      data-sidebar="menu-button"
      className={cn(
        "flex items-center w-full p-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors",
        className
      )}
      {...props}
    />
  )
}

export function SidebarTrigger({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { toggleSidebar } = useSidebar()
  return (
    <button
      data-sidebar="trigger"
      className={cn("p-2 hover:bg-accent rounded-md transition-colors", className)}
      onClick={toggleSidebar}
      {...props}
    />
  )
}
