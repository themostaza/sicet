import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import React from 'react';

const simplifiedActionLabels: Record<string, string> = {
  create: 'Creazione',
  update: 'Modifica',
  delete: 'Eliminazione',
};
const simplifiedActionColors: Record<string, string> = {
  create: 'bg-green-100 text-green-800',
  update: 'bg-yellow-100 text-yellow-800',
  delete: 'bg-red-100 text-red-800',
};
const entityTypeLabels: Record<string, string> = {
  device: 'Punto di Controllo',
  kpi: 'Device',
  todolist: 'Todo',
  task: 'Task',
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
    time_slot: 'Fascia Oraria',
  };
  return labelMap[key] || key;
};

type TabAttivitaProps = {
  users: Array<{ id: string; email: string; role: string }>;
  selectedUsers: string[];
  setSelectedUsers: (v: string[]) => void;
  selectedActions: string[];
  setSelectedActions: (v: string[]) => void;
  selectedEntities: string[];
  setSelectedEntities: (v: string[]) => void;
  dateRange: { from: Date | undefined; to: Date | undefined };
  setDateRange: (range: { from: Date | undefined; to: Date | undefined }) => void;
  handleSelectChange: (value: string, setter: any, type: 'action' | 'entity') => void;
  filteredActivities: any[];
  isLoading: boolean;
  error: string | null;
};

export default function TabAttivita({
  users,
  selectedUsers,
  setSelectedUsers,
  selectedActions,
  setSelectedActions,
  selectedEntities,
  setSelectedEntities,
  dateRange,
  setDateRange,
  handleSelectChange,
  filteredActivities,
  isLoading,
  error,
}: TabAttivitaProps) {
  return (
    <>
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
                                        {format(dateRange.from, "dd/MM/yyyy", { locale: it })} -{" "}
            {format(dateRange.to, "dd/MM/yyyy", { locale: it })}
                          </>
                        ) : (
                          format(dateRange.from, "dd/MM/yyyy", { locale: it })
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
                          className={simplifiedActionColors[activity.action_type]}
                        >
                          {simplifiedActionLabels[activity.action_type]}
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
                              {getMetadataLabel(key)}: {value === undefined ? '' : (typeof value === 'object' ? JSON.stringify(value) : String(value))}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <time dateTime={activity.created_at}>
                        {format(new Date(activity.created_at), "dd/MM/yyyy 'alle' HH:mm", { locale: it })}
                      </time>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </>
  );
} 