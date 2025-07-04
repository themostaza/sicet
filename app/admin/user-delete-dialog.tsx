"use client"

import { useState, useTransition } from "react"
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"
import { deleteUser } from "@/app/actions/actions-user"

interface UserDeleteDialogProps {
  userId: string
  userEmail: string
  onDelete: () => void
}

export function UserDeleteDialog({ userId, userEmail, onDelete }: UserDeleteDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  const handleDelete = async () => {
    startTransition(async () => {
      try {
        await deleteUser(userEmail)
        toast.success('Utente eliminato con successo')
        setOpen(false)
        onDelete()
      } catch (error) {
        console.error('Error in delete operation:', error)
        toast.error(error instanceof Error ? error.message : 'Si è verificato un errore imprevisto')
        // Don't call onDelete() on error as it might refresh the list incorrectly
      }
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Sei sicuro di voler disattivare questo utente?</AlertDialogTitle>
          <AlertDialogDescription>
            Questa azione non può essere annullata. L'utente {userEmail} verrà disattivato.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annulla</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? 'Disattivazione...' : 'Disattiva'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
} 