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
  
  // Controlla se il link è attivo (pagina corrente)
  const isActive = pathname === href
  
  // Reset loading state when path changes (navigation completes)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (isLoading && pathname !== href) {
      // Mantiene lo spinner visibile per almeno 500ms per assicurarsi che sia visibile all'utente
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
        className,
        isActive && "bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
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