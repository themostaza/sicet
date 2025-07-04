"use client"

import { useState, useTransition } from "react"
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

interface KpiDeleteDialogProps {
  onDelete: () => Promise<void> | void
  disabled?: boolean
  children: React.ReactNode // The trigger (e.g. a button)
}

export function KpiDeleteDialog({ onDelete, disabled, children }: KpiDeleteDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    startTransition(async () => {
      await onDelete()
      setOpen(false)
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Disattiva controllo?</AlertDialogTitle>
          <AlertDialogDescription>
            Sei sicuro di voler disattivare questo controllo? Questa azione non può essere annullata.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Annulla</AlertDialogCancel>
          <AlertDialogAction 
          onClick={handleDelete} 
          disabled={isPending || disabled} 
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {isPending ? "Disattivazione..." : "Disattiva"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
