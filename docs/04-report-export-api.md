# API di Export Report - Documentazione Tecnica Completa

## Indice

1. [Panoramica](#panoramica)
2. [Endpoint e Autenticazione](#endpoint-e-autenticazione)
3. [Strutture Dati](#strutture-dati)
4. [Flusso di Esecuzione](#flusso-di-esecuzione)
5. [Logiche di Estrazione Dati](#logiche-di-estrazione-dati)
6. [Generazione Excel](#generazione-excel)
7. [Gestione Time Slot](#gestione-time-slot)
8. [Casi Speciali e Edge Cases](#casi-speciali-e-edge-cases)
9. [Logging e Debug](#logging-e-debug)

---

## Panoramica

L'API di export report (`/api/reports/[id]/export`) è responsabile della generazione di file Excel contenenti i dati delle todolist completate o scadute per un determinato report. Il sistema estrae i dati basandosi su una struttura gerarchica di **Control Points** (punti di controllo associati a dispositivi) e **Controls** (controlli specifici associati a KPI).

### Caratteristiche Principali

- **Metodo HTTP**: `POST`
- **Output**: File Excel (`.xlsx`) con due fogli
- **Libreria Excel**: `xlsx` (SheetJS)
- **Autenticazione**: Richiede utente autenticato con ruolo `admin`

---

## Endpoint e Autenticazione

### URL Pattern

```
POST /api/reports/{report_id}/export
```

### Body della Richiesta

```typescript
{
  startDate: string;  // Obbligatorio - formato YYYY-MM-DD
  endDate?: string;   // Opzionale - formato YYYY-MM-DD (default: startDate)
}
```

### Controlli di Sicurezza

1. **Verifica Autenticazione**: Controlla che l'utente sia autenticato tramite Supabase Auth
2. **Verifica Ruolo Admin**: Query sulla tabella `profiles` per verificare `role === "admin"`
3. **Validazione Input**: Verifica che `startDate` sia presente

```typescript
// Verifica autenticazione
const { data: { user }, error: authError } = await supabase.auth.getUser();
if (authError || !user) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// Verifica ruolo admin
const { data: profile } = await supabase
  .from("profiles")
  .select("role")
  .eq("auth_id", user.id)
  .single();

if (profile?.role !== "admin") {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

---

## Strutture Dati

### Report (da database)

```typescript
interface Report {
  id: string;
  name: string;
  todolist_params_linked: TodolistParamsLinked;
}
```

### TodolistParamsLinked

Struttura principale che definisce la configurazione del report:

```typescript
interface TodolistParamsLinked {
  controlPoints: ControlPoint[];
}
```

### ControlPoint (Punto di Controllo)

Rappresenta un dispositivo con i suoi controlli associati:

```typescript
interface ControlPoint {
  id: string;           // ID univoco del control point
  name: string;         // Nome del punto di controllo (nome device)
  deviceId: string;     // ID del device associato
  controls: Control[];  // Array ordinato di controlli
  order: number;        // Ordine di visualizzazione
}
```

### Control (Controllo)

Rappresenta un singolo campo KPI da monitorare:

```typescript
interface Control {
  id: string;        // ID univoco del controllo
  kpiId: string;     // ID del KPI di riferimento
  fieldId: string;   // ID del campo specifico del KPI
  name: string;      // Nome visualizzato
  kpiName: string;   // Nome del KPI
  fieldName: string; // Nome del campo
  order: number;     // Ordine di visualizzazione
}
```

### TaskData (Dati Task Arricchiti)

Struttura interna per i task con dati della todolist:

```typescript
interface TaskData {
  id: string;
  kpi_id: string;
  value: { id: string; value: unknown }[];
  todolist_id: string;
  completed_at: string;
  device_id: string;
  completion_date: string;
  scheduled_execution?: string;
  time_slot_type?: string;
  time_slot_start?: number;
  time_slot_end?: number;
  end_day_time?: string;
}
```

---

## Flusso di Esecuzione

### Diagramma del Flusso

```
┌─────────────────────────────────────────────────────────────────┐
│                    POST /api/reports/[id]/export                │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. AUTENTICAZIONE E AUTORIZZAZIONE                             │
│     - Verifica utente autenticato                               │
│     - Verifica ruolo admin                                      │
│     - Validazione startDate                                     │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. RECUPERO REPORT                                             │
│     - Query tabella report_to_excel                             │
│     - Estrazione todolist_params_linked                         │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. ESTRAZIONE DATI (getReportDataForExport)                    │
│     - Estrazione device IDs dai control points                  │
│     - Query todolist completate nel range                       │
│     - Query todolist scadute nel range                          │
│     - Filtro todolist effettivamente scadute                    │
│     - Query tasks per todolist                                  │
│     - Arricchimento dati task                                   │
│     - Creazione placeholder per device mancanti                 │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. GENERAZIONE EXCEL (generateMappedExcel)                     │
│     - Foglio 1: Dati Report (generateDataSheet)                 │
│     - Foglio 2: Documentazione (generateDocumentationSheet)     │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. RISPOSTA HTTP                                               │
│     - Content-Type: application/vnd.openxmlformats-...          │
│     - Content-Disposition: attachment; filename="..."           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Logiche di Estrazione Dati

### Funzione `getReportDataForExport`

Questa è la funzione principale per l'estrazione dei dati. Segue questi step:

### Step 1: Estrazione Device IDs

```typescript
const deviceIds = todolistParams.controlPoints.map((cp) => cp.deviceId);
```

Estrae tutti gli ID dei dispositivi configurati nel report dai control points.

### Step 2: Query Todolist Completate

```typescript
const { data: completedTodolists } = await supabase
  .from("todolist")
  .select("id, device_id, completion_date, scheduled_execution, 
           time_slot_type, time_slot_start, time_slot_end, end_day_time")
  .in("device_id", deviceIds)
  .not("completion_date", "is", null)
  .gte("completion_date", `${startDate}T00:00:00.000Z`)
  .lte("completion_date", `${endDate}T23:59:59.999Z`);
```

**Condizioni**:
- `device_id` deve essere tra quelli del report
- `completion_date` NON deve essere null (todolist completata)
- `completion_date` deve essere nel range di date richiesto

### Step 3: Query Todolist Scadute

```typescript
const { data: expiredTodolists } = await supabase
  .from("todolist")
  .select("id, device_id, completion_date, scheduled_execution, 
           time_slot_type, time_slot_start, time_slot_end, end_day_time")
  .in("device_id", deviceIds)
  .is("completion_date", null)
  .gte("scheduled_execution", `${startDate}T00:00:00.000Z`)
  .lte("scheduled_execution", `${endDate}T23:59:59.999Z`);
```

**Condizioni**:
- `device_id` deve essere tra quelli del report
- `completion_date` DEVE essere null (todolist NON completata)
- `scheduled_execution` deve essere nel range di date richiesto

### Step 4: Filtro Todolist Effettivamente Scadute

```typescript
const now = new Date();
const filteredExpiredTodolists = (expiredTodolists || []).filter(
  (todolist: any) => {
    if (todolist.end_day_time) {
      const deadline = new Date(todolist.end_day_time);
      // La deadline già include la tolleranza nel campo end_day_time
      return now > deadline;
    }
    return false;
  }
);
```

**Logica**: Una todolist è considerata "scaduta" solo se:
- Ha un `end_day_time` definito
- La data/ora corrente è successiva alla deadline

Il campo `end_day_time` include già la tolleranza di 3 ore (definita in `TIME_SLOT_TOLERANCE`).

### Step 5: Query Tasks - Batched Query

Per evitare limiti di lunghezza URL, le query sono eseguite in batch:

```typescript
async function batchedInQuery<T>(
  supabase: any,
  table: string,
  selectFields: string,
  inColumn: string,
  inValues: string[],
  additionalFilters?: (query: any) => any,
  batchSize: number = 100
): Promise<{ data: T[] | null; error: any }>
```

**Per todolist completate**: Solo task con `completed_at` non null

```typescript
const { data: completedTasks } = await batchedInQuery(
  supabase,
  "tasks",
  "id, kpi_id, value, todolist_id, completed_at",
  "todolist_id",
  completedTodolistIds,
  (query) => query.not("completed_at", "is", null)
);
```

**Per todolist scadute**: TUTTI i task (anche non completati)

```typescript
const { data: expiredTasks } = await batchedInQuery(
  supabase,
  "tasks",
  "id, kpi_id, value, todolist_id, completed_at",
  "todolist_id",
  expiredTodolistIds
);
```

### Step 6: Arricchimento Dati Task

```typescript
const enrichedTasks: TaskData[] = (tasks || []).map((task: any) => {
  const todolist = allTodolists.find((tl: any) => tl.id === task.todolist_id);
  return {
    ...task,
    device_id: todolist?.device_id || "",
    completion_date: todolist?.completion_date || "",
    scheduled_execution: todolist?.scheduled_execution || "",
    time_slot_type: todolist?.time_slot_type || "standard",
    time_slot_start: todolist?.time_slot_start,
    time_slot_end: todolist?.time_slot_end,
    end_day_time: todolist?.end_day_time || "",
  } as TaskData;
});
```

Ogni task viene arricchito con i dati della sua todolist padre.

### Step 7: Creazione Placeholder per Device Mancanti

```typescript
const processedDeviceIds = new Set(
  allTodolists.map((tl) => tl.device_id)
);
const missingDeviceIds = deviceIds.filter(
  (deviceId) => !processedDeviceIds.has(deviceId)
);

// Per ogni device mancante, crea task placeholder
for (const deviceId of missingDeviceIds) {
  for (const kpiId of uniqueKpiIds) {
    enrichedTasks.push({
      id: `placeholder-${deviceId}-${kpiId}`,
      kpi_id: kpiId,
      value: [],
      todolist_id: `missing-${deviceId}`,
      completed_at: "",
      device_id: deviceId,
      completion_date: "",
      scheduled_execution: `${startDate}T00:00:00.000Z`,
      time_slot_type: "standard",
      // ...
    });
  }
}
```

**Scopo**: Garantire che tutti i device configurati nel report appaiano nell'Excel, anche se non hanno todolist completate/scadute nel periodo.

---

## Generazione Excel

### Struttura del Workbook

Il file Excel generato contiene due fogli:

1. **"Dati Report"**: Dati effettivi dei controlli
2. **"Documentazione"**: Metadati e tracciabilità

### Foglio 1: Dati Report (`generateDataSheet`)

#### Layout delle Colonne

```
┌─────────────────┬─────────────────────────────────────────────────────┐
│  Colonna A      │  Colonne B, C, D, ...                               │
├─────────────────┼─────────────────────────────────────────────────────┤
│  Info Turno     │  Controlli (uno per colonna)                        │
└─────────────────┴─────────────────────────────────────────────────────┘
```

#### Riga 1: Header Control Points (con merge)

```typescript
// Imposta il valore nella prima cella del control point
ws[`${startColLetter}1`] = {
  t: "s",
  v: `${cp.name}`,
  s: {
    font: { bold: true, sz: 12 },
    fill: { fgColor: { rgb: "4472C4" } },
    alignment: { horizontal: "center", vertical: "center" },
    // ...
  },
};

// Merge delle celle per il control point
if (startCol !== endCol) {
  merges.push({
    s: { r: 0, c: startCol },
    e: { r: 0, c: endCol },
  });
}
```

#### Riga 2: Nomi dei Controlli

```typescript
ws[`${colLetter}2`] = {
  t: "s",
  v: `${info.control.fieldName}`,
  s: {
    font: { bold: true, sz: 10 },
    fill: { fgColor: { rgb: "D9E1F2" } },
    // ...
  },
};
```

#### Righe 3+: Dati per Turno (Shift)

##### Raggruppamento per Shift

I task vengono raggruppati per **slot temporale**, NON per device:

```typescript
const shiftKey = `${scheduledDate}|${task.time_slot_type}|${
  task.time_slot_start || "none"
}|${task.time_slot_end || "none"}`;
```

**Chiave di raggruppamento**:
- Data scheduled (solo YYYY-MM-DD)
- Tipo time slot (standard/custom)
- Orario inizio slot
- Orario fine slot

##### Ordinamento Shift

```typescript
const sortedShifts = Array.from(shiftGroups.entries()).sort((a, b) => {
  // 1. Completati prima, mancanti dopo
  if (a[1].isMissing && !b[1].isMissing) return 1;
  if (!a[1].isMissing && b[1].isMissing) return -1;

  // 2. Per scheduled_execution
  if (a[1].scheduled_execution && b[1].scheduled_execution) {
    const dateA = new Date(a[1].scheduled_execution).getTime();
    const dateB = new Date(b[1].scheduled_execution).getTime();
    if (dateA !== dateB) return dateA - dateB;
  }

  // 3. Per time_slot_start
  if (a[1].time_slot_start !== undefined && b[1].time_slot_start !== undefined) {
    return a[1].time_slot_start - b[1].time_slot_start;
  }

  return a[0].localeCompare(b[0]);
});
```

##### Colonna A: Info Turno

**Per turni completati**:
```
{data} {orario_slot}
(ult. completamento: {ora})
```

**Per turni mancanti**:
```
Turno NON completato ({data})
```

##### Colonne B+: Valori Controlli

```typescript
// Cerca il valore per questo specifico controllo
const relevantTasks = shiftInfo.tasks.filter(
  (t) =>
    t.kpi_id === info.control.kpiId && t.device_id === info.cp.deviceId
);

// Ordina per completion_date (più recente prima)
relevantTasks.sort((a, b) => {
  const dateA = new Date(a.completed_at || a.completion_date).getTime();
  const dateB = new Date(b.completed_at || b.completion_date).getTime();
  return dateB - dateA;
});

// Estrai il valore dal campo specifico
for (const task of relevantTasks) {
  if (task.value && Array.isArray(task.value)) {
    const fieldValue = task.value.find((v) => v.id === info.control.fieldId);
    if (fieldValue && fieldValue.value !== undefined) {
      // Formattazione valore
      let formatted = fieldValue.value;
      if (typeof formatted === "boolean") {
        formatted = formatted ? "Sì" : "No";
      } else if (formatted === "") {
        formatted = "-";
      }
      cellValue = String(formatted);
      break;
    }
  }
}
```

**Logica di matching**:
1. Filtra task per `kpi_id` del controllo E `device_id` del control point
2. Ordina per data completamento (più recente prima)
3. Cerca nel campo `value` l'elemento con `id` uguale a `fieldId` del controllo
4. Formatta il valore (boolean → "Sì"/"No", vuoto → "-")

##### Stili Celle

- **Turni completati**: Sfondo bianco (`FFFFFF`)
- **Turni mancanti**: Sfondo rosso chiaro (`FFEEEE`)
- **Colonna A completata**: Sfondo verde chiaro (`E2EFDA`)

### Foglio 2: Documentazione (`generateDocumentationSheet`)

Contiene tre sezioni:

#### Sezione 1: Informazioni Report
- Nome Report
- Data Generazione
- ID Report

#### Sezione 2: Punti di Controllo e Controlli
- Tabella con: Punto di Controllo | ID Dispositivo | Controlli Configurati

#### Sezione 3: Todolist Processate
- Tabella con: ID Todolist | Device ID | Data Completamento | Ora Completamento | Task Completati

---

## Gestione Time Slot

### Tipi di Time Slot

```typescript
type TimeSlot = "mattina" | "pomeriggio" | "notte" | "giornata" | "custom"
```

### Intervalli Standard

```typescript
const TIME_SLOT_INTERVALS = {
  mattina: { start: 6, end: 14 },
  pomeriggio: { start: 14, end: 22 },
  notte: { start: 22, end: 6 },
  giornata: { start: 7, end: 17 },
}
```

### Tolleranza

```typescript
const TIME_SLOT_TOLERANCE = 3 // ore
```

La tolleranza viene aggiunta all'orario di fine per determinare la deadline effettiva.

### Formattazione Orari Custom

```typescript
if (shiftInfo.time_slot_type === "custom" &&
    shiftInfo.time_slot_start !== undefined &&
    shiftInfo.time_slot_end !== undefined) {
  const startHour = Math.floor(shiftInfo.time_slot_start / 60);
  const startMin = shiftInfo.time_slot_start % 60;
  const endHour = Math.floor(shiftInfo.time_slot_end / 60);
  const endMin = shiftInfo.time_slot_end % 60;
  timeSlotStr = `${startHour}:${startMin}-${endHour}:${endMin}`;
}
```

I valori `time_slot_start` e `time_slot_end` sono memorizzati in **minuti dalla mezzanotte**.

---

## Casi Speciali e Edge Cases

### 1. Nessuna Todolist nel Range

```typescript
if (allTodolists.length === 0) {
  return { controlPoints: todolistParams.controlPoints, taskData: [] };
}
```

Ritorna un Excel con struttura ma senza dati.

### 2. Device Senza Todolist

Vengono creati task placeholder per garantire che tutti i device appaiano:

```typescript
for (const deviceId of missingDeviceIds) {
  for (const kpiId of uniqueKpiIds) {
    enrichedTasks.push({
      id: `placeholder-${deviceId}-${kpiId}`,
      // ...
    });
  }
}
```

### 3. Task Senza Valori

```typescript
const tasksWithEmptyValues = tasks.filter(
  (task: any) => !task.value || task.value.length === 0
);
```

Vengono loggati per debug ma inclusi nell'export con valore "-".

### 4. Todolist Scadute con Dati Parziali

Per le todolist scadute, vengono estratti TUTTI i task (anche non completati), permettendo di mostrare dati parziali.

### 5. Shift con Più Device

Uno shift può contenere task da più device. Il sistema:
- Raggruppa per slot temporale (non per device)
- Marca lo shift come "completato" se ALMENO UN device ha completato
- Mostra l'ultimo orario di completamento tra tutti i device

### 6. Valori Booleani

```typescript
if (typeof formatted === "boolean") {
  formatted = formatted ? "Sì" : "No";
}
```

### 7. Valori Numerici

```typescript
ws[`${colLetter}${currentRow}`] = {
  t: typeof cellValue === "number" || 
     (!isNaN(Number(cellValue)) && cellValue !== "-") ? "n" : "s",
  v: typeof cellValue === "number" || 
     (!isNaN(Number(cellValue)) && cellValue !== "-") 
       ? Number(cellValue) : cellValue,
  // ...
};
```

I valori numerici vengono salvati come tipo `n` (number) in Excel.

---

## Logging e Debug

### Fasi di Logging

Il sistema include logging dettagliato per ogni fase:

1. **EXPORT REPORT START**: Report ID, nome, date range, control points
2. **DEVICE IDS EXTRACTION**: Device IDs estratti, totale, univoci
3. **TODOLISTS QUERY RESULTS**: Completate, scadute (prima/dopo filtro), breakdown per device
4. **TASKS QUERY RESULTS**: Task completati, scaduti, per todolist, per KPI, con valori vuoti
5. **DATA ENRICHMENT**: Task arricchiti, senza device, orfani
6. **MISSING DEVICES HANDLING**: Device processati, mancanti, placeholder creati
7. **SHIFT GROUPS GENERATION**: Gruppi creati, completati, mancanti, dettagli
8. **EXCEL CELLS STATISTICS**: Celle totali, popolate, vuote, percentuale
9. **EXPORT REPORT COMPLETE**: Dimensione buffer, filename, statistiche finali

### Debug Celle Vuote

Per ogni cella vuota viene loggato:
- Posizione (riga, colonna)
- Control Point e Device
- Controllo e Field ID
- KPI ID
- Task trovati e loro valori

---

## Risposta HTTP

### Headers

```typescript
const response = new NextResponse(new Uint8Array(excelBuffer), {
  status: 200,
  headers: {
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="${filename}"`,
  },
});
```

### Naming del File

```typescript
const filename = endDate
  ? `${report.name}_${startDate}_${endDate}.xlsx`
  : `${report.name}_${startDate}.xlsx`;
```

---

## Codici di Errore

| Codice | Descrizione |
|--------|-------------|
| 401 | Utente non autenticato |
| 403 | Utente non admin |
| 400 | startDate mancante |
| 404 | Report non trovato |
| 500 | Errore interno del server |

---

## Dipendenze

- `next`: Framework Next.js per API routes
- `xlsx`: Libreria SheetJS per generazione Excel
- `@/lib/supabase-server`: Client Supabase server-side
- `@/lib/validation/todolist-schemas`: Utility per validazione todolist
- `@/types/reports`: Tipi TypeScript per report
