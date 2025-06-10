'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface NavLinkWithLoadingProps {
  href: string
  children: React.ReactNode
  className?: string
}

export default function NavLinkWithLoading({ href, children, className }: NavLinkWithLoadingProps) {
  const pathname = usePathname()
  const [isLoading, setIsLoading] = useState(false)
  
  // Check if the link is active (current page)
  const isActive = pathname === href
  
  // Reset loading state when path changes (navigation completes)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (isLoading && pathname !== href) {
      // Keep spinner visible for at least 500ms to ensure it's visible to the user
      timeoutId = setTimeout(() => {
        setIsLoading(false)
      }, 500)
    } else if (pathname === href) {
      setIsLoading(false)
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [pathname, href, isLoading])

  return (
    <Link 
      href={href} 
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        isActive 
          ? "bg-primary/10 text-primary font-medium hover:bg-primary/15" 
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        className
      )}
      onClick={() => {
        if (pathname !== href) {
          setIsLoading(true)
        }
      }}
      prefetch={false}
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          {children}
        </div>
        {isLoading && (
          <div className="nav-spinner">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}
      </div>
    </Link>
  )
} 