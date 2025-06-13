'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, Clock, User, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import type { Database } from '@/supabase/database.types';
import type { PostgrestError } from '@supabase/supabase-js';

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

        // Recupera la sessione utente dal client SSR
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw new Error('Errore di autenticazione: ' + sessionError.message);
        if (!session || !session.user) throw new Error('Utente non autenticato');
        const user = session.user;

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

      {/* Filtri */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtri</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Selezione Utenti */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Utenti</label>
              <Select
                value={selectedUsers.length === 0 ? 'all' : selectedUsers.join(',')}
                onValueChange={(value) => setSelectedUsers(value === 'all' ? [] : value.split(','))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona utenti" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli utenti</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.email}>
                      {user.email} ({user.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selezione Azioni */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Azioni</label>
              <Select
                value={selectedActions.length === 0 ? 'all' : selectedActions.join(',')}
                onValueChange={(value) => handleSelectChange(value, setSelectedActions, 'action')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona azioni" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le azioni</SelectItem>
                  {Object.entries(simplifiedActionLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selezione Entità */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Entità</label>
              <Select
                value={selectedEntities.length === 0 ? 'all' : selectedEntities.join(',')}
                onValueChange={(value) => handleSelectChange(value, setSelectedEntities, 'entity')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona entità" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le entità</SelectItem>
                  {Object.entries(entityTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selezione Intervallo Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Intervallo Date</label>
              <div className="grid gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "d MMM yyyy", { locale: it })} -{" "}
                            {format(dateRange.to, "d MMM yyyy", { locale: it })}
                          </>
                        ) : (
                          format(dateRange.from, "d MMM yyyy", { locale: it })
                        )
                      ) : (
                        <span>Seleziona intervallo date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange.from}
                      selected={{
                        from: dateRange.from,
                        to: dateRange.to
                      }}
                      onSelect={(range) => {
                        if (range) {
                          setDateRange({
                            from: range.from,
                            to: range.to
                          });
                        } else {
                          setDateRange({
                            from: undefined,
                            to: undefined
                          });
                        }
                      }}
                      numberOfMonths={2}
                      locale={it}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline delle attività */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Timeline Attività
          </CardTitle>
          <CardDescription>
            Visualizza tutte le attività degli utenti nel sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : error ? (
                <div className="text-center text-red-500 py-8">{error}</div>
              ) : filteredActivities.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  Nessuna attività trovata
                </div>
              ) : (
                filteredActivities.map((activity) => (
                  <div key={activity.id} className="flex gap-4 p-4 rounded-lg border bg-card">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={simplifiedActionColors[simplifiedActionTypeMap[activity.action_type]]}
                        >
                          {simplifiedActionLabels[simplifiedActionTypeMap[activity.action_type]]}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {entityTypeLabels[activity.entity_type]}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{activity.profile?.email}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground">{activity.profile?.role}</span>
                      </div>
                      {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                        <div className="text-sm text-muted-foreground">
                          {Object.entries(activity.metadata).map(([key, value]) => (
                            <span key={key} className="mr-2">
                              {getMetadataLabel(key)}: {typeof value === 'object' ? JSON.stringify(value) : value}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <time dateTime={activity.created_at}>
                        {format(new Date(activity.created_at), "d MMM yyyy 'alle' HH:mm", { locale: it })}
                      </time>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
} 