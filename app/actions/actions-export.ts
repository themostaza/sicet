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
  
  // Filter out tasks with null todolist and collect unique device and KPI IDs
  // This prevents "Cannot read properties of null (reading 'device_id')" errors
  // that can occur when tasks reference deleted todolists or have data integrity issues
  const validTasks = tasks.filter(task => task.todolist !== null)
  
  // Log if there are tasks with null todolist for debugging
  if (validTasks.length < tasks.length) {
    console.warn(`Found ${tasks.length - validTasks.length} tasks with null todolist relation out of ${tasks.length} total tasks`)
  }
  
  if (validTasks.length === 0) {
    return new Blob(['Data,Punto di controllo,Nome Controllo,Value Name,Value\nNessun dato valido trovato'], { type: 'text/csv;charset=utf-8' })
  }
  
  const deviceIds = [...new Set(validTasks.map(task => task.todolist!.device_id))]
  const kpiIds = [...new Set(validTasks.map(task => task.kpi_id))]
  
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
          if (typeof field === 'object' && field !== null && 'name' in field) {
            // Use the field name as the key, since that's what we need to match
            const fieldName = field.name as string
            fieldNamesMap[fieldName] = fieldName
          }
        }
      }
      kpiFieldNamesMap[kpi.id] = fieldNamesMap
    }
  }
  
  // CSV header
  let csvContent = 'Data,Punto di controllo,Nome Controllo,Value Name,Value\n'
  
  // Helper function to get field name from KPI schema
  function getFieldNameFromKpiStructure(key: string, kpiId: string, kpiValueStructure: any): string {
    if (Array.isArray(kpiValueStructure)) {
      const field = kpiValueStructure.find(f => {
        const fieldId = f.id || `${kpiId}-${f.name.toLowerCase().replace(/\s+/g, '_')}`;
        return fieldId === key || f.name === key;
      });
      return field && field.name ? field.name : key;
    }
    return key;
  }
  
  // Process each task
  for (const task of validTasks) {
    if (!task.todolist?.scheduled_execution) continue;
    const date = format(parseISO(task.todolist.scheduled_execution), 'dd/MM/yyyy')
    const deviceName = escapeCSV(deviceMap[task.todolist.device_id] || 'Punto di controllo sconosciuto')
    const kpiName = escapeCSV(kpiMap[task.kpi_id]?.name || 'Controllo sconosciuto')
    const kpiValueStructure = kpiMap[task.kpi_id]?.valueStructure;
    
    // Skip tasks with no value
    if (task.value === null || task.value === undefined) {
      csvContent += `${date},${deviceName},${kpiName},valore,N/A\n`
      continue
    }
    
    if (Array.isArray(task.value)) {
      for (const item of task.value) {
        if (typeof item === 'object' && item !== null) {
          const valueName = getFieldNameFromKpiStructure(item.id, task.kpi_id, kpiValueStructure);
          const value = typeof item === 'object' && item !== null && 'value' in item 
            ? (item as any).value 
            : JSON.stringify(item);
          csvContent += `${date},${deviceName},${kpiName},${escapeCSV(valueName)},${escapeCSV(value)}\n`
        } else {
          csvContent += `${date},${deviceName},${kpiName},valore,${escapeCSV(item)}\n`
        }
      }
    } else if (typeof task.value === 'object' && task.value !== null) {
      // Se è un oggetto, per ogni chiave usa la funzione di mapping
      Object.entries(task.value).forEach(([key, val]) => {
        const displayName = getFieldNameFromKpiStructure(key, task.kpi_id, kpiValueStructure);
        csvContent += `${date},${deviceName},${kpiName},${escapeCSV(displayName)},${escapeCSV(val)}\n`
      })
    } else {
      // Valore primitivo: se c'è solo un campo nel KPI, usa il suo nome, altrimenti lascia "valore"
      let valueName = 'valore';
      if (Array.isArray(kpiValueStructure) && kpiValueStructure.length === 1 && kpiValueStructure[0].name) {
        valueName = kpiValueStructure[0].name;
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
  
  // Filter out items with null todolist and extract unique KPI IDs
  // This prevents "Cannot read properties of null (reading 'device_id')" errors
  // that can occur when tasks reference deleted todolists
  const validData = data?.filter(item => item.todolist !== null) ?? [];
  
  // Log if there are items with null todolist for debugging
  if (validData.length < (data?.length ?? 0)) {
    console.warn(`Found ${(data?.length ?? 0) - validData.length} items with null todolist relation out of ${data?.length ?? 0} total items in getKpisByDevice`)
  }
  
  const kpiIds = [...new Set(validData.map(item => item.kpi_id))];
  
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