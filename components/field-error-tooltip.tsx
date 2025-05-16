import { AlertCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface FieldErrorTooltipProps {
  message: string
}

export function FieldErrorTooltip({ message }: FieldErrorTooltipProps) {
  return (
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
  )
}
