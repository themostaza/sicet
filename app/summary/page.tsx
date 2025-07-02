'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Database } from '@/supabase/database.types';
import { Loader2, Users, Activity as ActivityIcon } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import TabOperatori from './components/TabOperatori';
import TabAttivita from './components/TabAttivita';

type UserActivity = Database['public']['Tables']['user_activities']['Row'] & {
  profile?: {
    email: string;
    role: 'operator' | 'admin' | 'referrer';
  };
};

type ActionType = Database['public']['Enums']['user_action_type'];
type EntityType = Database['public']['Enums']['entity_type'];

// Semplifichiamo i tipi di azione
type SimplifiedActionType = 'create' | 'update' | 'delete';
type SelectValue = SimplifiedActionType | EntityType | 'all';

const simplifiedActionTypeMap: Record<ActionType, SimplifiedActionType> = {
  create_device: 'create',
  create_kpi: 'create',
  create_todolist: 'create',
  complete_task: 'update',
  complete_todolist: 'update',
  update_device: 'update',
  update_kpi: 'update',
  update_todolist: 'update',
  delete_device: 'delete',
  delete_kpi: 'delete',
  delete_todolist: 'delete'
};

const simplifiedActionLabels: Record<SimplifiedActionType, string> = {
  create: 'Creazione',
  update: 'Modifica',
  delete: 'Eliminazione'
};

const simplifiedActionColors: Record<SimplifiedActionType, string> = {
  create: 'bg-green-100 text-green-800',
  update: 'bg-yellow-100 text-yellow-800',
  delete: 'bg-red-100 text-red-800'
};

const entityTypeLabels: Record<EntityType, string> = {
  device: 'Punto di Controllo',
  kpi: 'Device',
  todolist: 'Todo',
  task: 'Task'
};

const getMetadataLabel = (key: string): string => {
  const labelMap: Record<string, string> = {
    device_name: 'Nome',
    device_location: 'Posizione',
    kpi_name: 'Nome',
    kpi_description: 'Descrizione',
    device_id: 'ID',
    kpi_id: 'ID',
    scheduled_execution: 'Data Programmata',
    time_slot: 'Fascia Oraria'
  };
  return labelMap[key] || key;
};

const roleLabels: Record<string, string> = {
  operator: 'Operatore',
  admin: 'Admin',
  referrer: 'Referente',
};

export default function ActivityDashboard() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedActions, setSelectedActions] = useState<SelectValue[]>([]);
  const [selectedEntities, setSelectedEntities] = useState<SelectValue[]>([]);
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });
  const [users, setUsers] = useState<Array<{ id: string; email: string; role: string }>>([]);
  const [activeTab, setActiveTab] = useState<'operatori' | 'attivita'>('operatori');

  // Stato per tab operatori
  const [operatori, setOperatori] = useState<Array<{
    id: string;
    email: string;
    role: string;
    completed_todolists: number;
  }>>([]);
  const [operatoriLoading, setOperatoriLoading] = useState(false);
  const [operatoriError, setOperatoriError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<'operator' | 'admin' | 'referrer' | 'all'>('operator');

  // Carica utenti all'avvio
  useEffect(() => {
    async function loadUsers() {
      const { data: profiles } = await supabase.from('profiles').select('id, email, role');
      setUsers(profiles || []);
    }
    loadUsers();
  }, []);

  // Carica attività SOLO quando la lista utenti è pronta
  useEffect(() => {
    if (users.length === 0) return; // aspetta che gli utenti siano caricati

    async function loadActivities() {
      try {
        setIsLoading(true);
        setError(null);

        // Recupera l'utente dal client SSR
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw new Error('Errore di autenticazione: ' + userError.message);
        if (!user) throw new Error('Utente non autenticato');

        // Recupera il profilo
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('email', user.email)
          .single();
        if (profileError) throw new Error('Errore nel recupero del profilo: ' + profileError.message);
        if (!profile || !['referrer', 'admin'].includes(profile.role)) {
          throw new Error('Accesso non autorizzato: solo i referenti e gli amministratori possono visualizzare questa pagina');
        }
        
        let query = supabase
          .from('user_activities')
          .select('*')
          .order('created_at', { ascending: false });

        // Applica il filtro per intervallo di date
        if (dateRange.from) {
          query = query.gte('created_at', dateRange.from.toISOString());
        }
        if (dateRange.to) {
          const endDate = new Date(dateRange.to);
          endDate.setHours(23, 59, 59, 999);
          query = query.lte('created_at', endDate.toISOString());
        }

        const { data: activitiesData, error: activitiesError } = await query;

        if (activitiesError) throw new Error('Errore nel recupero delle attività: ' + activitiesError.message);

        // Combina i dati
        const activities = activitiesData?.map(activity => {
          const profile = users.find(p => p.id === activity.user_id);
          return {
            ...activity,
            profile: profile ? {
              email: profile.email,
              role: profile.role
            } : undefined
          };
        }) || [];

        setActivities(activities);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Errore sconosciuto');
        console.error('Error:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadActivities();
  }, [users]);

  // Carica dati operatori quando cambia intervallo date o tab
  useEffect(() => {
    if (activeTab !== 'operatori') return;
    async function loadOperatori() {
      setOperatoriLoading(true);
      setOperatoriError(null);
      try {
        const params = new URLSearchParams();
        if (dateRange.from) params.append('from', dateRange.from.toISOString());
        if (dateRange.to) params.append('to', dateRange.to.toISOString());
        params.append('role', selectedRole);
        const res = await fetch(`/api/summary/operators?${params.toString()}`);
        if (!res.ok) throw new Error('Errore nel recupero degli operatori');
        const data = await res.json();
        setOperatori(data.operators || []);
      } catch (err) {
        setOperatoriError(err instanceof Error ? err.message : 'Errore sconosciuto');
      } finally {
        setOperatoriLoading(false);
      }
    }
    loadOperatori();
  }, [dateRange, activeTab, selectedRole]);

  // Filtra le attività
  const filteredActivities = activities.filter((activity) => {
    const matchesUser = selectedUsers.length === 0 || 
      (activity.profile?.email && selectedUsers.includes(activity.profile.email));

    const matchesAction = selectedActions.length === 0 || 
      selectedActions.includes('all') ||
      selectedActions.includes(simplifiedActionTypeMap[activity.action_type]);

    const matchesEntity = selectedEntities.length === 0 || 
      selectedEntities.includes('all') ||
      selectedEntities.includes(activity.entity_type);

    return matchesUser && matchesAction && matchesEntity;
  });

  const handleSelectChange = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<SelectValue[]>>,
    type: 'action' | 'entity'
  ) => {
    if (value === 'all') {
      setter([]);
    } else {
      const values = value.split(',') as SelectValue[];
      setter(values);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard Attività</h1>
      </div>
      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'operatori' | 'attivita')}>
        <TabsList className="mb-4">
          <TabsTrigger value="operatori"><Users className="inline mr-2 w-4 h-4" />Operatori</TabsTrigger>
          <TabsTrigger value="attivita"><ActivityIcon className="inline mr-2 w-4 h-4" />Attività</TabsTrigger>
        </TabsList>
        <TabsContent value="operatori">
          <TabOperatori
            dateRange={dateRange}
            setDateRange={setDateRange}
            selectedRole={selectedRole}
            setSelectedRole={setSelectedRole}
          />
        </TabsContent>
        <TabsContent value="attivita">
          <TabAttivita
            users={users}
            selectedUsers={selectedUsers}
            setSelectedUsers={setSelectedUsers}
            selectedActions={selectedActions}
            setSelectedActions={(v: string[]) => setSelectedActions(v as any)}
            selectedEntities={selectedEntities}
            setSelectedEntities={(v: string[]) => setSelectedEntities(v as any)}
            dateRange={dateRange}
            setDateRange={setDateRange}
            handleSelectChange={handleSelectChange}
            filteredActivities={filteredActivities}
            isLoading={isLoading}
            error={error}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
} 