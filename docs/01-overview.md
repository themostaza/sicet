# SICET - Sistema di Gestione Controlli

## Panoramica

**SICET** è un sistema web per la gestione e tracciabilità dei controlli periodici di un impianto di **cogenerazione a biomassa**. L'impianto utilizza cippato e legname per produrre vapore e successivamente energia elettrica.

### Scopo del Sistema

Il sistema nasce dall'esigenza di:

1. **Conformità Normativa**: Dimostrare legalmente che vengono eseguiti controlli periodici regolari su tutti i componenti dell'impianto
2. **Tracciabilità**: Archiviare in modo strutturato tutti i dati raccolti durante le ispezioni
3. **Manutenzione Preventiva**: Monitorare lo stato dell'impianto attraverso KPI e alert automatici
4. **Operatività sul Campo**: Permettere agli operatori di compilare checklist direttamente sul posto tramite scansione QR code

---

## Stack Tecnologico

| Componente | Tecnologia |
|------------|------------|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript |
| **Styling** | TailwindCSS, shadcn/ui |
| **Backend** | Supabase (PostgreSQL + Auth + Row Level Security) |
| **Grafici** | Recharts |
| **Email** | Resend |
| **Validazione** | Zod |
| **QR Code** | qrcode, qrcode.react, pdf-lib |
| **Export** | xlsx (Excel), CSV, JSON |
| **Deploy** | Vercel |

---

## Concetti Chiave

### Punti di Controllo (Devices)

I **Punti di Controllo** rappresentano i componenti fisici dell'impianto che devono essere ispezionati (es. caldaia, bruciatore, valvole, sensori). Ogni punto di controllo:

- Ha un **QR code** univoco per l'identificazione rapida
- Può avere **tag** per la categorizzazione (es. "zona-caldaia", "sicurezza")
- È associato a una **location** nell'impianto

### KPI (Controlli)

I **KPI** definiscono *cosa* deve essere controllato. Ogni KPI specifica:

- Il **tipo di dato** da raccogliere (numero, testo, booleano, select, decimale)
- I **campi** da compilare durante l'ispezione
- Eventuali **range di valori accettabili** per gli alert

Esempio: "Temperatura uscita fumi" → campo numerico con range 150-250°C

### Todolist

Le **Todolist** sono le checklist programmate che combinano:

- Un **Punto di Controllo** (dove)
- Una **data** (quando)
- Una **fascia oraria** (turno)
- Uno o più **KPI** (cosa controllare)

Le todolist vengono generate in "filoni" (es. 200 controlli caldaia per i prossimi 6 mesi).

### Fasce Orarie (Time Slots)

Il sistema supporta 4 fasce orarie standard + personalizzate:

| Fascia | Orario | Tolleranza |
|--------|--------|------------|
| **Mattina** | 06:00 - 14:00 | fino alle 17:00 |
| **Pomeriggio** | 14:00 - 22:00 | fino alle 01:00 |
| **Notte** | 22:00 - 06:00 | fino alle 09:00 |
| **Giornata** | 07:00 - 17:00 | fino alle 20:00 |
| **Custom** | Configurabile | +3 ore |

> **Nota sulla Tolleranza**: La tolleranza di 3 ore è stata introdotta per gestire imprevisti operativi (tablet scarico, zone senza campo, ritardi). Una todolist non viene considerata "scaduta" fino al termine del periodo di tolleranza.

### Alert

Il sistema può inviare **notifiche email** quando:

1. **Alert KPI**: Un valore inserito esce dai range configurati (es. temperatura troppo alta)
2. **Alert Todolist**: Una todolist non viene completata entro la scadenza

---

## Flusso Operativo Tipico

```
┌─────────────────────────────────────────────────────────────────┐
│  1. PIANIFICAZIONE (Admin/Referrer)                             │
│     - Crea Punti di Controllo                                   │
│     - Definisce KPI con campi e range                           │
│     - Genera filoni di Todolist (es. 200 per 6 mesi)            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. ESECUZIONE SUL CAMPO (Operatore)                            │
│     - Scansiona QR code del punto di controllo                  │
│     - Visualizza todolist del turno corrente                    │
│     - Compila i valori richiesti                                │
│     - Conferma completamento                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. ELABORAZIONE AUTOMATICA                                     │
│     - Salvataggio dati su database                              │
│     - Verifica condizioni alert                                 │
│     - Invio email se fuori range                                │
│     - Log attività utente                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. MONITORAGGIO E REPORTING (Admin/Referrer)                   │
│     - Dashboard con metriche                                    │
│     - Matrice Madre: overview filoni                            │
│     - Export dati (CSV, JSON, Excel)                            │
│     - Report personalizzati                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Sistema di Ruoli

| Ruolo | Descrizione | Accesso |
|-------|-------------|---------|
| **Admin** | Amministratore completo | Tutte le funzionalità |
| **Referrer** | Responsabile area/reparto | Devices, KPIs, Todolist (no gestione utenti/alert) |
| **Operator** | Operatore sul campo | Solo Todolist (compilazione controlli) |

### Permessi Dettagliati

```
Admin:
├── Dashboard (metriche generali)
├── Statistiche (analisi dettagliate)
├── Punti di Controllo (CRUD completo)
├── Controlli/KPI (CRUD completo)
├── Todolist (CRUD + completamento)
├── Matrice Todolist
├── Matrice Madre
├── Report Excel
├── Esporta (CSV/JSON/Excel)
├── Alert (configurazione)
├── Log Alert
└── Pre-registra Utenti

Referrer:
├── Punti di Controllo (visualizzazione + modifica)
├── Controlli/KPI (visualizzazione + modifica)
└── Todolist (visualizzazione + completamento)

Operator:
└── Todolist (solo visualizzazione turno + completamento)
```

---

## Struttura del Progetto

```
sicet/
├── app/                    # Next.js App Router
│   ├── actions/            # Server Actions
│   ├── admin/              # Pagine amministrazione
│   ├── alerts/             # Gestione alert
│   ├── api/                # API Routes
│   ├── auth/               # Autenticazione
│   ├── dashboard/          # Dashboard analitica
│   ├── device/             # Singolo device
│   ├── devices/            # Lista devices
│   ├── export/             # Esportazione dati
│   ├── kpi/                # Singolo KPI
│   ├── kpis/               # Lista KPIs
│   ├── matrix/             # Matrici (Madre + Todolist)
│   ├── reports/            # Report Excel
│   ├── summary/            # Statistiche
│   └── todolist/           # Gestione todolist
├── components/             # Componenti React riutilizzabili
│   ├── ui/                 # Componenti shadcn/ui
│   └── ...                 # Componenti specifici
├── hooks/                  # Custom React hooks
├── lib/                    # Utility e configurazioni
│   ├── supabase/           # Client Supabase
│   └── validation/         # Schemi Zod
├── supabase/               # Configurazione database
│   ├── database.types.ts   # Tipi TypeScript generati
│   └── migrations/         # Migrazioni SQL
└── public/                 # Asset statici
```

---

## Funzionalità Principali

### 1. Matrice Madre

La **Matrice Madre** fornisce una vista d'insieme sui "filoni" di todolist:

- Quanti controlli sono stati generati per ogni punto
- Quanti sono stati completati
- Quanti rimangono da fare
- Fino a quando si estende la programmazione

Utile per capire "dove siamo" nella pianificazione dei controlli.

### 2. Matrice Todolist

La **Matrice Todolist** mostra i dati grezzi delle singole todolist in formato tabellare, con tutti i dettagli necessari per analisi e reportistica.

### 3. Report Excel

Il sistema permette di creare **template Excel personalizzati** con:

- **Mapping celle**: definizione di quale valore va in quale cella
- **Download sequenziale**: man mano che i dati vengono generati, possono essere scaricati nel formato definito

### 4. Sistema di Alert

Due tipologie di alert:

1. **Alert KPI**: Monitorano valori fuori range
   - Configurabili per singolo campo
   - Condizioni: min/max per numeri, match per testo, valori specifici per select

2. **Alert Todolist**: Notificano mancato completamento
   - Email automatica se la todolist scade senza essere completata

---

## Integrazioni Esterne

- **Resend**: Invio email per alert e notifiche
- **Supabase Auth**: Autenticazione utenti con magic link e password
- **Vercel**: Hosting e deploy automatico da GitHub

---

## Note per lo Sviluppo

- Il progetto usa **TypeScript strict** per type safety
- La validazione è centralizzata in `lib/validation/` con **Zod**
- I componenti UI sono basati su **shadcn/ui** (Radix + Tailwind)
- Il database usa **Row Level Security (RLS)** per la sicurezza
- Le **Server Actions** sono preferite alle API routes per le operazioni CRUD

