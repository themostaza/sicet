# Database - Schema e Relazioni

## Panoramica

Il database è gestito da **Supabase** (PostgreSQL) con:
- **Row Level Security (RLS)** per autorizzazione
- **Tipi TypeScript generati** da `supabase/database.types.ts`
- **Migrazioni SQL** in `supabase/migrations/`

---

## Schema Entità-Relazioni

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   devices   │──────<│  todolist   │>──────│    tasks    │
│             │   1:N │             │   1:N │             │
└─────────────┘       └──────┬──────┘       └──────┬──────┘
                             │                     │
                             │                     │
                      ┌──────┴──────┐       ┌──────┴──────┐
                      │todolist_alert│       │    kpis    │
                      └──────┬──────┘       └──────┬──────┘
                             │                     │
                      ┌──────┴──────┐       ┌──────┴──────┐
                      │todolist_    │       │ kpi_alerts  │
                      │alert_logs   │       └──────┬──────┘
                      └─────────────┘              │
                                            ┌──────┴──────┐
                                            │kpi_alert_   │
                                            │logs         │
                                            └─────────────┘

┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│  profiles   │       │user_        │       │report_to_   │
│             │       │activities   │       │excel        │
└─────────────┘       └─────────────┘       └─────────────┘

┌─────────────┐
│export_      │
│templates    │
└─────────────┘
```

---

## Tabelle Principali

### `devices` - Punti di Controllo

Rappresenta i componenti fisici dell'impianto da controllare.

| Colonna | Tipo | Nullable | Default | Descrizione |
|---------|------|----------|---------|-------------|
| `id` | `text` | NO | - | ID breve (6 char) - PK |
| `name` | `text` | NO | - | Nome dispositivo |
| `location` | `text` | YES | NULL | Posizione nell'impianto |
| `description` | `text` | YES | NULL | Descrizione |
| `model` | `text` | YES | NULL | Modello |
| `type` | `text` | YES | NULL | Tipologia |
| `tags` | `text[]` | YES | NULL | Array di tag |
| `qrcode_url` | `text` | YES | NULL | URL QR code (legacy) |
| `deleted` | `boolean` | NO | `false` | Soft delete flag |
| `created_at` | `timestamptz` | YES | `now()` | Data creazione |

**Indici**:
- PK su `id`
- Indice su `deleted` per filtri

**Note**:
- ID generato con `generateDeviceId()` (6 caratteri alfanumerici)
- Soft delete: `deleted = true` invece di DELETE
- `tags` usati per filtri e raggruppamenti

---

### `kpis` - Controlli/Metriche

Definisce i tipi di controllo da eseguire.

| Colonna | Tipo | Nullable | Default | Descrizione |
|---------|------|----------|---------|-------------|
| `id` | `text` | NO | - | ID breve (6 char) - PK |
| `name` | `text` | NO | - | Nome controllo |
| `description` | `text` | YES | NULL | Descrizione |
| `value` | `jsonb` | NO | - | Schema campi (array) |
| `deleted` | `boolean` | NO | `false` | Soft delete flag |
| `created_at` | `timestamptz` | YES | `now()` | Data creazione |

**Struttura `value`**:

```json
[
  {
    "id": "field-uuid",
    "name": "Nome Campo",
    "type": "number|decimal|text|boolean|select",
    "required": true|false,
    "unit": "°C",           // opzionale
    "options": ["A", "B"]   // solo per select
  }
]
```

**Tipi campo supportati**:
- `number`: Intero
- `decimal`: Decimale
- `text`: Testo libero
- `boolean`: Sì/No
- `select`: Selezione da opzioni

---

### `todolist` - Checklist Programmate

Rappresenta una checklist da completare in una specifica data/fascia.

| Colonna | Tipo | Nullable | Default | Descrizione |
|---------|------|----------|---------|-------------|
| `id` | `uuid` | NO | `gen_random_uuid()` | PK |
| `device_id` | `text` | NO | - | FK → devices.id |
| `scheduled_execution` | `timestamptz` | NO | - | Data programmata (mezzanotte) |
| `status` | `text` | NO | `'pending'` | pending/in_progress/completed |
| `time_slot_type` | `text` | NO | `'standard'` | standard/custom |
| `time_slot_start` | `integer` | YES | NULL | Minuti inizio (0-1439) |
| `time_slot_end` | `integer` | YES | NULL | Minuti fine (0-1439) |
| `end_day_time` | `timestamptz` | YES | NULL | Timestamp scadenza effettiva |
| `todolist_category` | `text` | YES | NULL | Categoria/filone |
| `completed_by` | `uuid` | YES | NULL | User ID che ha completato |
| `completion_date` | `timestamptz` | YES | NULL | Data completamento |
| `created_at` | `timestamptz` | YES | `now()` | Data creazione |
| `updated_at` | `timestamptz` | YES | `now()` | Data aggiornamento |

**Relazioni**:
- `device_id` → `devices.id` (CASCADE on delete? No, soft delete)

**Time Slot**:
- `time_slot_type = 'standard'`: usa slot predefiniti (mattina, pomeriggio, etc.)
- `time_slot_type = 'custom'`: usa `time_slot_start` e `time_slot_end`
- Valori in minuti dalla mezzanotte (es. 06:00 = 360, 14:30 = 870)

**Slot Standard**:
| Nome | Start | End |
|------|-------|-----|
| mattina | 360 (06:00) | 840 (14:00) |
| pomeriggio | 840 (14:00) | 1320 (22:00) |
| notte | 1320 (22:00) | 360 (06:00+1) |
| giornata | 420 (07:00) | 1020 (17:00) |

---

### `tasks` - Task Individuali

Singola task all'interno di una todolist.

| Colonna | Tipo | Nullable | Default | Descrizione |
|---------|------|----------|---------|-------------|
| `id` | `uuid` | NO | - | PK |
| `todolist_id` | `uuid` | NO | - | FK → todolist.id |
| `kpi_id` | `text` | NO | - | FK → kpis.id |
| `status` | `text` | NO | `'pending'` | pending/completed |
| `value` | `jsonb` | YES | NULL | Valori inseriti |
| `alert_checked` | `boolean` | YES | `false` | Alert già verificato |
| `completed_at` | `timestamptz` | YES | NULL | Data completamento |
| `completed_by_user_id` | `uuid` | YES | NULL | User che ha completato |
| `created_by_user_id` | `uuid` | YES | NULL | User che ha creato |
| `created_at` | `timestamptz` | YES | `now()` | Data creazione |
| `updated_at` | `timestamptz` | NO | `now()` | Data aggiornamento |

**Relazioni**:
- `todolist_id` → `todolist.id` (CASCADE on delete)
- `kpi_id` → `kpis.id`

**Struttura `value`**:

```json
[
  {
    "id": "field-uuid",
    "name": "Temperatura",
    "value": 185
  },
  {
    "id": "field-uuid-2",
    "name": "Stato",
    "value": "OK"
  }
]
```

---

### `profiles` - Profili Utente

Estende l'autenticazione Supabase con dati applicativi.

| Colonna | Tipo | Nullable | Default | Descrizione |
|---------|------|----------|---------|-------------|
| `id` | `uuid` | NO | `gen_random_uuid()` | PK |
| `auth_id` | `uuid` | YES | NULL | FK → auth.users.id |
| `email` | `text` | NO | - | Email utente |
| `role` | `text` | NO | - | admin/operator/referrer |
| `status` | `text` | NO | `'reset-password'` | Stato account |
| `created_at` | `timestamptz` | NO | `now()` | Data creazione |
| `updated_at` | `timestamptz` | NO | `now()` | Data aggiornamento |

**Stati**:
- `reset-password`: Pre-registrato, deve impostare password
- `active`: Account attivo
- `deleted`: Account eliminato (soft delete)

**Flusso**:
1. Admin crea profilo → `status = 'reset-password'`, `auth_id = NULL`
2. Utente imposta password → `auth_id` collegato, `status = 'active'`

---

## Tabelle Alert

### `kpi_alerts` - Configurazione Alert KPI

| Colonna | Tipo | Nullable | Default | Descrizione |
|---------|------|----------|---------|-------------|
| `id` | `uuid` | NO | `gen_random_uuid()` | PK |
| `kpi_id` | `text` | NO | - | FK → kpis.id |
| `todolist_id` | `uuid` | NO | - | FK → todolist.id |
| `email` | `text` | NO | - | Email destinatario |
| `conditions` | `jsonb` | NO | - | Array condizioni |
| `is_active` | `boolean` | NO | `true` | Alert attivo |
| `created_at` | `timestamptz` | NO | `now()` | Data creazione |
| `updated_at` | `timestamptz` | NO | `now()` | Data aggiornamento |

**Struttura `conditions`**:

```json
[
  {
    "field_id": "field-uuid",
    "type": "number",
    "min": 100,
    "max": 250
  },
  {
    "field_id": "field-uuid-2",
    "type": "boolean",
    "boolean_value": false
  }
]
```

---

### `kpi_alert_logs` - Log Alert KPI Scattati

| Colonna | Tipo | Nullable | Default | Descrizione |
|---------|------|----------|---------|-------------|
| `id` | `uuid` | NO | `gen_random_uuid()` | PK |
| `alert_id` | `uuid` | NO | - | FK → kpi_alerts.id |
| `triggered_value` | `jsonb` | NO | - | Valori che hanno scatenato |
| `triggered_at` | `timestamptz` | NO | `now()` | Data trigger |
| `email_sent` | `boolean` | NO | `false` | Email inviata |
| `email_sent_at` | `timestamptz` | YES | NULL | Data invio email |
| `error_message` | `text` | YES | NULL | Errore invio |

---

### `todolist_alert` - Alert Todolist Scadute

| Colonna | Tipo | Nullable | Default | Descrizione |
|---------|------|----------|---------|-------------|
| `id` | `uuid` | NO | `gen_random_uuid()` | PK |
| `todolist_id` | `uuid` | NO | - | FK → todolist.id |
| `email` | `text` | NO | - | Email destinatario |
| `is_active` | `boolean` | NO | `true` | Alert attivo |
| `created_at` | `timestamptz` | NO | `now()` | Data creazione |
| `updated_at` | `timestamptz` | NO | `now()` | Data aggiornamento |

---

### `todolist_alert_logs` - Log Alert Todolist

| Colonna | Tipo | Nullable | Default | Descrizione |
|---------|------|----------|---------|-------------|
| `id` | `uuid` | NO | `gen_random_uuid()` | PK |
| `alert_id` | `uuid` | NO | - | FK → todolist_alert.id |
| `todolist_id` | `uuid` | NO | - | FK → todolist.id |
| `email` | `text` | NO | - | Email destinatario |
| `sent_at` | `timestamptz` | NO | `now()` | Data invio |
| `error_message` | `text` | YES | NULL | Errore invio |
| `created_at` | `timestamptz` | NO | `now()` | Data creazione |

---

## Tabelle Supporto

### `user_activities` - Log Attività Utente

Traccia tutte le azioni degli utenti per audit.

| Colonna | Tipo | Nullable | Default | Descrizione |
|---------|------|----------|---------|-------------|
| `id` | `uuid` | NO | `gen_random_uuid()` | PK |
| `user_id` | `uuid` | NO | - | ID utente |
| `action_type` | `user_action_type` | NO | - | Tipo azione (enum) |
| `entity_type` | `entity_type` | NO | - | Tipo entità (enum) |
| `entity_id` | `text` | NO | - | ID entità |
| `metadata` | `jsonb` | YES | NULL | Dati aggiuntivi |
| `created_at` | `timestamptz` | NO | `now()` | Data azione |

**Enum `user_action_type`**:
```sql
'create_device', 'create_kpi', 'create_todolist',
'update_device', 'update_kpi', 'update_todolist',
'delete_device', 'delete_kpi', 'delete_todolist',
'complete_task', 'complete_todolist'
```

**Enum `entity_type`**:
```sql
'device', 'kpi', 'todolist', 'task'
```

---

### `report_to_excel` - Configurazione Report

| Colonna | Tipo | Nullable | Default | Descrizione |
|---------|------|----------|---------|-------------|
| `id` | `uuid` | NO | `gen_random_uuid()` | PK |
| `name` | `text` | YES | NULL | Nome report |
| `description` | `text` | YES | NULL | Descrizione |
| `mapping_excel` | `jsonb` | YES | NULL | Mapping celle |
| `todolist_params_linked` | `jsonb` | YES | NULL | Parametri filtro |
| `created_at` | `timestamptz` | NO | `now()` | Data creazione |

**Struttura `mapping_excel`**:

```json
{
  "mappings": [
    {
      "cell": "B5",
      "source": "device_name"
    },
    {
      "cell": "C10",
      "source": "kpi_field",
      "field_id": "field-uuid"
    }
  ]
}
```

---

### `export_templates` - Template Export

| Colonna | Tipo | Nullable | Default | Descrizione |
|---------|------|----------|---------|-------------|
| `id` | `uuid` | NO | `gen_random_uuid()` | PK |
| `template_name` | `text` | YES | NULL | Nome template |
| `file_url` | `text` | YES | NULL | URL file template |
| `field_mapping` | `jsonb` | YES | NULL | Mapping campi |
| `email_autosend` | `text` | YES | NULL | Email auto-invio |
| `created_at` | `timestamptz` | NO | `now()` | Data creazione |

---

## Enums

### `user_action_type`

```sql
CREATE TYPE user_action_type AS ENUM (
  'create_device',
  'create_kpi',
  'create_todolist',
  'complete_task',
  'complete_todolist',
  'update_device',
  'update_kpi',
  'update_todolist',
  'delete_device',
  'delete_kpi',
  'delete_todolist'
);
```

### `entity_type`

```sql
CREATE TYPE entity_type AS ENUM (
  'device',
  'kpi',
  'todolist',
  'task'
);
```

---

## Funzioni RPC

### `get_todolist_counts`

Ottimizza il conteggio todolist per filtro.

```sql
CREATE FUNCTION get_todolist_counts(
  p_user_role text,
  p_tolerance_hours integer
) RETURNS json
```

Ritorna:
```json
{
  "all": 100,
  "today": 15,
  "overdue": 5,
  "future": 50,
  "completed": 30
}
```

### `get_distinct_todolist_categories`

Ritorna array di categorie uniche.

```sql
CREATE FUNCTION get_distinct_todolist_categories()
RETURNS text[]
```

### `log_user_activity`

Inserisce log attività utente.

```sql
CREATE FUNCTION log_user_activity(
  p_user_id uuid,
  p_action_type user_action_type,
  p_entity_type entity_type,
  p_entity_id text,
  p_metadata jsonb DEFAULT NULL
) RETURNS uuid
```

---

## Row Level Security (RLS)

### Policy Pattern

```sql
-- Abilita RLS
ALTER TABLE tablename ENABLE ROW LEVEL SECURITY;

-- Policy per utenti autenticati
CREATE POLICY "policy_name" ON tablename
  FOR ALL
  USING (auth.role() = 'authenticated');
```

### Policies Attive

#### `devices`
- `allow_authenticated_users_devices`: Lettura/scrittura per utenti autenticati

#### `kpis`
- `allow_authenticated_users_kpis`: Lettura/scrittura per utenti autenticati

#### `todolist`
- Accesso basato su ruolo (via query con join su profiles)

#### `profiles`
- Lettura: proprio profilo o admin
- Scrittura: solo admin (via service role)

---

## Migrazioni

Le migrazioni sono in `supabase/migrations/` ordinate per timestamp.

### Migrazioni Principali

| File | Descrizione |
|------|-------------|
| `20240320000000_create_todolist_table.sql` | Tabella todolist base |
| `20240320000000_create_kpi_alerts.sql` | Sistema alert KPI |
| `20240321000000_create_profiles.sql` | Profili utente |
| `20240321000000_add_time_slot_type.sql` | Time slot custom |
| `20240322000000_create_user_activities.sql` | Log attività |
| `20240326000000_create_todolist_alert_table.sql` | Alert todolist |
| `20240607000000_add_deleted_to_devices.sql` | Soft delete devices |
| `20240607000001_add_deleted_to_kpis.sql` | Soft delete kpis |
| `20240725100000_add_rls_policies.sql` | RLS policies |
| `20241201000000_change_device_kpi_ids_to_short.sql` | ID brevi |
| `20241203000000_modify_profiles_for_auth_id.sql` | Collegamento auth |

### Applicare Migrazioni

```bash
# Via Supabase CLI
supabase db push

# O manualmente su dashboard Supabase
```

---

## Tipi TypeScript

Generati automaticamente in `supabase/database.types.ts`:

```typescript
// Tipo per riga tabella
type DevicesRow = Database['public']['Tables']['devices']['Row']

// Tipo per insert
type DevicesInsert = Database['public']['Tables']['devices']['Insert']

// Tipo per update
type DevicesUpdate = Database['public']['Tables']['devices']['Update']

// Helper type
export type Tables<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Row']
```

### Rigenerare Tipi

```bash
supabase gen types typescript --project-id YOUR_PROJECT_ID > supabase/database.types.ts
```

---

## Backup e Manutenzione

### Backup

Supabase gestisce backup automatici:
- Point-in-time recovery (Pro plan)
- Daily backups

### Pulizia Dati

Considerazioni per dati storici:
- `user_activities`: Potrebbe crescere molto, valutare retention policy
- `kpi_alert_logs`: Idem
- `todolist_alert_logs`: Idem

### Indici Consigliati.

```sql
-- Per query frequenti
CREATE INDEX idx_todolist_device_date 
  ON todolist(device_id, scheduled_execution);

CREATE INDEX idx_todolist_status 
  ON todolist(status) WHERE status != 'completed';

CREATE INDEX idx_tasks_todolist 
  ON tasks(todolist_id);

CREATE INDEX idx_devices_deleted 
  ON devices(deleted) WHERE deleted = false;
```

---

## Connessione

### Variabili Ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...  # Solo server-side
```

### Client Setup

```typescript
// lib/supabase-server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        // ...
      }
    }
  )
}
```

