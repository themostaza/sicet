// Utility per toggleare items in un Set
export function toggle<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set)
  next.has(value) ? next.delete(value) : next.add(value)
  return next
}

// Utility per confrontare set
export const areEqual = (a: Set<string>, b: Set<string>) => 
  a.size === b.size && [...a].every((x) => b.has(x))

// Formatta la fascia oraria per il display
export const formatTimeSlot = (timeSlot: string) => {
  switch (timeSlot) {
    case "mattina":
      return "Mattina (fino alle 14:00)"
    case "pomeriggio":
      return "Pomeriggio (fino alle 22:00)"
    case "notte":
      return "Notte (fino alle 06:00)"
    case "giornata":
      return "Giornata (fino alle 17:00)"
    default:
      return timeSlot
  }
}
