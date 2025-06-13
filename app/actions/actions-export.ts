'use server'

import { createServerSupabaseClient } from "@/lib/supabase-server"
import type { Database } from "@/supabase/database.types"
import type { SupabaseClient } from "@supabase/supabase-js"
import { format, parseISO } from "date-fns"
import { getKpi } from "./actions-kpi"
import { getDevice } from "./actions-device"
import { escapeCSV } from "@/lib/utils"

interface ExportConfig {
  startDate: string
  endDate: string
  deviceIds?: string[]
  kpiIds?: string[]
}

// Define a type for the KPI map entries
interface KpiMapEntry {
  name: string;
  valueStructure: any;
}

// Add type for task with todolist relation
type TaskWithTodolist = {
  id: string
  kpi_id: string
  status: string
  value: any
  todolist: {
    device_id: string
    scheduled_execution: string
  }
}

export async function exportTodolistData(config: ExportConfig): Promise<Blob> {
  const supabase = await createServerSupabaseClient()
  
  // Build query for tasks with todolist info
  let query = supabase
    .from("tasks")
    .select(`
      id,
      kpi_id,
      status,
      value,
      todolist:todolist_id (
        device_id,
        scheduled_execution
      )
    `)
    .gte('todolist.scheduled_execution', `${config.startDate}T00:00:00`)
    .lte('todolist.scheduled_execution', `${config.endDate}T23:59:59`)
  
  // Filter by device if specified
  if (config.deviceIds && config.deviceIds.length > 0) {
    query = query.in('todolist.device_id', config.deviceIds)
  }
  
  // Filter by KPI if specified  
  if (config.kpiIds && config.kpiIds.length > 0) {
    query = query.in('kpi_id', config.kpiIds)
  }
  
  // Execute query
  const { data: tasks, error } = await query as { data: TaskWithTodolist[] | null, error: any }
  
  if (error) {
    console.error("Error fetching tasks:", error)
    throw new Error(`Error fetching tasks: ${error.message}`)
  }
  
  // If no tasks found
  if (!tasks || tasks.length === 0) {
    return new Blob(['Data,Punto di controllo,Nome Controllo,Value Name,Value\nNessun dato trovato'], { type: 'text/csv;charset=utf-8' })
  }
  
  // Collect unique device and KPI IDs
  const deviceIds = [...new Set(tasks.map(task => task.todolist.device_id))]
  const kpiIds = [...new Set(tasks.map(task => task.kpi_id))]
  
  // Fetch device and KPI details in parallel
  const [devices, kpis] = await Promise.all([
    Promise.all(deviceIds.map(id => getDevice(id))),
    Promise.all(kpiIds.map(id => getKpi(id)))
  ])
  
  // Create lookup maps
  const deviceMap: Record<string, string> = Object.fromEntries(
    devices.filter(Boolean).map(device => [device?.id, device?.name])
  )
  
  // Create a map of KPI field IDs to their display names
  const kpiMap: Record<string, KpiMapEntry> = {}
  const kpiFieldNamesMap: Record<string, Record<string, string>> = {}
  
  for (const kpi of kpis.filter(Boolean)) {
    if (kpi) {
      kpiMap[kpi.id] = {
        name: kpi.name,
        valueStructure: kpi.value
      }
      
      // Create a map of field IDs to display names for this KPI
      const fieldNamesMap: Record<string, string> = {}
      if (Array.isArray(kpi.value)) {
        for (const field of kpi.value) {
          if (typeof field === 'object' && field !== null && 'id' in field && 'name' in field) {
            fieldNamesMap[field.id as string] = field.name as string
          }
        }
      }
      kpiFieldNamesMap[kpi.id] = fieldNamesMap
    }
  }
  
  // CSV header
  let csvContent = 'Data,Punto di controllo,Nome Controllo,Value Name,Value\n'
  
  // Process each task
  for (const task of tasks) {
    if (!task.todolist.scheduled_execution) continue;
    const date = format(parseISO(task.todolist.scheduled_execution), 'dd/MM/yyyy')
    const deviceName = escapeCSV(deviceMap[task.todolist.device_id] || 'Punto di controllo sconosciuto')
    const kpiName = escapeCSV(kpiMap[task.kpi_id]?.name || 'Controllo sconosciuto')
    const fieldNamesMap = kpiFieldNamesMap[task.kpi_id] || {}
    
    // Skip tasks with no value
    if (task.value === null || task.value === undefined) {
      // Add a single row showing the task exists but has no value
      csvContent += `${date},${deviceName},${kpiName},valore,N/A\n`
      continue
    }
    
    // Handle different value types
    if (Array.isArray(task.value)) {
      // The value is an array of objects with name properties
      for (const item of task.value) {
        if (typeof item === 'object' && item !== null) {
          // Use the "name" property as the value name
          const valueName = typeof item === 'object' && item !== null && 'name' in item 
            ? (item as any).name 
            : 'valore';
          // Use the "value" property as the actual value, or the entire item if no "value" property
          const value = typeof item === 'object' && item !== null && 'value' in item 
            ? (item as any).value 
            : JSON.stringify(item);
          csvContent += `${date},${deviceName},${kpiName},${escapeCSV(valueName)},${escapeCSV(value)}\n`
        } else {
          // Fallback for primitive values in the array
          csvContent += `${date},${deviceName},${kpiName},valore,${escapeCSV(item)}\n`
        }
      }
    } else if (typeof task.value === 'object' && task.value !== null) {
      // For regular objects
      if ('name' in task.value && 'value' in task.value) {
        // If it's a single object with name/value properties
        csvContent += `${date},${deviceName},${kpiName},${escapeCSV(task.value.name)},${escapeCSV(task.value.value)}\n`
      } else {
        // Otherwise create rows for each property
        Object.entries(task.value).forEach(([key, val]) => {
          // Use the display name from the KPI definition if available
          const displayName = fieldNamesMap[key] || key
          csvContent += `${date},${deviceName},${kpiName},${escapeCSV(displayName)},${escapeCSV(val)}\n`
        })
      }
    } else {
      // For simple primitive values
      // Try to use the name from the KPI structure if available
      let valueName = 'valore';
      const kpiValueStructure = kpiMap[task.kpi_id]?.valueStructure;
      
      if (Array.isArray(kpiValueStructure) && kpiValueStructure.length > 0 && 
          typeof kpiValueStructure[0] === 'object' && kpiValueStructure[0] !== null && 
          'name' in kpiValueStructure[0]) {
        valueName = kpiValueStructure[0].name as string;
      }
      
      csvContent += `${date},${deviceName},${kpiName},${escapeCSV(valueName)},${escapeCSV(task.value)}\n`
    }
  }
  
  return new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
}

// Modified function to get KPIs for a specific device and date range
export async function getKpisByDevice(config: {
  startDate: string;
  endDate: string;
  deviceId: string;
}): Promise<{ id: string; name: string }[]> {
  const supabase = await createServerSupabaseClient();
  
  type TaskWithTodolistSimple = {
    kpi_id: string
    todolist: {
      device_id: string
      scheduled_execution: string
    }
  }
  
  // Query tasks to find unique KPI IDs that have tasks for the specific device and date range
  const { data, error } = await supabase
    .from("tasks")
    .select(`
      kpi_id,
      todolist:todolist_id (
        device_id,
        scheduled_execution
      )
    `)
    .gte('todolist.scheduled_execution', `${config.startDate}T00:00:00`)
    .lte('todolist.scheduled_execution', `${config.endDate}T23:59:59`)
    .eq('todolist.device_id', config.deviceId)
    .order('kpi_id') as { data: TaskWithTodolistSimple[] | null, error: any }
    
  if (error) {
    console.error("Error fetching KPIs for device:", error);
    throw new Error(`Error fetching KPIs for device: ${error.message}`);
  }
  
  // Extract unique KPI IDs
  const kpiIds = [...new Set(data?.map(item => item.kpi_id) ?? [])];
  
  // For empty results, return empty array
  if (kpiIds.length === 0) {
    return [];
  }
  
  // Fetch KPI details
  const kpiPromises = kpiIds.map(id => getKpi(id));
  const kpis = await Promise.all(kpiPromises);
  
  // Filter out nulls and map to required format
  return kpis
    .filter(Boolean)
    .map(kpi => ({
      id: kpi!.id,
      name: kpi!.name
    }));
} 