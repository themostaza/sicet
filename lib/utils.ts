import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Generate a UUID v4
export function generateUUID(): string {
  return crypto.randomUUID();
}

// Helper function to escape CSV values
export function escapeCSV(value: any): string {
  if (value === null || value === undefined) return ''
  
  // Convert booleans to Italian
  if (typeof value === 'boolean') {
    return value ? 'Sì' : 'No'
  }
  
  const stringValue = String(value)
  
  // If contains commas, quotes or newlines, wrap in quotes and escape internal quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  
  return stringValue
}

// Date formatting utility to prevent hydration mismatches
export function formatDateForDisplay(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A'
  
  try {
    // Parse ISO string directly to avoid timezone issues
    // Expected format: "2025-06-20T11:58:44.123Z" or "2025-06-20T11:58:44"
    const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/)
    
    if (match) {
      const [, year, month, day, hours, minutes, seconds] = match
      return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`
    }
    
    // If it's not an ISO string, try to parse it as a regular date string
    // This handles cases where the date might be in a different format
    const dateMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (dateMatch) {
      const [, year, month, day] = dateMatch
      return `${day}/${month}/${year}, 00:00:00`
    }
    
    // If all else fails, return the original string or N/A
    return dateString || 'N/A'
  } catch (error) {
    return 'N/A'
  }
}
