# Frontend - Architettura e Componenti

## Panoramica

Il frontend è costruito con **Next.js 16** usando l'**App Router** e **React 19**. L'interfaccia utilizza **shadcn/ui** come design system, basato su Radix UI e TailwindCSS.

---

## Struttura delle Pagine

### Mappa delle Route

```
/                           → Redirect a /todolist
├── /auth/login             → Login utente
├── /register               → Registrazione (se abilitata)
├── /reset                   → Reset password
│
├── /dashboard              → Dashboard analitica (Admin)
├── /summary                → Statistiche dettagliate (Admin)
│
├── /devices                → Lista Punti di Controllo
├── /device/new             → Crea nuovo Punto di Controllo
├── /device/[id]/edit       → Modifica Punto di Controllo
├── /device/[id]/scan       → Scansione QR → Todolist del device
│
├── /kpis                   → Lista Controlli/KPI
├── /kpi/new                → Crea nuovo KPI
│
├── /todolist               → Lista Todolist (filtri, paginazione)
├── /todolist/new           → Crea nuova Todolist
├── /todolist/view/[...params] → Visualizza/compila Todolist
│
├── /matrix                 → Matrice Todolist
├── /matrix/madre           → Matrice Madre
│
├── /reports                → Lista Report Excel
├── /reports/new            → Crea nuovo Report
├── /reports/[id]/edit      → Modifica Report
│
├── /export                 → Esportazione dati
│
├── /alerts                 → Gestione Alert KPI
├── /alerts/logs            → Log degli Alert
│
└── /admin
    ├── /preregister        → Pre-registrazione utenti
    └── /todolist-alerts    → Gestione Alert Todolist
```

---

## Pagine Principali

### Dashboard (`/dashboard`)

**Accesso**: Solo Admin

Dashboard analitica con:
- Metriche todolist (completate, pending, overdue)
- Grafici con Recharts (pie chart, bar chart)
- Filtri per periodo (default: ultimi 3 mesi)
- Metriche per punto di controllo

```tsx
// Componenti principali
<MetricheTodolist />      // Grafici e stats todolist
<MetrichePuntiControllo /> // Stats per device
```

### Lista Todolist (`/todolist`)

**Accesso**: Tutti i ruoli (con filtri diversi)

La pagina principale per la gestione delle todolist:

- **Filtri tab**: Tutte, Oggi, Scadute, Future, Completate
- **Filtri aggiuntivi**: Data, Device, Tag, Categoria
- **Paginazione infinita**: Caricamento progressivo
- **Ordinamento**: Per data, device, stato, conteggio task

Per gli **Operator**:
- Visualizza solo todolist del turno corrente (con tolleranza)
- Filtro automatico basato su `time_slot_start` e `time_slot_end`

```tsx
// Client component principale
<TodolistClient 
  initialTodolists={...}
  initialCounts={...}
  userRole={...}
/>
```

### Visualizzazione Todolist (`/todolist/view/[...params]`)

**Accesso**: Tutti i ruoli

Pagina per compilare una todolist specifica:

- Lista dei task (KPI) da completare
- Form dinamico basato sulla struttura del KPI
- Salvataggio automatico dei valori
- Completamento todolist

**Parametri URL**: `/todolist/view/{deviceId}/{date}/{timeSlot}/{todolistId}`

### Scansione Device (`/device/[id]/scan`)

**Accesso**: Operator, Referrer, Admin

Pagina raggiunta dopo scansione QR code:

1. Identifica il device dal parametro `[id]`
2. Cerca todolist valide per il turno corrente
3. Se una sola → redirect automatico
4. Se multiple → mostra lista per selezione
5. Se nessuna → messaggio "Nessuna todolist disponibile"

### Punti di Controllo (`/devices`)

**Accesso**: Admin, Referrer

Lista devices con:
- Ricerca per nome/location
- Filtro per tag
- Generazione QR code (singolo o PDF multiplo)
- CRUD completo (Admin)

### Controlli/KPI (`/kpis`)

**Accesso**: Admin, Referrer

Lista KPI con:
- Ricerca per nome
- Visualizzazione struttura campi
- CRUD completo (Admin)

### Matrice Madre (`/matrix/madre`)

**Accesso**: Solo Admin

Overview dei "filoni" di todolist:
- Raggruppamento per device + categoria
- Conteggio totale, completate, pending
- Date inizio/fine programmazione
- Stato avanzamento

### Export (`/export`)

**Accesso**: Solo Admin

Esportazione dati in vari formati:
- **Tab Import/Export**: CSV, JSON
- **Tab Export Filtrato**: Con selezione campi e filtri

---

## Componenti Principali

### Layout e Navigazione

#### `Sidebar` (`components/sidebar.tsx`)

Sidebar responsive con:
- Menu dinamico basato sul ruolo utente
- Collassabile su desktop
- Drawer su mobile
- Avatar e info utente

```tsx
const menuItemsByRole: Record<Role, MenuItem[]> = {
  admin: [...],      // 12 voci menu
  operator: [...],   // 1 voce (Todolist)
  referrer: [...]    // 3 voci
}
```

#### `MobileMenuTrigger` (`components/mobile-menu-trigger.tsx`)

Bottone hamburger per aprire sidebar su mobile.

### Componenti UI (shadcn/ui)

Directory: `components/ui/`

Componenti base customizzati:
- `Button`, `Input`, `Label`, `Select`
- `Card`, `Dialog`, `Sheet`, `Drawer`
- `Table`, `Tabs`, `Accordion`
- `Toast`, `Tooltip`, `Popover`
- `Calendar`, `DatePicker`
- `Command` (ricerca combobox)
- `Sidebar` (navigazione)

### Componenti Specifici

#### Device

```
components/device/
├── device-delete-dialog.tsx   # Dialog conferma eliminazione
└── form.tsx                   # Form creazione/modifica
```

#### KPI

```
components/kpi/
├── form.tsx                   # Form creazione KPI
└── kpi-delete-dialog.tsx      # Dialog conferma eliminazione
```

#### Todolist

```
components/todolist/
├── new/                       # Wizard creazione todolist
│   ├── DeviceStep.tsx         # Step 1: Selezione device
│   ├── DateTimeStep.tsx       # Step 2: Data e fascia oraria
│   ├── KpiStep.tsx            # Step 3: Selezione KPI
│   ├── SummaryStep.tsx        # Step 4: Riepilogo
│   └── ...
└── todolist-client.tsx        # Lista todolist con filtri
```

#### Report

```
components/reports/
├── new/                       # Creazione report
│   ├── BasicInfoStep.tsx      # Info base
│   ├── FilterStep.tsx         # Filtri dati
│   ├── MappingStep.tsx        # Mapping celle Excel
│   └── ...
└── edit/
    └── ReportEditClient.tsx   # Modifica report
```

### Componenti Utility

#### `MultiDatePicker` (`components/multi-date-picker.tsx`)

Selezione multipla date per generazione batch todolist.

#### `TagSelector` (`components/tag-selector.tsx`)

Selezione tag con:
- Creazione tag inline
- Ricerca
- Multi-select

#### `ControlSelector` (`components/control-selector.tsx`)

Selezione KPI con:
- Ricerca
- Multi-select
- Preview struttura

#### `QRCodeModal` (`components/qr-code-modal.tsx`)

Modale per visualizzazione/download QR code singolo.

#### `QRCodeFilterDialog` (`components/qr-code-filter-dialog.tsx`)

Dialog per generazione PDF con QR code multipli filtrati per tag.

---

## Hooks Personalizzati

### `useFormValidation` (`hooks/use-form-validation.ts`)

Hook per validazione form con Zod:

```tsx
const { errors, validate, clearErrors } = useFormValidation(schema)
```

### `useMobile` (`hooks/use-mobile.tsx`)

Detect viewport mobile:

```tsx
const isMobile = useMobile() // true se < 768px
```

### `useToast` (`hooks/use-toast.ts`)

Sistema di notifiche toast:

```tsx
const { toast } = useToast()
toast({ title: "Successo", description: "..." })
```

---

## Pattern di Sviluppo

### Server Components vs Client Components

**Server Components** (default):
- Pagine che fetchano dati
- Layout
- Componenti statici

**Client Components** (`"use client"`):
- Form interattivi
- Componenti con stato
- Event handlers
- Hooks

### Data Fetching

**Pattern preferito**: Server Actions chiamate da Server Components

```tsx
// app/devices/page.tsx (Server Component)
export default async function DevicesPage() {
  const { devices } = await getDevices({ offset: 0, limit: 50 })
  return <DevicesClient initialDevices={devices} />
}

// components/devices/client.tsx (Client Component)
"use client"
export function DevicesClient({ initialDevices }) {
  const [devices, setDevices] = useState(initialDevices)
  // ... logica interattiva
}
```

### Validazione Form

Ogni form usa uno schema Zod corrispondente:

```tsx
// lib/validation/device-schemas.ts
export const DeviceInsertSchema = z.object({
  name: z.string().min(1, "Nome richiesto"),
  location: z.string().optional(),
  tags: z.array(z.string()).optional(),
  // ...
})

// Nel componente
const result = DeviceInsertSchema.safeParse(formData)
if (!result.success) {
  // Mostra errori
}
```

### Loading States

Ogni sezione principale ha un `loading.tsx`:

```tsx
// app/devices/loading.tsx
export default function Loading() {
  return <Skeleton className="h-[400px]" />
}
```

---

## Stili e Theming

### TailwindCSS

Configurazione in `tailwind.config.ts`:
- Colori custom per stati (pending, completed, overdue)
- Breakpoint responsive
- Animazioni

### CSS Variables

Definite in `app/globals.css`:
- Colori tema (light/dark)
- Raggi bordi
- Spacing

### Componenti shadcn/ui

Configurazione in `components.json`:
```json
{
  "style": "default",
  "tailwind": {
    "baseColor": "slate"
  }
}
```

---

## Gestione Stato

### Stato Locale

- `useState` per stato componente
- `useReducer` per stato complesso (wizard multi-step)

### Stato Server

- **Server Actions** per mutazioni
- `revalidatePath` per invalidazione cache
- Fetch iniziale in Server Components

### URL State

Filtri persistiti in URL per condivisione/refresh:

```tsx
// Esempio: filtri todolist
const searchParams = useSearchParams()
const filter = searchParams.get('filter') || 'all'
```

---

## Accessibilità

- Componenti Radix UI (keyboard navigation, ARIA)
- Focus management nei dialog
- Labels per tutti gli input
- Contrasto colori WCAG

---

## Performance

### Ottimizzazioni

1. **Paginazione infinita**: Caricamento progressivo liste
2. **Lazy loading**: Componenti pesanti (grafici)
3. **Image optimization**: Next.js `<Image />`
4. **Bundle splitting**: Automatic con App Router

### Metriche Monitorate

- Time to First Byte (TTFB)
- Largest Contentful Paint (LCP)
- Cumulative Layout Shift (CLS)

