"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Clock } from "lucide-react"
import { CustomTimeSlot } from "@/lib/validation/todolist-schemas"

interface CustomTimeSlotProps {
  value?: CustomTimeSlot
  onChange: (value: CustomTimeSlot) => void
  trigger?: React.ReactNode
}

export function CustomTimeSlotPicker({ value, onChange, trigger }: CustomTimeSlotProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [startHour, setStartHour] = useState(value?.startHour ?? 9)
  const [endHour, setEndHour] = useState(value?.endHour ?? 17)

  const handleSave = () => {
    onChange({
      type: "custom",
      startHour,
      endHour
    })
    setIsOpen(false)
  }

  const handleStartHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value)
    if (val >= 0 && val <= 23) {
      setStartHour(val)
    }
  }

  const handleEndHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value)
    if (val >= 0 && val <= 23) {
      setEndHour(val)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" className="w-full justify-start">
            <Clock className="mr-2 h-4 w-4" />
            {value ? (
              `${value.startHour.toString().padStart(2, '0')}:00-${value.endHour.toString().padStart(2, '0')}:00`
            ) : (
              "Seleziona orario personalizzato"
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Orario personalizzato</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startHour">Ora di inizio</Label>
              <Input
                id="startHour"
                type="number"
                min={0}
                max={23}
                value={startHour}
                onChange={handleStartHourChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endHour">Ora di fine</Label>
              <Input
                id="endHour"
                type="number"
                min={0}
                max={23}
                value={endHour}
                onChange={handleEndHourChange}
              />
            </div>
          </div>
          <Button onClick={handleSave} className="w-full">
            Salva
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 