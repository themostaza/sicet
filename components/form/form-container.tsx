"use client"

import type React from "react"
import { Button } from "@/components/ui/button"

interface FormContainerProps {
  children: React.ReactNode
  onSubmit: (e: React.FormEvent) => void
  isSubmitting?: boolean
  submitLabel?: string
  submittingLabel?: string
  onCancel?: () => void
  cancelLabel?: string
  className?: string
  showActions?: boolean
  actionsClassName?: string
}

export function FormContainer({
  children,
  onSubmit,
  isSubmitting = false,
  submitLabel = "Salva",
  submittingLabel = "Salvataggio in corso...",
  onCancel,
  cancelLabel = "Annulla",
  className = "",
  showActions = true,
  actionsClassName = "flex justify-end space-x-4 pt-4",
}: FormContainerProps) {
  return (
    <form className={`space-y-6 ${className}`} onSubmit={onSubmit} noValidate>
      {children}

      {showActions && (
        <div className={actionsClassName}>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              {cancelLabel}
            </Button>
          )}

          <Button type="submit" className="bg-black hover:bg-gray-800" disabled={isSubmitting}>
            {isSubmitting ? submittingLabel : submitLabel}
          </Button>
        </div>
      )}
    </form>
  )
}
