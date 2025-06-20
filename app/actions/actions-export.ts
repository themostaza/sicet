'use server'

import { exportTodolistData as exportTodolistDataUtil, getKpisByDevice as getKpisByDeviceUtil } from '@/lib/export-utils'

// Server action wrapper for exportTodolistData
export async function exportTodolistData(config: {
  startDate: string
  endDate: string
  deviceIds?: string[]
  kpiIds?: string[]
}): Promise<Blob> {
  return exportTodolistDataUtil(config)
}

// Server action wrapper for getKpisByDevice
export async function getKpisByDevice(config: {
  startDate: string
  endDate: string
  deviceId: string
}): Promise<{ id: string; name: string }[]> {
  return getKpisByDeviceUtil(config)
} 