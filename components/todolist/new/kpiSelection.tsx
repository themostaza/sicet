"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { AlertCircle, Plus, Settings, BellRing } from "lucide-react"
import { useTodolist } from "./context"
import { useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

// Define types for KPI and field
interface KpiField {
  id: string;
  name: string;
  description?: string;
  type: 'numeric' | 'text' | 'boolean' | string;
  placeholder?: string;
  matchAlert?: boolean;
  min?: string | number;
  max?: string | number;
  required?: boolean;
}

interface Kpi {
  id: string;
  nome: string;
  descrizione?: string | null;
  fields?: KpiField[];
  value?: any;
}

export function KpiSelection() {
  const { 
    selectedKpisArray, 
    selectedKpis, 
    isKpiSheetOpen, 
    setIsKpiSheetOpen,
    errors 
  } = useTodolist()
  
  const [isAlertSheetOpen, setIsAlertSheetOpen] = useState(false)
  const [selectedKpiForAlert, setSelectedKpiForAlert] = useState<Kpi | null>(null)

  // Create fields from KPI value data
  const getKpiFields = (kpi: Kpi): KpiField[] => {
    // If kpi already has fields defined, use those
    if (kpi.fields && kpi.fields.length > 0) {
      return kpi.fields;
    }
    
    // Check if kpi has value property with field definitions
    if (kpi.value) {
      const fields: KpiField[] = [];
      
      // Handle array of fields
      if (Array.isArray(kpi.value)) {
        return kpi.value.map((field: any) => ({
          id: field.id || `${kpi.id}-${field.name}`,
          name: field.name,
          description: field.description,
          type: mapFieldType(field.type),
          min: field.min,
          max: field.max,
          required: field.required,
          matchAlert: field.type === 'text'
        }));
      } 
      // Handle single field object
      else if (typeof kpi.value === 'object' && kpi.value !== null) {
        return [{
          id: kpi.value.id || `${kpi.id}-value`,
          name: kpi.value.name || 'Valore',
          description: kpi.value.description,
          type: mapFieldType(kpi.value.type),
          min: kpi.value.min,
          max: kpi.value.max,
          required: kpi.value.required,
          matchAlert: kpi.value.type === 'text'
        }];
      }
    }
    
    // Default fields if no value data exists
    return [
      {
        id: `${kpi.id}-value`,
        name: 'Valore',
        description: 'Misura corrente',
        type: 'numeric'
      },
      {
        id: `${kpi.id}-unit`,
        name: 'Unità di misura',
        description: 'Unità della grandezza',
        type: 'text',
        matchAlert: true
      }
    ];
  };

  // Map KPI field types to alert field types
  const mapFieldType = (type: string): 'numeric' | 'text' | 'boolean' | string => {
    switch (type) {
      case 'number':
      case 'decimal':
        return 'numeric';
      case 'text':
      case 'textarea':
      case 'select':
        return 'text';
      case 'boolean':
      case 'Si/No':
      case 'Sì/No':
        return 'boolean';
      default:
        return type || 'text';
    }
  };

  const handleOpenAlertSheet = (kpi: Kpi) => {
    setSelectedKpiForAlert(kpi)
    setIsAlertSheetOpen(true)
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
                  <TableHead>Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedKpisArray.map((kpi) => (
                  <TableRow key={kpi.id}>
                    <TableCell>{kpi.nome}</TableCell>
                    <TableCell className="hidden md:table-cell">{kpi.descrizione || "-"}</TableCell>
                    <TableCell>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleOpenAlertSheet(kpi)}
                      >
                        <BellRing className="h-4 w-4 mr-2" />
                        Set Alert
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
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

      {/* Alert Sheet */}
      <Sheet open={isAlertSheetOpen} onOpenChange={setIsAlertSheetOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {selectedKpiForAlert && `Imposta alert per il controllo ${selectedKpiForAlert.nome}`}
            </SheetTitle>
          </SheetHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-2">
              <Switch id="activate-alert" />
              <Label htmlFor="activate-alert">Activate Alert</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="Enter email for notifications" />
            </div>

            {selectedKpiForAlert && getKpiFields(selectedKpiForAlert).map((field) => (
              <div key={field.id} className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor={field.id}>{field.name}</Label>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    {field.type === 'boolean' ? 'Sì/No' : field.type}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{field.description}</p>
                
                {field.type === 'numeric' ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor={`${field.id}-min`}>Min</Label>
                        <Input 
                          id={`${field.id}-min`} 
                          type="number" 
                          placeholder="Minimum value" 
                        />
                      </div>
                      <div>
                        <Label htmlFor={`${field.id}-max`}>Max</Label>
                        <Input 
                          id={`${field.id}-max`} 
                          type="number" 
                          placeholder="Maximum value" 
                        />
                      </div>
                    </div>
                  </div>
                ) : field.type === 'text' && field.matchAlert ? (
                  <div className="space-y-2">
                    <Label htmlFor={`${field.id}-match`}>Alert when text matches:</Label>
                    <Input 
                      id={`${field.id}-match`} 
                      placeholder="Text to match" 
                    />
                  </div>
                ) : field.type === 'boolean' ? (
                  <div className="space-y-2">
                    <Label htmlFor={`${field.id}-boolean`}>Alert when value is:</Label>
                    <div className="flex space-x-4">
                      <div className="flex items-center space-x-2">
                        <input 
                          type="radio" 
                          id={`${field.id}-boolean-si`} 
                          name={`${field.id}-boolean`} 
                          value="si" 
                        />
                        <Label htmlFor={`${field.id}-boolean-si`}>Sì</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input 
                          type="radio" 
                          id={`${field.id}-boolean-no`} 
                          name={`${field.id}-boolean`} 
                          value="no" 
                        />
                        <Label htmlFor={`${field.id}-boolean-no`}>No</Label>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <div className="flex justify-end mt-6">
            <Button type="button">Save</Button>
          </div>
        </SheetContent>
      </Sheet>
    </Card>
  )
}