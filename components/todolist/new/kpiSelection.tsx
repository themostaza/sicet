"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { AlertCircle, Plus, Settings, BellRing } from "lucide-react"
import { useTodolist } from "./context"
import { useState, useEffect, useMemo } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { createAlert } from "@/app/actions/actions-alerts"
import { toast } from "@/components/ui/use-toast"
import { KPI } from "./types"
import { useToast } from "@/components/ui/use-toast"
import { KpiSelectionSheetContent } from "./kpiSelectionSheet"

// Define types for KPI and field
interface KpiField {
  id: string;
  name: string;
  description?: string;
  type: 'number' | 'decimal' | 'text' | 'boolean' | 'unsupported';
  placeholder?: string;
  min?: string | number;
  max?: string | number;
  required?: boolean;
  options?: string[];
}

// Define types for alert conditions
interface AlertCondition {
  field_id: string;
  type: 'number' | 'decimal' | 'text' | 'boolean';
  min?: number | string;
  max?: number | string;
  match_text?: string;
  boolean_value?: boolean;
}

export function KpiSelection() {
  const { toast } = useToast()
  const { 
    selectedKpis, 
    setSelectedKpis, 
    kpis, 
    errors,
    setAlertConditions,
    setAlertEmail,
    alertConditions: globalAlertConditions,
    alertEmail: globalAlertEmail
  } = useTodolist()
  
  const [isKpiSheetOpen, setIsKpiSheetOpen] = useState(false)
  const [isAlertSheetOpen, setIsAlertSheetOpen] = useState(false)
  const [selectedKpiForAlert, setSelectedKpiForAlert] = useState<KPI | null>(null)

  // Global state for all alert configurations
  const [kpiAlertConditions, setKpiAlertConditions] = useState<Record<string, { email: string, conditions: AlertCondition[] }>>({})

  // Local state for the currently edited alert in the sheet
  const [localAlertConditions, setLocalAlertConditions] = useState<AlertCondition[]>([])
  const [localAlertEmail, setLocalAlertEmail] = useState("")

  const selectedKpisArray = useMemo(() => 
    kpis.filter(kpi => selectedKpis.has(kpi.id)),
    [kpis, selectedKpis]
  )

  // Create fields from KPI value data
  const getKpiFields = (kpi: KPI): KpiField[] => {
    // Check if kpi has value property with field definitions
    if (kpi.value) {
      const fields: KpiField[] = [];
      
      // Handle array of fields
      if (Array.isArray(kpi.value)) {
        return kpi.value.map((field: any) => ({
          id: field.id || `${kpi.id}-${String(field.name || '').toLowerCase().replace(/\s+/g, '_')}`,
          name: String(field.name || ''),
          description: field.description ? String(field.description) : undefined,
          type: mapFieldType(field.type),
          min: field.min,
          max: field.max,
          required: field.required,
          options: field.options ? (Array.isArray(field.options) ? field.options.map((opt: any) => typeof opt === 'string' ? opt : opt.value || opt.label) : []) : undefined
        }));
      } 
      // Handle single field object
      else if (typeof kpi.value === 'object' && kpi.value !== null) {
        const valueObj = kpi.value as any;
        return [{
          id: valueObj.id || `${kpi.id}-${String(valueObj.name || 'value').toLowerCase().replace(/\s+/g, '_')}`,
          name: String(valueObj.name || 'Valore'),
          description: valueObj.description ? String(valueObj.description) : undefined,
          type: mapFieldType(valueObj.type),
          min: valueObj.min,
          max: valueObj.max,
          required: valueObj.required,
          options: valueObj.options ? (Array.isArray(valueObj.options) ? valueObj.options.map((opt: any) => typeof opt === 'string' ? opt : opt.value || opt.label) : []) : undefined
        }];
      }
    }
    
    // Default fields if no value data exists
    return [
      {
        id: `${kpi.id}-value`,
        name: 'Valore',
        description: 'Misura corrente',
        type: 'number'
      },
      {
        id: `${kpi.id}-unit`,
        name: 'Unità di misura',
        description: 'Unità della grandezza',
        type: 'text',
      }
    ];
  };

  // Map KPI field types to alert field types
  const mapFieldType = (type: string): 'number' | 'decimal' | 'text' | 'boolean' | 'unsupported' => {
    switch (String(type).toLowerCase()) {
      case 'number':
        return 'number';
      case 'decimal':
        return 'decimal';
      case 'text':
      case 'textarea':
        return 'text';
      case 'boolean':
      case 'si/no':
      case 'sì/no':
        return 'boolean';
      default:
        return 'unsupported';
    }
  };

  const handleOpenAlertSheet = (kpi: KPI) => {
    setSelectedKpiForAlert(kpi)
    // Carica condizioni/email solo per questo KPI
    if (kpiAlertConditions[kpi.id]) {
      setLocalAlertEmail(kpiAlertConditions[kpi.id].email)
      setLocalAlertConditions(kpiAlertConditions[kpi.id].conditions)
    } else {
      setLocalAlertEmail("")
      setLocalAlertConditions([])
    }
    setIsAlertSheetOpen(true)
  }

  // Auto-save alert conditions from the sheet to the main state
  useEffect(() => {
    if (!isAlertSheetOpen || !selectedKpiForAlert) return;

    const handler = setTimeout(() => {
      const activeConditions = localAlertConditions.filter(c => 
        (c.type === 'number' && (c.min !== undefined || c.max !== undefined)) ||
        (c.type === 'decimal' && (c.min !== undefined || c.max !== undefined)) ||
        (c.type === 'text' && c.match_text) ||
        (c.type === 'boolean' && c.boolean_value !== undefined)
      );
      
      const hasActiveConditions = activeConditions.length > 0;

      if (localAlertEmail && hasActiveConditions) {
        setKpiAlertConditions(prev => ({
          ...prev,
          [selectedKpiForAlert.id]: {
            email: localAlertEmail,
            conditions: activeConditions
          }
        }));
      } else {
        setKpiAlertConditions(prev => {
          if (!selectedKpiForAlert) return prev;
          const { [selectedKpiForAlert.id]: _, ...rest } = prev;
          return rest;
        });
      }
    }, 500); // Debounce changes

    return () => {
      clearTimeout(handler);
    };
  }, [localAlertEmail, localAlertConditions, selectedKpiForAlert, isAlertSheetOpen, setKpiAlertConditions]);

  // Update the global todolist context with all KPI alert conditions when creating todolist
  useEffect(() => {
    const allKpisWithAlerts = Object.values(kpiAlertConditions);
    const allConditions = allKpisWithAlerts.flatMap(kpi => kpi.conditions);
    const allEmails = [...new Set(allKpisWithAlerts.map(kpi => kpi.email))];
    
    if (allConditions.length > 0 && allEmails.length === 1) {
      setAlertConditions(allConditions);
      setAlertEmail(allEmails[0]);
    } else {
      setAlertConditions([]);
      setAlertEmail("");
    }
  }, [kpiAlertConditions, setAlertConditions, setAlertEmail]);

  const handleConditionChange = (
    fieldId: string,
    type: 'number' | 'decimal' | 'text' | 'boolean',
    value: Partial<AlertCondition>
  ) => {
    const existing = localAlertConditions.findIndex((c) => c.field_id === fieldId)
    if (existing >= 0) {
      const updated = [...localAlertConditions]
      updated[existing] = { ...updated[existing], ...value }
      setLocalAlertConditions(updated)
    } else {
      setLocalAlertConditions([...localAlertConditions, { field_id: fieldId, type, ...value } as AlertCondition])
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center">
            Controlli
            {errors.kpis && (
              <div className="ml-2 text-red-500 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                <span className="text-xs font-normal">{errors.kpis}</span>
              </div>
            )}
          </CardTitle>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{selectedKpis.size} selezionati</span>
            <Button type="button" variant="outline" size="sm" className="flex items-center"
              onClick={() => setIsKpiSheetOpen(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Seleziona
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {selectedKpisArray.length > 0 ? (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden md:table-cell">Descrizione</TableHead>
                  <TableHead>Alert</TableHead>
                  <TableHead>Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedKpisArray.map((kpi) => {
                  const alertInfo = kpiAlertConditions[kpi.id]
                  let alertSummary = "Nessun alert"
                  if (alertInfo && alertInfo.conditions && alertInfo.conditions.length > 0 && alertInfo.email) {
                    alertSummary = `${alertInfo.conditions.length} condizione${alertInfo.conditions.length > 1 ? 'i' : ''}, email: ${alertInfo.email}`
                  }
                  return (
                    <TableRow key={kpi.id}>
                      <TableCell>{kpi.name}</TableCell>
                      <TableCell className="hidden md:table-cell">{kpi.description || "-"}</TableCell>
                      <TableCell>{alertSummary}</TableCell>
                      <TableCell>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleOpenAlertSheet(kpi)}
                        >
                          <BellRing className="h-4 w-4 mr-2" />
                          Imposta Alert
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center border rounded-md p-8 text-center">
            <Settings className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium mb-2">Nessun Controllo selezionato</h3>
            <p className="text-sm text-gray-500 mb-4">
              Clicca sul pulsante "Seleziona" per aggiungere Controlli alla todolist
            </p>
            <Button type="button" onClick={() => setIsKpiSheetOpen(true)} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Seleziona Controlli
            </Button>
          </div>
        )}
      </CardContent>

      {/* KPI Selection Sheet */}
      <Sheet open={isKpiSheetOpen} onOpenChange={setIsKpiSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Seleziona Controlli</SheetTitle>
          </SheetHeader>
          <KpiSelectionSheetContent 
            onSelectKpi={(kpiId) => {
              const newSelection = new Set(selectedKpis);
              if (newSelection.has(kpiId)) {
                newSelection.delete(kpiId);
              } else {
                newSelection.add(kpiId);
              }
              setSelectedKpis(newSelection);
            }}
          />
        </SheetContent>
      </Sheet>

      {/* Alert Sheet */}
      <Sheet open={isAlertSheetOpen} onOpenChange={setIsAlertSheetOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {selectedKpiForAlert && `Imposta alert per il controllo ${selectedKpiForAlert.name}`}
            </SheetTitle>
          </SheetHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="Enter email for notifications"
                value={localAlertEmail}
                onChange={(e) => setLocalAlertEmail(e.target.value)}
              />
            </div>

            {selectedKpiForAlert && getKpiFields(selectedKpiForAlert)
              .filter(field => field.type !== 'unsupported')
              .map((field) => (
              <div key={field.id} className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor={field.id}>{field.name}</Label>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    {field.type === 'boolean' ? 'Sì/No' : field.type}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{field.description}</p>
                
                {field.type === 'number' ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor={`${field.id}-min`}>Min</Label>
                        <Input 
                          id={`${field.id}-min`} 
                          type="number" 
                          placeholder="Minimum value"
                          value={localAlertConditions.find(c => c.field_id === field.id)?.min ?? ''}
                          onChange={(e) => handleConditionChange(
                            field.id,
                            'number',
                            { min: e.target.value ? Number(e.target.value) : undefined }
                          )}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`${field.id}-max`}>Max</Label>
                        <Input 
                          id={`${field.id}-max`} 
                          type="number" 
                          placeholder="Maximum value"
                          value={localAlertConditions.find(c => c.field_id === field.id)?.max ?? ''}
                          onChange={(e) => handleConditionChange(
                            field.id,
                            'number',
                            { max: e.target.value ? Number(e.target.value) : undefined }
                          )}
                        />
                      </div>
                    </div>
                  </div>
                ) : field.type === 'decimal' ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor={`${field.id}-min`}>Min</Label>
                        <Input 
                          id={`${field.id}-min`} 
                          type="text" 
                          placeholder="Valore minimo (es. 3,14)"
                          value={String(localAlertConditions.find(c => c.field_id === field.id)?.min ?? '')}
                          onChange={(e) => {
                            const value = e.target.value
                            // Allow only digits, minus sign, and one decimal separator (comma or dot)
                            if (value === '' || /^-?\d*[.,]?\d*$/.test(value)) {
                              // Check that there's only one decimal separator
                              const commaCount = (value.match(/,/g) || []).length
                              const dotCount = (value.match(/\./g) || []).length
                              if (commaCount + dotCount <= 1) {
                                // Store as string to preserve comma/dot during input
                                handleConditionChange(
                                  field.id,
                                  'decimal',
                                  { min: value === '' ? undefined : value }
                                )
                              }
                            }
                          }}
                          onBlur={(e) => {
                            // Convert to number only when leaving the field
                            const value = e.target.value
                            if (value && value !== '') {
                              const normalizedValue = value.replace(',', '.')
                              const parsedValue = parseFloat(normalizedValue)
                              if (!isNaN(parsedValue)) {
                                handleConditionChange(
                                  field.id,
                                  'decimal',
                                  { min: parsedValue }
                                )
                              }
                            }
                          }}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`${field.id}-max`}>Max</Label>
                        <Input 
                          id={`${field.id}-max`} 
                          type="text" 
                          placeholder="Valore massimo (es. 3,14)"
                          value={String(localAlertConditions.find(c => c.field_id === field.id)?.max ?? '')}
                          onChange={(e) => {
                            const value = e.target.value
                            // Allow only digits, minus sign, and one decimal separator (comma or dot)
                            if (value === '' || /^-?\d*[.,]?\d*$/.test(value)) {
                              // Check that there's only one decimal separator
                              const commaCount = (value.match(/,/g) || []).length
                              const dotCount = (value.match(/\./g) || []).length
                              if (commaCount + dotCount <= 1) {
                                // Store as string to preserve comma/dot during input
                                handleConditionChange(
                                  field.id,
                                  'decimal',
                                  { max: value === '' ? undefined : value }
                                )
                              }
                            }
                          }}
                          onBlur={(e) => {
                            // Convert to number only when leaving the field
                            const value = e.target.value
                            if (value && value !== '') {
                              const normalizedValue = value.replace(',', '.')
                              const parsedValue = parseFloat(normalizedValue)
                              if (!isNaN(parsedValue)) {
                                handleConditionChange(
                                  field.id,
                                  'decimal',
                                  { max: parsedValue }
                                )
                              }
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ) : field.type === 'text' ? (
                  <div className="space-y-2">
                    <Label htmlFor={`${field.id}-match`}>Alert when text contains:</Label>
                    <Input 
                      id={`${field.id}-match`} 
                      placeholder="Text to match"
                      value={localAlertConditions.find(c => c.field_id === field.id)?.match_text ?? ''}
                      onChange={(e) => handleConditionChange(
                        field.id,
                        'text',
                        { match_text: e.target.value }
                      )}
                    />
                  </div>
                ) : field.type === 'boolean' ? (
                  <div className="space-y-2">
                    <Label htmlFor={`${field.id}-boolean`}>Alert when value is:</Label>
                    <div className="flex space-x-4">
                      <div className="flex items-center space-x-2">
                        <input 
                          type="radio" 
                          id={`${field.id}-true`} 
                          name={`${field.id}-boolean`} 
                          checked={localAlertConditions.find(c => c.field_id === field.id)?.boolean_value === true}
                          onChange={() => handleConditionChange(
                            field.id,
                            'boolean',
                            { boolean_value: true }
                          )}
                        />
                        <Label htmlFor={`${field.id}-true`}>Sì</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input 
                          type="radio" 
                          id={`${field.id}-false`} 
                          name={`${field.id}-boolean`} 
                          checked={localAlertConditions.find(c => c.field_id === field.id)?.boolean_value === false}
                          onChange={() => handleConditionChange(
                            field.id,
                            'boolean',
                            { boolean_value: false }
                          )}
                        />
                        <Label htmlFor={`${field.id}-false`}>No</Label>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </Card>
  )
}