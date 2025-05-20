"use client"

import { useRef, useEffect } from "react"
import { Checkbox, CheckboxProps } from "@/components/ui/checkbox"

interface CustomCheckboxProps extends CheckboxProps {
  indeterminate?: boolean
}

export function CustomCheckbox({ indeterminate, ...props }: CustomCheckboxProps) {
  const ref = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (ref.current) {
      // Accediamo all'elemento HTML sottostante per impostare la proprietà indeterminate
      const input = ref.current.querySelector('input')
      if (input) {
        input.indeterminate = !!indeterminate
      }
    }
  }, [indeterminate])

  return <Checkbox ref={ref} {...props} />
}