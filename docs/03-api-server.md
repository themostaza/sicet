# API e Server Actions

## Panoramica

Il backend utilizza due pattern principali:

1. **Server Actions**: Funzioni server-side chiamabili direttamente dai componenti React (preferito per CRUD)
2. **API Routes**: Endpoint HTTP tradizionali per operazioni complesse, export, webhook

---

## Server Actions

Le Server Actions sono definite in `app/actions/` e usano la direttiva `'use server'`.

### Struttura Standard

Ogni file di actions segue questa struttura:

```typescript
'use server'

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { z } from "zod"
import { revalidatePath } from "next/cache"

// 1. Types e Schemas
const Schema = z.object({ ... })

// 2. Mappers (DB row ↔ App type)
const toAppType = (row: DbRow): AppType => ({ ... })
const toDbRow = (data: AppType): DbRow => ({ ... })

// 3. Error Handling
class ActionError extends Error { ... }
function handlePostgrestError(e: PostgrestError): never { ... }

// 4. Actions
export async function getItems(params): Promise<Item[]> { ... }
export async function createItem(data): Promise<Item> { ... }
export async function updateItem(data): Promise<Item> { ... }
export async function deleteItem(id): Promise<void> { ... }
```

---

### `actions-device.ts` - Gestione Punti di Controllo

#### Funzioni Disponibili

| Funzione | Descrizione | Parametri |
|----------|-------------|-----------|
| `getDevices(params)` | Lista paginata | `{ offset, limit }` |
| `getDevice(id)` | Singolo device | `id: string` |
| `createDevice(data)` | Crea device | `DeviceInsertSchema` |
| `updateDevice(data)` | Aggiorna device | `DeviceUpdateSchema` |
| `deleteDevice(id)` | Soft delete | `id: string` |
| `getDeviceTags()` | Lista tag unici | - |
| `getDevicesByTags(tags, mode)` | Filtra per tag | `tags[], 'OR' \| 'AND'` |

#### Generazione ID

I device usano ID brevi generati con `generateDeviceId()`:
- Formato: 6 caratteri alfanumerici
- Retry automatico in caso di collisione

#### Soft Delete

I device non vengono eliminati fisicamente, ma marcati con `deleted: true`.

---

### `actions-kpi.ts` - Gestione Controlli/KPI

#### Funzioni Disponibili

| Funzione | Descrizione | Parametri |
|----------|-------------|-----------|
| `getKpis(params)` | Lista paginata | `{ offset, limit }` |
| `getKpi(id)` | Singolo KPI | `id: string` |
| `createKpi(data)` | Crea KPI | `KpiInsertSchema` |
| `deleteKpi(id)` | Soft delete | `id: string` |

#### Struttura Value

Il campo `value` è un JSON che definisce i campi del KPI:

```json
[
  {
    "id": "field-1",
    "name": "Temperatura",
    "type": "number",
    "required": true,
    "unit": "°C"
  },
  {
    "id": "field-2", 
    "name": "Note",
    "type": "text",
    "required": false
  }
]
```

Tipi supportati: `number`, `decimal`, `text`, `boolean`, `select`

---

### `actions-todolist.ts` - Gestione Todolist

Il file più complesso, gestisce todolist e task.

#### Funzioni Principali

| Funzione | Descrizione |
|----------|-------------|
| `getTodolist(params)` | Singola todolist per device/date/slot |
| `getTodolistById(id)` | Singola todolist per ID |
| `getTodolistTasks(params)` | Task di una todolist (paginato) |
| `getTodolistTasksById(params)` | Task per todolist ID |
| `createTodolist(...)` | Crea todolist + task singola |
| `createMultipleTasks(...)` | Crea todolist + task multiple |
| `updateTaskStatus(taskId, status)` | Aggiorna stato task |
| `updateTaskValue(taskId, value)` | Aggiorna valore task |
| `completeTodolist(todolistId)` | Completa todolist e tutte le task |
| `deleteTodolist(...)` | Elimina todolist e task |
| `deleteTodolistById(id)` | Elimina per ID |

#### Funzioni di Query

| Funzione | Descrizione |
|----------|-------------|
| `getTodolistsGrouped()` | Tutte le todolist con dettagli |
| `getTodolistsGroupedWithFilters()` | + filtri (today, overdue, etc.) |
| `getTodolistsWithPagination(params)` | Lista paginata con filtri |
| `getTodolistsForDeviceToday(deviceId, today)` | Todolist valide per device |
| `getTodolistCounts(userRole)` | Conteggi per filtro (RPC) |
| `getTodolistCategories()` | Categorie uniche (RPC) |
| `getTodolistFilteredIds(params)` | Solo ID per export batch |
| `getTodolistFilteredCount(params)` | Conteggio filtrato |

#### Gestione Time Slot

Il sistema gestisce sia slot standard che custom:

```typescript
// Standard: salva tipo + minuti
{ type: "standard", start: 360, end: 840 } // 06:00-14:00

// Custom: salva sempre in minuti
{ type: "custom", start: 450, end: 720 }   // 07:30-12:00
```

#### Logica Scadenza

Per gli **operatori**, la visibilità delle todolist considera:
- `scheduled_execution <= now` (già iniziata)
- `end_day_time >= now - tolerance` (non ancora scaduta con tolleranza)

```typescript
// Pseudo-codice filtro operatore
query = query
  .neq("status", "completed")
  .lte("scheduled_execution", nowItalyPseudo)
  .gte("end_day_time", thresholdItalyPseudo) // now - 3h
```

---

### `actions-alerts.ts` - Gestione Alert

#### Alert KPI

| Funzione | Descrizione |
|----------|-------------|
| `createAlert(...)` | Crea alert per KPI |
| `getKpiAlerts(kpiId)` | Alert attivi per KPI |
| `checkKpiAlerts(kpiId, todolistId, value)` | Verifica condizioni |
| `getAlertLogs(params)` | Log alert scattati |
| `toggleAlertActive(alertId, isActive)` | Attiva/disattiva |
| `deleteAlert(alertId)` | Elimina alert |

#### Struttura Condizioni

```typescript
interface AlertCondition {
  field_id: string
  type: 'number' | 'decimal' | 'text' | 'boolean' | 'select'
  min?: number           // Per number/decimal
  max?: number           // Per number/decimal
  match_text?: string    // Per text
  boolean_value?: boolean // Per boolean
  match_values?: string[] // Per select
}
```

#### Logica Check Alert

Quando viene aggiornato un valore task (`updateTaskValue`):

1. Recupera tutti gli alert attivi per quel KPI
2. Per ogni alert, verifica le condizioni
3. Se una condizione è soddisfatta:
   - Crea log in `kpi_alert_logs`
   - Invia email via Resend
   - Aggiorna log con stato invio

---

### `actions-todolist-alerts.ts` - Alert Todolist Scadute

Gestisce notifiche per todolist non completate:

| Funzione | Descrizione |
|----------|-------------|
| `createTodolistAlert(todolistId, email)` | Crea alert |
| `getTodolistAlerts()` | Lista alert attivi |
| `toggleTodolistAlertActive(id, isActive)` | Attiva/disattiva |
| `deleteTodolistAlert(id)` | Elimina |
| `checkOverdueTodolists()` | Controlla scadenze (cron) |

---

### `actions-user.ts` - Gestione Utenti

| Funzione | Descrizione |
|----------|-------------|
| `preregisterUser(email, role)` | Pre-registra utente |
| `getPreregisteredUsers()` | Lista utenti |
| `deleteUser(email)` | Soft delete utente |

#### Flusso Pre-registrazione

1. Admin crea profilo con email e ruolo (`status: 'reset-password'`)
2. Utente va su `/reset` e imposta password
3. Supabase Auth crea account e collega a profilo
4. Profilo aggiornato con `auth_id` e `status: 'active'`

---

### `actions-activity.ts` - Log Attività

```typescript
export async function logCurrentUserActivity(
  actionType: UserActionType,
  entityType: EntityType,
  entityId: string,
  metadata?: Record<string, any>
): Promise<void>
```

Tipi azione: `create_*`, `update_*`, `delete_*`, `complete_*`

---

### `actions-export.ts` - Utilità Export

Funzioni helper per la preparazione dati export.

---

## API Routes

Le API routes sono in `app/api/` e seguono le convenzioni Next.js App Router.

### Struttura

```
app/api/
├── admin/
│   └── reset-password/route.ts
├── auth/
│   ├── reset-password/route.ts
│   └── signup/route.ts
├── cron/
│   └── check-overdue-todolists/route.ts
├── dashboard/
│   ├── device-kpis/route.ts
│   ├── device-metrics/route.ts
│   ├── device-todolist-metrics/route.ts
│   ├── devices/route.ts
│   ├── kpis/route.ts
│   └── todolist-metrics/route.ts
├── device/
│   ├── delete/route.ts
│   └── qrcodes-pdf/route.ts
├── export/
│   ├── csv/route.ts
│   ├── csv-filtered/route.ts
│   ├── data/route.ts
│   ├── devices/route.ts
│   ├── json/route.ts
│   ├── kpis/route.ts
│   ├── kpis-by-device/route.ts
│   ├── todolist-complete/route.ts
│   ├── todolists-preview/route.ts
│   └── user-activities/route.ts
├── kpi/
│   └── delete/route.ts
├── matrix/
│   ├── madre/route.ts
│   └── todolist/route.ts
├── reports/
│   ├── [id]/route.ts
│   ├── devices/route.ts
│   └── route.ts
├── summary/
│   ├── operators/route.ts
│   ├── operators-daily-completions/route.ts
│   └── user-completed-todolists/route.ts
├── templates/
│   ├── kpis/route.ts
│   └── route.ts
└── todolist/
    └── paginated/route.ts
```

---

### API Principali

#### Export API

**Base URL**: `/api/export/`

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/data` | GET | Export CSV generale |
| `/csv` | GET | Export CSV con filename custom |
| `/csv-filtered` | GET | Export CSV con filtri campi |
| `/json` | GET | Export JSON strutturato |
| `/kpis-by-device` | GET | KPI per device in range date |
| `/devices` | GET | Lista devices per export |
| `/todolists-preview` | GET | Preview todolist per export |
| `/todolist-complete` | GET | Export todolist completo |
| `/user-activities` | GET | Export log attività |

**Parametri comuni**:
- `startDate`: Data inizio (YYYY-MM-DD)
- `endDate`: Data fine (YYYY-MM-DD)
- `deviceIds`: ID devices (comma-separated)
- `kpiIds`: ID KPIs (comma-separated)

#### Dashboard API

**Base URL**: `/api/dashboard/`

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/todolist-metrics` | GET | Metriche todolist |
| `/device-metrics` | GET | Metriche devices |
| `/device-kpis` | GET | KPIs per device |
| `/device-todolist-metrics` | GET | Metriche todolist per device |

#### Matrix API

**Base URL**: `/api/matrix/`

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/madre` | GET | Dati Matrice Madre |
| `/todolist` | GET | Dati Matrice Todolist |

#### Reports API

**Base URL**: `/api/reports/`

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/` | GET | Lista report |
| `/` | POST | Crea report |
| `/[id]` | GET | Singolo report |
| `/[id]` | PUT | Aggiorna report |
| `/[id]` | DELETE | Elimina report |
| `/devices` | GET | Devices per report |

#### Cron API

**Endpoint**: `/api/cron/check-overdue-todolists`

Chiamato periodicamente (Vercel Cron) per:
1. Trovare todolist scadute con alert attivo
2. Inviare email di notifica
3. Loggare in `todolist_alert_logs`

---

## Autenticazione

### Supabase Client

Due tipi di client:

```typescript
// Client per utente autenticato (rispetta RLS)
import { createServerSupabaseClient } from "@/lib/supabase-server"
const supabase = await createServerSupabaseClient()

// Client admin (bypassa RLS)
import { createServerSupabaseAdminClient } from "@/lib/supabase-server"
const supabaseAdmin = createServerSupabaseAdminClient()
```

### Middleware

`middleware.ts` gestisce:

1. **Redirect root** → `/todolist`
2. **Route pubbliche**: `/auth/login`, `/register`, `/reset`
3. **Autenticazione**: Verifica sessione per route protette
4. **Autorizzazione**: Verifica ruolo per route specifiche

```typescript
const rolePermissions = {
  admin: ['*'],
  operator: ['/todolist', '/todolist/view/*/*/*/*', '/device/*/scan'],
  referrer: ['/devices', '/device/*', '/kpis', '/kpi/*', '/todolist', ...]
}
```

---

## Gestione Errori

### Pattern Standard

```typescript
class ActionError extends Error {
  public readonly code: string
  public readonly errors?: z.ZodIssue[]
  
  constructor(message: string, code: string, errors?: z.ZodIssue[]) {
    super(message)
    this.name = "ActionError"
    this.code = code
    this.errors = errors
  }
}

function handlePostgrestError(e: PostgrestError): never {
  switch (e.code) {
    case "23505":
      throw new ActionError("ID già esistente", "DUPLICATE_ID")
    default:
      throw new ActionError(e.message, "DATABASE_ERROR")
  }
}

function handleZodError(e: z.ZodError): never {
  throw new ActionError(
    `Errore di validazione: ${e.errors.map(...).join(", ")}`,
    "VALIDATION_ERROR",
    e.errors
  )
}
```

### Codici Errore

| Codice | Descrizione |
|--------|-------------|
| `VALIDATION_ERROR` | Dati non validi (Zod) |
| `DUPLICATE_ID` | ID già esistente |
| `DATABASE_ERROR` | Errore generico DB |
| `FETCH_ERROR` | Errore recupero dati |
| `UNEXPECTED_ERROR` | Errore non previsto |
| `ID_GENERATION_FAILED` | Impossibile generare ID unico |

---

## Email

### Configurazione

Provider: **Resend**

```typescript
// app/lib/email.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendAlertEmail(to: string, data: AlertEmailData) {
  await resend.emails.send({
    from: 'SICET <alerts@sicet.it>',
    to,
    subject: `Alert: ${data.kpiName}`,
    html: generateAlertHtml(data)
  })
}
```

### Tipi di Email

1. **Alert KPI**: Valore fuori range
2. **Alert Todolist**: Todolist scaduta
3. **Reset Password**: Link reset (gestito da Supabase)

---

## Utility

### `lib/utils.ts`

```typescript
// Generazione ID brevi
export function generateDeviceId(): string  // 6 char
export function generateKpiId(): string     // 6 char
export function generateUUID(): string      // UUID v4

// Formattazione date
export function formatDateForDisplay(date: string): string
export function formatTimeForDisplay(time: string): string

// Utility generiche
export function cn(...inputs: ClassValue[]): string  // clsx + tailwind-merge
```

### `lib/validation/`

Schemi Zod per validazione:

- `device-schemas.ts`: Device, DeviceInsert, DeviceUpdate
- `kpi-schemas.ts`: Kpi, KpiInsert
- `todolist-schemas.ts`: Todolist, Task, TimeSlot, etc.

---

## Performance

### Ottimizzazioni Database

1. **RPC Functions**: Query complesse ottimizzate lato DB
   - `get_todolist_counts`: Conteggi in una sola query
   - `get_distinct_todolist_categories`: Categorie uniche
   - `log_user_activity`: Log attività

2. **Paginazione**: Tutte le liste usano `range(offset, limit)`

3. **Soft Delete**: Evita eliminazioni fisiche, mantiene storico

### Caching

- `revalidatePath()` dopo ogni mutazione
- Next.js cache automatico per Server Components

