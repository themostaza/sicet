import React, { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog"
import { Trash, Pencil, Upload, FileSpreadsheet, Mail, Plus, AlertCircle, Search, Check, ChevronDown, Download } from "lucide-react"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { formatDateEuropean } from "@/lib/utils"

function isValidExcelCell(ref: string) {
  // Regex: una o più lettere (A-Z, case insensitive) seguite da uno o più numeri
  return /^[A-Za-z]+[1-9][0-9]*$/.test(ref.trim())
}

export default function ImportExportTab() {
  const [open, setOpen] = useState(false)
  // Stato per la mappatura dei campi
  const [mapping, setMapping] = useState([
    { excelField: "", kpi: "" }
  ])
  // Stato per errori di validazione
  const [errors, setErrors] = useState<{ [idx: number]: boolean }>({})
  const [templateName, setTemplateName] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [templates, setTemplates] = useState<any[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [deleteId, setDeleteId] = useState<string|null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editTemplate, setEditTemplate] = useState<any|null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const editFileInputRef = useRef<HTMLInputElement>(null)
  const [autosend, setAutosend] = useState(false)
  const [autosendEmail, setAutosendEmail] = useState("")
  const [editAutosend, setEditAutosend] = useState(false)
  const [editAutosendEmail, setEditAutosendEmail] = useState("")
  
  // Stati per la gestione dei KPI
  const [kpis, setKpis] = useState<any[]>([])
  const [kpiSelectorOpen, setKpiSelectorOpen] = useState<number | null>(null)
  const [selectedKpi, setSelectedKpi] = useState<any | null>(null)
  const [fieldSelectorOpen, setFieldSelectorOpen] = useState<number | null>(null)
  const [kpiSearch, setKpiSearch] = useState("")
  const [loadingKpis, setLoadingKpis] = useState(false)

  const handleMappingChange = (idx: number, field: string, value: string) => {
    let newValue = value;
    if (field === "excelField") {
      newValue = value.toUpperCase();
    }
    setMapping(prev => prev.map((row, i) => i === idx ? { ...row, [field]: newValue } : row))
    // Se si modifica excelField, aggiorna errori
    if (field === "excelField") {
      setErrors(prev => ({ ...prev, [idx]: !!(newValue && !isValidExcelCell(newValue)) }))
    }
  }

  const handleKpiMappingChange = (idx: number, kpiId: string, fieldName: string, displayValue: string) => {
    setMapping(prev => prev.map((row, i) => i === idx ? { 
      ...row, 
      kpi: displayValue,
      kpiId: kpiId,
      fieldName: fieldName
    } : row))
  }

  const handleEditKpiMappingChange = (idx: number, kpiId: string, fieldName: string, displayValue: string) => {
    setEditTemplate((tpl: any) => {
      const mapping = [...tpl.mapping]
      mapping[idx] = { 
        ...mapping[idx], 
        kpi: displayValue,
        kpiId: kpiId,
        fieldName: fieldName
      }
      return { ...tpl, mapping }
    })
  }

  const handleAddMapping = () => {
    setMapping(prev => [...prev, { excelField: "", kpi: "" }])
  }

  const handleRemoveMapping = (idx: number) => {
    setMapping(prev => prev.filter((_, i) => i !== idx))
    setErrors(prev => {
      const newErr = { ...prev }
      delete newErr[idx]
      return newErr
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    } else {
      setFile(null)
    }
  }

  const handleSave = async () => {
    console.log("handleSave chiamata");
    if (!templateName.trim() || !file || mapping.some((m, idx) => !m.excelField || !m.kpi || errors[idx]) || (autosend && !/^\S+@\S+\.\S+$/.test(autosendEmail))) {
      alert("Compila tutti i campi obbligatori e correggi eventuali errori.")
      return
    }
    setIsSaving(true)
    try {
      // 1. Upload file su Supabase Storage
      const supabase = createClientSupabaseClient()
      const filePath = `public/${file.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage.from('files').upload(filePath, file, { upsert: true })
      if (uploadError) throw new Error(uploadError.message)
      // 2. Ottieni la public URL del file
      const { data: publicUrlData } = supabase.storage.from('files').getPublicUrl(filePath)
      const file_url = publicUrlData?.publicUrl
      if (!file_url) throw new Error("Impossibile ottenere la URL pubblica del file")
      // 3. Chiamata API per salvare il template
      console.log("Invio fetch a /api/templates", { templateName, file_url, mapping });
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_name: templateName,
          file_url,
          field_mapping: mapping,
          email_autosend: autosend ? autosendEmail : null,
        })
      })
      console.log("Risposta fetch /api/templates", res);
      if (!res.ok) throw new Error("Errore nel salvataggio del template")
      // 4. Reset e chiudi dialog
      setOpen(false)
      setTemplateName("")
      setFile(null)
      setMapping([{ excelField: "", kpi: "" }])
      setAutosend(false)
      setAutosendEmail("")
      if (fileInputRef.current) fileInputRef.current.value = ""
      setShowSuccess(true)
    } catch (err: any) {
      alert("Errore: " + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  // Fetch templates
  const fetchTemplates = async () => {
    setLoadingTemplates(true)
    try {
      const res = await fetch("/api/templates")
      const json = await res.json()
      if (json.success) {
        setTemplates(json.templates)
      } else {
        setTemplates([])
      }
    } catch (err) {
      setTemplates([])
    } finally {
      setLoadingTemplates(false)
    }
  }

  // Fetch KPIs per la selezione
  const fetchKpis = async (search: string = '') => {
    setLoadingKpis(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      const res = await fetch(`/api/templates/kpis?${params}`)
      const json = await res.json()
      if (json.success) {
        setKpis(json.kpis)
      } else {
        setKpis([])
      }
    } catch (err) {
      setKpis([])
    } finally {
      setLoadingKpis(false)
    }
  }

  useEffect(() => {
    fetchTemplates()
    fetchKpis()
  }, [])

  // Aggiorna la tabella dopo la creazione
  useEffect(() => {
    if (showSuccess) fetchTemplates()
  }, [showSuccess])

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/templates?id=${deleteId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Errore durante l\'eliminazione')
      setDeleteId(null)
      fetchTemplates()
    } catch (err) {
      alert('Errore durante l\'eliminazione')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleEdit = (tpl: any) => {
    setEditTemplate({ ...tpl })
  }

  useEffect(() => {
    if (editTemplate) {
      setEditAutosend(!!editTemplate.email_autosend)
      setEditAutosendEmail(editTemplate.email_autosend || "")
    }
  }, [editTemplate])

  const handleEditSave = async () => {
    if (!editTemplate.template_name.trim() || editTemplate.mapping.some((m: any, idx: number) => !m.excelField || !m.kpi || errors[idx]) || (editAutosend && !/^\S+@\S+\.\S+$/.test(editAutosendEmail))) {
      alert("Compila tutti i campi obbligatori e correggi eventuali errori.")
      return
    }
    setIsEditing(true)
    try {
      let file_url = editTemplate.file_url
      // Se è stato selezionato un nuovo file, caricalo
      if (editTemplate.file) {
        const supabase = createClientSupabaseClient()
        const filePath = `public/${editTemplate.file.name}`
        const { data: uploadData, error: uploadError } = await supabase.storage.from('files').upload(filePath, editTemplate.file, { upsert: true })
        if (uploadError) throw new Error(uploadError.message)
        const { data: publicUrlData } = supabase.storage.from('files').getPublicUrl(filePath)
        file_url = publicUrlData?.publicUrl
        if (!file_url) throw new Error("Impossibile ottenere la URL pubblica del file")
      }
      const res = await fetch("/api/templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editTemplate.id,
          template_name: editTemplate.template_name,
          file_url,
          field_mapping: editTemplate.mapping,
          email_autosend: editAutosend ? editAutosendEmail : null,
        })
      })
      if (!res.ok) throw new Error("Errore nel salvataggio della modifica")
      setEditTemplate(null)
      setEditAutosend(false)
      setEditAutosendEmail("")
      fetchTemplates()
    } catch (err: any) {
      alert("Errore: " + err.message)
    } finally {
      setIsEditing(false)
    }
  }

  const isFormValid = () => {
    return templateName.trim() && file && mapping.every((m, idx) => m.excelField && m.kpi && !errors[idx]) && (!autosend || /^\S+@\S+\.\S+$/.test(autosendEmail))
  }

  const isEditFormValid = () => {
    return editTemplate?.template_name?.trim() && editTemplate?.mapping?.every((m: any, idx: number) => m.excelField && m.kpi && !errors[idx]) && (!editAutosend || /^\S+@\S+\.\S+$/.test(editAutosendEmail))
  }

  // Componente per la selezione del KPI e campo
  const KpiFieldSelector = ({ 
    idx, 
    value, 
    onChange, 
    disabled,
    isEdit = false 
  }: { 
    idx: number, 
    value: string, 
    onChange: (kpiId: string, fieldName: string, displayValue: string) => void,
    disabled: boolean,
    isEdit?: boolean
  }) => {
    const [open, setOpen] = useState(false)
    const [selectedKpiId, setSelectedKpiId] = useState<string | null>(null)
    const [selectedKpi, setSelectedKpi] = useState<any | null>(null)
    const [searchTerm, setSearchTerm] = useState("")

    // Estrai KPI ID e field name dal valore attuale
    const parseCurrentValue = (val: string) => {
      if (val.includes(' > ')) {
        const parts = val.split(' > ')
        return { kpiId: parts[0], fieldName: parts[1] }
      }
      return { kpiId: '', fieldName: '' }
    }

    const currentValue = parseCurrentValue(value)
    const displayValue = value || "Seleziona KPI..."

    const handleKpiSelect = (kpi: any) => {
      setSelectedKpiId(kpi.id)
      setSelectedKpi(kpi)
    }

    const handleFieldSelect = (fieldName: string) => {
      if (selectedKpi) {
        const displayValue = `${selectedKpi.name} > ${fieldName}`
        onChange(selectedKpi.id, fieldName, displayValue)
        setOpen(false)
        setSelectedKpiId(null)
        setSelectedKpi(null)
      }
    }

    const filteredKpis = kpis.filter(kpi => 
      kpi.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      kpi.id.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            disabled={disabled}
            className="w-full justify-between text-left font-normal"
          >
            <span className="truncate">{displayValue}</span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DialogTrigger>
        <DialogContent className="fixed max-w-2xl max-h-[80vh] overflow-hidden p-0 z-[200] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle>Seleziona Controllo e Campo</DialogTitle>
            <DialogDescription>
              Scegli prima il Controllo, poi seleziona il campo specifico da mappare
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-6 pt-0 space-y-4">
            {/* Ricerca KPI */}
            <div className="space-y-2">
              <Label>Cerca Controllo</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca per nome o ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Lista KPI */}
            {!selectedKpi && (
              <div className="space-y-2">
                <Label>Controlli Disponibili</Label>
                <div className="border rounded-md max-h-60 overflow-y-auto">
                  {filteredKpis.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      {searchTerm ? "Nessun Controllo trovato" : "Nessun Controllo disponibile"}
                    </div>
                  ) : (
                    filteredKpis.map((kpi) => (
                      <div
                        key={kpi.id}
                        className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                        onClick={() => handleKpiSelect(kpi)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="font-medium">{kpi.name}</div>
                            <div className="text-sm text-muted-foreground">
                              ID: {kpi.id} • {kpi.fields.length} campi
                            </div>
                            {kpi.description && (
                              <div className="text-xs text-muted-foreground">
                                {kpi.description}
                              </div>
                            )}
                          </div>
                          <ChevronDown className="h-4 w-4 rotate-270" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Selezione campo */}
            {selectedKpi && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedKpi(null)
                      setSelectedKpiId(null)
                    }}
                  >
                    ← Indietro
                  </Button>
                  <div className="flex-1">
                    <Label>Campi per: {selectedKpi.name}</Label>
                  </div>
                </div>
                <div className="border rounded-md max-h-60 overflow-y-auto">
                  {selectedKpi.fields.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      Nessun campo disponibile per questo Controllo
                    </div>
                  ) : (
                    selectedKpi.fields.map((field: any, fieldIdx: number) => (
                      <div
                        key={fieldIdx}
                        className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                        onClick={() => handleFieldSelect(field.name)}
                      >
                        <div className="space-y-1">
                          <div className="font-medium">{field.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Tipo: {field.type}
                            {field.required && <Badge variant="outline" className="ml-2">Richiesto</Badge>}
                          </div>
                          {field.description && (
                            <div className="text-xs text-muted-foreground">
                              {field.description}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Template Import/Export</h1>
        <p className="text-muted-foreground">Gestisci i template per l'esportazione dei dati in formato Excel personalizzato</p>
      </div>
      
      <div className="flex justify-end mb-6">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nuovo Template
            </Button>
          </DialogTrigger>
          <DialogContent className="fixed inset-0 w-screen h-screen max-w-none max-h-none rounded-none p-0 bg-background z-[100]">
            <div className="h-full overflow-y-auto p-8 space-y-6">
              {/* Titolo e descrizione */}
              <div className="space-y-2">
                <DialogTitle className="text-2xl font-semibold">Crea Nuovo Template</DialogTitle>
                <DialogDescription className="text-base">
                  Configura un nuovo template per l'esportazione personalizzata dei dati
                </DialogDescription>
              </div>

              {/* Pulsanti azione */}
              <div className="flex justify-end gap-3 pb-4 border-b">
                <DialogClose asChild>
                  <Button variant="outline" disabled={isSaving}>
                    Annulla
                  </Button>
                </DialogClose>
                <Button 
                  onClick={handleSave} 
                  disabled={isSaving || !isFormValid()}
                  className="gap-2"
                >
                  {isSaving ? "Salvataggio..." : "Salva Template"}
                </Button>
              </div>

              {/* Sezione Informazioni Base */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5" />
                    Informazioni Template
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="template-name">Nome del Template *</Label>
                      <Input
                        id="template-name"
                        placeholder="Es. Report Mensile Punto di Controllo"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        disabled={isSaving}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="file-upload">File Excel *</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="file-upload"
                          ref={fileInputRef}
                          type="file"
                          accept=".xlsx,.xls"
                          onChange={handleFileChange}
                          disabled={isSaving}
                          className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                        />
                        <Upload className="w-4 h-4 text-muted-foreground" />
                      </div>
                      {file && (
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="gap-1">
                            <FileSpreadsheet className="w-3 h-3" />
                            {file.name}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sezione Mappatura Campi */}
              <Card>
                <CardHeader>
                  <CardTitle>Mappatura Campi Excel</CardTitle>
                  <CardDescription>
                    Associa le celle Excel ai Controlli da esportare
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {mapping.map((row, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-4 border rounded-lg bg-muted/50">
                        <div className="flex-1 space-y-2">
                          <Label className="text-sm font-medium">Cella Excel</Label>
                          <Input
                            placeholder="Es. B2, C5, AA10"
                            value={row.excelField}
                            onChange={(e) => handleMappingChange(idx, "excelField", e.target.value)}
                            disabled={isSaving}
                            className={errors[idx] ? "border-destructive" : ""}
                          />
                          {errors[idx] && (
                            <Alert variant="destructive" className="py-2">
                              <AlertCircle className="w-4 h-4" />
                              <AlertDescription className="text-xs">
                                Inserisci un riferimento valido (es: A1, B2, AA10)
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          <Label className="text-sm font-medium">Controllo Associato</Label>
                          <KpiFieldSelector
                            idx={idx}
                            value={row.kpi}
                            onChange={(kpiId, fieldName, displayValue) => handleKpiMappingChange(idx, kpiId, fieldName, displayValue)}
                            disabled={isSaving}
                          />
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveMapping(idx)}
                          disabled={mapping.length === 1 || isSaving}
                          className="mt-7"
                        >
                          <Trash className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleAddMapping}
                    disabled={isSaving}
                    className="w-full gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Aggiungi Mappatura
                  </Button>
                </CardContent>
              </Card>

              {/* Sezione Invio Automatico */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Invio Automatico
                  </CardTitle>
                  <CardDescription>
                    Configura l'invio automatico giornaliero del report
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Attiva invio automatico</Label>
                      <p className="text-sm text-muted-foreground">Il report verrà inviato automaticamente ogni giorno</p>
                    </div>
                    <Switch
                      checked={autosend}
                      onCheckedChange={setAutosend}
                      disabled={isSaving}
                    />
                  </div>
                  {autosend && (
                    <div className="space-y-2">
                      <Label htmlFor="email-recipient">Email Destinatario *</Label>
                      <Input
                        id="email-recipient"
                        type="email"
                        placeholder="utente@email.com"
                        value={autosendEmail}
                        onChange={(e) => setAutosendEmail(e.target.value)}
                        disabled={isSaving}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
      </div>

             {/* Tabella Templates */}
       <Card>
         <CardHeader>
           <CardTitle>Template</CardTitle>
           <CardDescription>
             Gestisci i template di esportazione configurati
           </CardDescription>
         </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="h-12 px-4 text-left align-middle font-medium">Nome Template</th>
                  <th className="h-12 px-4 text-left align-middle font-medium">Data Creazione</th>
                  <th className="h-12 px-4 text-left align-middle font-medium">Invio Auto</th>
                  <th className="h-12 px-4 text-left align-middle font-medium">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {loadingTemplates ? (
                  <tr>
                    <td colSpan={4} className="h-24 px-4 text-center text-muted-foreground">
                      Caricamento templates...
                    </td>
                  </tr>
                ) : templates.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="h-24 px-4 text-center text-muted-foreground">
                      Nessun template presente. Crea il primo template per iniziare.
                    </td>
                  </tr>
                ) : (
                  templates.map((tpl) => (
                    <tr key={tpl.id} className="border-b">
                      <td className="px-4 py-3 font-medium">{tpl.template_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {tpl.created_at ? formatDateEuropean(tpl.created_at) : "-"}
                      </td>
                      <td className="px-4 py-3">
                        {tpl.email_autosend ? (
                          <Badge variant="outline" className="gap-1">
                            <Mail className="w-3 h-3" />
                            Attivo
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Disattivo</Badge>
                        )}
                      </td>
                                             <td className="px-4 py-3">
                         <div className="flex gap-2">
                           <Button
                             variant="default"
                             size="sm"
                             onClick={() => {/* TODO: Implementare elaborazione */}}
                             className="gap-1"
                           >
                             <Download className="w-3 h-3" />
                             Elabora adesso
                           </Button>
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => handleEdit({ ...tpl, mapping: tpl.field_mapping || [] })}
                             className="gap-1"
                           >
                             <Pencil className="w-3 h-3" />
                             Modifica
                           </Button>
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => setDeleteId(tpl.id)}
                             className="gap-1 text-destructive hover:text-destructive"
                           >
                             <Trash className="w-3 h-3" />
                             Elimina
                           </Button>
                         </div>
                       </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Successo */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl text-green-600">Template Creato!</DialogTitle>
            <DialogDescription>
              Il template è stato creato con successo e è ora disponibile per l'uso.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end mt-4">
            <DialogClose asChild>
              <Button>Perfetto</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Conferma Eliminazione */}
      <Dialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Conferma Eliminazione</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare questo template? Questa azione non può essere annullata.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-6">
            <DialogClose asChild>
              <Button variant="outline" disabled={isDeleting}>
                Annulla
              </Button>
            </DialogClose>
            <Button 
              variant="destructive" 
              onClick={handleDelete} 
              disabled={isDeleting}
              className="gap-2"
            >
              {isDeleting ? "Eliminazione..." : "Elimina"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

                    {/* Dialog Modifica Template */}
       <Dialog open={!!editTemplate} onOpenChange={(v) => !v && setEditTemplate(null)}>
         <DialogContent className="fixed inset-0 w-screen h-screen max-w-none max-h-none rounded-none p-0 bg-background z-[100]">
           <div className="h-full overflow-y-auto p-8 space-y-6">
             {/* Titolo e descrizione */}
             <div className="space-y-2">
               <DialogTitle className="text-2xl font-semibold">Modifica Template</DialogTitle>
               <DialogDescription className="text-base">
                 Aggiorna le configurazioni del template esistente
               </DialogDescription>
             </div>

             {/* Pulsanti azione */}
             <div className="flex justify-end gap-3 pb-4 border-b">
               <DialogClose asChild>
                 <Button variant="outline" disabled={isEditing}>
                   Annulla
                 </Button>
               </DialogClose>
               <Button 
                 onClick={handleEditSave} 
                 disabled={isEditing || !isEditFormValid()}
                 className="gap-2"
               >
                 {isEditing ? "Salvataggio..." : "Salva Modifiche"}
               </Button>
             </div>

                          {/* Sezione Informazioni Base */}
             <Card>
               <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                   <FileSpreadsheet className="w-5 h-5" />
                   Informazioni Template
                 </CardTitle>
               </CardHeader>
               <CardContent className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label htmlFor="edit-template-name">Nome del Template *</Label>
                     <Input
                       id="edit-template-name"
                       placeholder="Es. Report Mensile Punto di Controllo"
                       value={editTemplate?.template_name || ""}
                       onChange={(e) => setEditTemplate((tpl: any) => ({ ...tpl, template_name: e.target.value }))}
                       disabled={isEditing}
                     />
                   </div>
                   <div className="space-y-2">
                     <Label htmlFor="edit-file-upload">Sostituisci File Excel</Label>
                     <div className="flex items-center gap-2">
                       <Input
                         id="edit-file-upload"
                         ref={editFileInputRef}
                         type="file"
                         accept=".xlsx,.xls"
                         onChange={(e) => setEditTemplate((tpl: any) => ({ ...tpl, file: e.target.files?.[0] }))}
                         disabled={isEditing}
                         className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                       />
                       <Upload className="w-4 h-4 text-muted-foreground" />
                     </div>
                     {editTemplate?.file_url && (
                       <div className="flex items-center gap-2 mt-2">
                         <Badge variant="outline" className="gap-1">
                           <FileSpreadsheet className="w-3 h-3" />
                           File attuale: {editTemplate.file_url.split('/').pop()}
                         </Badge>
                       </div>
                     )}
                     {editTemplate?.file && (
                       <div className="flex items-center gap-2 mt-2">
                         <Badge variant="default" className="gap-1">
                           <FileSpreadsheet className="w-3 h-3" />
                           Nuovo: {editTemplate.file.name}
                         </Badge>
                       </div>
                     )}
                   </div>
                 </div>
               </CardContent>
             </Card>

             {/* Sezione Mappatura Campi */}
             <Card>
               <CardHeader>
                 <CardTitle>Mappatura Campi Excel</CardTitle>
                 <CardDescription>
                   Associa le celle Excel ai Controlli da esportare
                 </CardDescription>
               </CardHeader>
               <CardContent className="space-y-4">
                 <div className="space-y-3">
                   {editTemplate?.mapping?.map((row: any, idx: number) => (
                     <div key={idx} className="flex items-start gap-3 p-4 border rounded-lg bg-muted/50">
                       <div className="flex-1 space-y-2">
                         <Label className="text-sm font-medium">Cella Excel</Label>
                         <Input
                           placeholder="Es. B2, C5, AA10"
                           value={row.excelField}
                           onChange={(e) => setEditTemplate((tpl: any) => {
                             const mapping = [...tpl.mapping]
                             mapping[idx] = { ...mapping[idx], excelField: e.target.value.toUpperCase() }
                             return { ...tpl, mapping }
                           })}
                           disabled={isEditing}
                         />
                       </div>
                       <div className="flex-1 space-y-2">
                         <Label className="text-sm font-medium">Controllo Associato</Label>
                         <KpiFieldSelector
                           idx={idx}
                           value={row.kpi}
                           onChange={(kpiId, fieldName, displayValue) => handleEditKpiMappingChange(idx, kpiId, fieldName, displayValue)}
                           disabled={isEditing}
                           isEdit={true}
                         />
                       </div>
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={() => setEditTemplate((tpl: any) => ({ ...tpl, mapping: tpl.mapping.filter((_: any, i: number) => i !== idx) }))}
                         disabled={editTemplate?.mapping?.length === 1 || isEditing}
                         className="mt-7"
                       >
                         <Trash className="w-4 h-4" />
                       </Button>
                     </div>
                   ))}
                 </div>
                 <Button
                   variant="outline"
                   onClick={() => setEditTemplate((tpl: any) => ({ ...tpl, mapping: [...tpl.mapping, { excelField: "", kpi: "" }] }))}
                   disabled={isEditing}
                   className="w-full gap-2"
                 >
                   <Plus className="w-4 h-4" />
                   Aggiungi Mappatura
                 </Button>
               </CardContent>
             </Card>

             {/* Sezione Invio Automatico */}
             <Card>
               <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                   <Mail className="w-5 h-5" />
                   Invio Automatico
                 </CardTitle>
                 <CardDescription>
                   Configura l'invio automatico giornaliero del report
                 </CardDescription>
               </CardHeader>
               <CardContent className="space-y-4">
                 <div className="flex items-center justify-between">
                   <div className="space-y-1">
                     <Label>Attiva invio automatico</Label>
                     <p className="text-sm text-muted-foreground">Il report verrà inviato automaticamente ogni giorno</p>
                   </div>
                   <Switch
                     checked={editAutosend}
                     onCheckedChange={setEditAutosend}
                     disabled={isEditing}
                   />
                 </div>
                 {editAutosend && (
                   <div className="space-y-2">
                     <Label htmlFor="edit-email-recipient">Email Destinatario *</Label>
                     <Input
                       id="edit-email-recipient"
                       type="email"
                       placeholder="utente@email.com"
                       value={editAutosendEmail}
                       onChange={(e) => setEditAutosendEmail(e.target.value)}
                       disabled={isEditing}
                     />
                   </div>
                 )}
               </CardContent>
             </Card>
           </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 