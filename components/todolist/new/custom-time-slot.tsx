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
  const [startMinute, setStartMinute] = useState(value?.startMinute ?? 0)
  const [endHour, setEndHour] = useState(value?.endHour ?? 17)
  const [endMinute, setEndMinute] = useState(value?.endMinute ?? 0)

  const handleSave = () => {
    onChange({
      type: "custom",
      startHour,
      startMinute,
      endHour,
      endMinute
    })
    setIsOpen(false)
  }

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeValue = e.target.value
    const [hours, minutes] = timeValue.split(':').map(Number)
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      setStartHour(hours)
      setStartMinute(minutes)
    }
  }

  const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeValue = e.target.value
    const [hours, minutes] = timeValue.split(':').map(Number)
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      setEndHour(hours)
      setEndMinute(minutes)
    }
  }

  const formatTimeForDisplay = (hour: number, minute: number) => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  }

  const formatTimeForInput = (hour: number, minute: number) => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" className="w-full justify-start">
            <Clock className="mr-2 h-4 w-4" />
            {value ? (
              `${formatTimeForDisplay(value.startHour, value.startMinute || 0)}-${formatTimeForDisplay(value.endHour, value.endMinute || 0)}`
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
              <Label htmlFor="startTime">Ora di inizio</Label>
              <Input
                id="startTime"
                type="time"
                value={formatTimeForInput(startHour, startMinute)}
                onChange={handleStartTimeChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">Ora di fine</Label>
              <Input
                id="endTime"
                type="time"
                value={formatTimeForInput(endHour, endMinute)}
                onChange={handleEndTimeChange}
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