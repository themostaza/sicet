'use client'

import { useLinkStatus } from 'next/link'
import { Loader2 } from "lucide-react"

export default function LinkLoadingIndicator() {
  const { pending } = useLinkStatus()
  
  if (!pending) return null
  
  return (
    <Loader2 className="h-4 w-4 animate-spin ml-2" />
  )
} 