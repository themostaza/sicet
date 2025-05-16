import { AlertCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface FieldErrorProps {
  message: string
  showInline?: boolean
  showTooltip?: boolean
  id?: string
}

export function FieldError({ message, showInline = false, showTooltip = true, id }: FieldErrorProps) {
  if (!message) return null

  return (
    <>
      {showTooltip && (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-flex items-center ml-2 cursor-help">
                <AlertCircle className="h-4 w-4 text-red-500" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" align="center" className="bg-red-500 text-white border-red-500 z-50">
              <p>{message}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {showInline && (
        <p id={id} className="text-sm text-red-500 mt-1">
          {message}
        </p>
      )}
    </>
  )
}
