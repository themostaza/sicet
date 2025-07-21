import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { subMonths, startOfDay } from 'date-fns';
import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import TodolistClient from '@/components/todolist/todolist-client';
import { getTodolistTasksById, getTodolistById, getTodolistCompletionUserEmail } from '@/app/actions/actions-todolist';
import { getKpis } from '@/app/actions/actions-kpi';
import { getDevice } from '@/app/actions/actions-device';

const roleLabels: Record<string, string> = {
  operator: 'Operatore',
  admin: 'Admin',
  referrer: 'Referente',
};

type TabOperatoriProps = {
  dateRange: { from: Date | undefined; to: Date | undefined };
  setDateRange: (range: { from: Date | undefined; to: Date | undefined }) => void;
  selectedRole: 'operator' | 'admin' | 'referrer' | 'all';
  setSelectedRole: (role: 'operator' | 'admin' | 'referrer' | 'all') => void;
};

export default function TabOperatori({ dateRange, setDateRange, selectedRole, setSelectedRole }: TabOperatoriProps) {
  const [operatori, setOperatori] = useState<Array<{
    id: string;
    email: string;
    role: string;
    completed_todolists: number;
  }>>([]);
  const [operatoriLoading, setOperatoriLoading] = useState(false);
  const [operatoriError, setOperatoriError] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; email: string; role: string } | null>(null);
  const [userTodolists, setUserTodolists] = useState<Array<{ id: string; entity_id: string; created_at: string; metadata: any }>>([]);
  const [todolistsLoading, setTodolistsLoading] = useState(false);
  const [selectedTodolistId, setSelectedTodolistId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'tabella' | 'grafico'>('tabella');
  
  // Chart data state
  const [chartData, setChartData] = useState<Array<Record<string, any>>>([]);
  const [chartLoading, setChartLoading] = useState(false);
  
  // Todolist detail state
  const [todolistDetailData, setTodolistDetailData] = useState<{
    initialData: any;
    kpis: any[];
    device: any;
    todolist: any;
    completionUserEmail: string | null;
  } | null>(null);
  const [todolistDetailLoading, setTodolistDetailLoading] = useState(false);

  // Load chart data
  const loadChartData = async () => {
    if (!dateRange.from || !dateRange.to) return;
    
    setChartLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('from', dateRange.from.toISOString());
      params.append('to', dateRange.to.toISOString());
      params.append('role', selectedRole);
      
      const res = await fetch(`/api/summary/operators-daily-completions?${params.toString()}`);
      if (!res.ok) throw new Error('Errore nel recupero dati grafico');
      
      const data = await res.json();
      setChartData(data.data || []);
    } catch (err) {
      console.error('Error loading chart data:', err);
      setChartData([]);
    } finally {
      setChartLoading(false);
    }
  };

  useEffect(() => {
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
  }, [dateRange, selectedRole]);

  // Load chart data when filters change
  useEffect(() => {
    loadChartData();
  }, [dateRange, selectedRole]);

  // Fetch todolists when dialog opens and user is selected
  useEffect(() => {
    if (!dialogOpen || !selectedUser) return;
    setTodolistsLoading(true);
    setUserTodolists([]);
    
    // Costruisci parametri includendo il periodo selezionato
    const params = new URLSearchParams();
    params.append('user_id', selectedUser.id);
    if (dateRange.from) params.append('from', dateRange.from.toISOString());
    if (dateRange.to) params.append('to', dateRange.to.toISOString());
    
    fetch(`/api/summary/user-completed-todolists?${params.toString()}`)
      .then(async res => {
        if (!res.ok) throw new Error('Errore nel recupero delle todolist');
        const data = await res.json();
        setUserTodolists(data.todolists || []);
      })
      .catch(() => setUserTodolists([]))
      .finally(() => setTodolistsLoading(false));
  }, [dialogOpen, selectedUser, dateRange]);

  // Imposta intervallo di default ultimi 3 mesi
  useEffect(() => {
    if (!dateRange.from && !dateRange.to) {
      const today = startOfDay(new Date());
      const threeMonthsAgo = startOfDay(subMonths(today, 3));
      setDateRange({ from: threeMonthsAgo, to: today });
    }
  }, []);

  const handleRowClick = (user: { id: string; email: string; role: string }) => {
    setSelectedUser(user);
    setDialogOpen(true);
    setSelectedTodolistId(null);
    setTodolistDetailData(null);
  };

  // Load todolist detail data
  const loadTodolistDetail = async (todolistId: string, deviceId: string, date: string, timeSlot: string) => {
    setTodolistDetailLoading(true);
    try {
      // Carica in parallelo tutti i dati necessari (come nella pagina originale)
      const [initialData, kpisData, device, todolist, completionUserEmail] = await Promise.all([
        getTodolistTasksById({
          todolistId,
          offset: 0,
          limit: 20,
        }),
        getKpis({ offset: 0, limit: 100 }),
        getDevice(deviceId),
        getTodolistById(todolistId),
        getTodolistCompletionUserEmail(todolistId)
      ]);

      // Transform todolist fields come nella pagina originale
      const safeTodolist = todolist && todolist !== null ? {
        ...todolist,
        status: ["pending", "in_progress", "completed"].includes(todolist.status)
          ? todolist.status as "pending" | "in_progress" | "completed"
          : "pending",
        time_slot_type: ["standard", "custom"].includes(todolist.time_slot_type)
          ? todolist.time_slot_type as "standard" | "custom"
          : "standard"
      } : null;

      setTodolistDetailData({
        initialData,
        kpis: kpisData.kpis,
        device: device ? { name: device.name, location: device.location } : null,
        todolist: safeTodolist,
        completionUserEmail
      });
    } catch (error) {
      console.error('Error loading todolist detail:', error);
      setTodolistDetailData(null);
    } finally {
      setTodolistDetailLoading(false);
    }
  };

  // Formatta data per l'asse X: "2024-01-15" -> "15 Gen"
  const formatXAxisLabel = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return format(date, 'd MMM', { locale: it });
    } catch {
      return dateStr;
    }
  };

  // Colori per le linee
  const lineColors = [
    '#2563eb', '#10b981', '#f59e42', '#ef4444', '#a21caf', '#eab308', '#0ea5e9', '#6366f1', '#f43f5e', '#14b8a6',
  ];

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 min-w-0">
          {/* Filtri intervallo date e ruolo */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-lg">Filtra</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
                <div className="w-fit">
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
                <div>
                  <label className="block text-sm font-medium mb-1">Ruolo</label>
                  <Select value={selectedRole} onValueChange={v => setSelectedRole(v as any)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="operator">Operatori</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="referrer">Referenti</SelectItem>
                      <SelectItem value="all">Tutti</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
          <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'tabella' | 'grafico')}>
            <TabsList className="mb-4">
              <TabsTrigger value="tabella">Tabella</TabsTrigger>
              <TabsTrigger value="grafico">Grafico</TabsTrigger>
            </TabsList>
            <TabsContent value="tabella" className="w-full">
              {/* Tabella operatori a tutta larghezza */}
              <Card className="w-full">
                <CardHeader>
                  <CardTitle className="flex items-center text-gray-700">
                    <Users className="h-6 w-6 mr-2" />
                    Metriche Utenti
                  </CardTitle>
                  <CardDescription>
                    <span className="block mt-1 text-sm text-gray-500">Utenti e numero di todolist completate nell'intervallo selezionato</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {operatoriLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mr-2 text-gray-400" />
                      <span className="text-gray-600">Caricamento metriche utenti...</span>
                    </div>
                  ) : operatoriError ? (
                    <div className="text-center text-red-500 py-8">{operatoriError}</div>
                  ) : operatori.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Ruolo</TableHead>
                            <TableHead className="text-center">Todolist completate</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {operatori.map(op => (
                            <TableRow key={op.id} className="cursor-pointer hover:bg-gray-100" onClick={() => handleRowClick(op)}>
                              <TableCell className="font-medium text-gray-900">{op.email}</TableCell>
                              <TableCell className="capitalize">{roleLabels[op.role] || op.role}</TableCell>
                              <TableCell className="text-center font-semibold">{op.completed_todolists}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      Nessun utente trovato.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="grafico">
              {/* Grafico a tutta larghezza */}
              <Card className="w-full">
                <CardHeader>
                  <CardTitle className="text-lg">Frequenza completamento per utente</CardTitle>
                  <CardDescription>Numero di todolist completate per giorno nel periodo selezionato</CardDescription>
                </CardHeader>
                <CardContent>
                  {chartLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mr-2 text-gray-400" />
                      <span className="text-gray-600">Caricamento dati grafico...</span>
                    </div>
                  ) : chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={450}>
                      <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={formatXAxisLabel}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis allowDecimals={false} />
                        <Tooltip 
                          labelFormatter={(label) => `Data: ${formatXAxisLabel(label)}`}
                        />
                        <Legend />
                        {operatori.map((op, idx) => (
                          <Line
                            key={op.id}
                            type="monotone"
                            dataKey={op.email}
                            stroke={lineColors[idx % lineColors.length]}
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={false}
                            name={op.email}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-muted-foreground text-center py-8">Nessun dato disponibile per il grafico</div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      {/* Dialog Dettaglio Utente */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-full max-w-5xl h-[90vh] flex flex-row p-0" style={{ maxWidth: '100vw', width: '100vw', height: '100vh', borderRadius: 0 }}>
          {/* Colonna todolist completate */}
          <div className="flex flex-col w-80 h-full border-r p-4 overflow-y-auto bg-white">
            <h2 className="text-lg font-semibold mb-4">
              Todolist completate
              {dateRange.from && dateRange.to && (
                <span className="block text-sm font-normal text-muted-foreground mt-1">
                  {format(dateRange.from, "d MMM yyyy", { locale: it })} - {format(dateRange.to, "d MMM yyyy", { locale: it })}
                </span>
              )}
            </h2>
            {todolistsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2 text-gray-400" />
                <span className="text-gray-600">Caricamento todolist...</span>
              </div>
            ) : userTodolists.length === 0 ? (
              <div className="text-muted-foreground">Nessuna todolist completata trovata nel periodo selezionato.</div>
            ) : (
              <ul className="space-y-2">
                {userTodolists.map(tl => (
                    <li key={tl.id}>
                      <button
                        className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 ${selectedTodolistId === tl.id ? 'bg-gray-200' : ''}`}
                        onClick={() => {
                          setSelectedTodolistId(tl.id);
                          // Estrai parametri dalla todolist per caricare il dettaglio
                          if (tl.metadata?.device_id && tl.metadata?.scheduled_execution) {
                            const scheduledDate = new Date(tl.metadata.scheduled_execution);
                            const date = scheduledDate.toISOString().split('T')[0];
                            const timeSlot = `${scheduledDate.getHours().toString().padStart(2, '0')}:${scheduledDate.getMinutes().toString().padStart(2, '0')}`;
                            
                            loadTodolistDetail(tl.id, tl.metadata.device_id, date, timeSlot);
                          }
                        }}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{tl.entity_id}</span>
                          <span className="text-xs text-muted-foreground mt-1">{format(new Date(tl.created_at), 'd MMM yyyy, HH:mm', { locale: it })}</span>
                        </div>
                      </button>
                    </li>
                  ))}
              </ul>
            )}
          </div>
          {/* Colonna destra: titolo + dettaglio */}
          <div className="flex-1 flex flex-col h-full">
            <div className="flex items-start p-4 border-b min-h-[80px]">
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                {selectedUser?.email}
                {selectedUser && (
                  <Badge className="ml-2 capitalize">{roleLabels[selectedUser.role] || selectedUser.role}</Badge>
                )}
              </DialogTitle>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
              {selectedTodolistId ? (
                todolistDetailLoading ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin mr-2 text-gray-400" />
                    <div className="text-lg">Caricamento dettagli todolist...</div>
                  </div>
                ) : todolistDetailData ? (
                  <div className="h-full">
                    <TodolistClient
                      initialData={todolistDetailData.initialData}
                      todolistId={selectedTodolistId}
                      deviceId={todolistDetailData.todolist?.device_id || ''}
                      date={todolistDetailData.todolist?.scheduled_execution?.split('T')[0] || ''}
                      timeSlot={(() => {
                        if (todolistDetailData.todolist?.scheduled_execution) {
                          const scheduledDate = new Date(todolistDetailData.todolist.scheduled_execution);
                          return `${scheduledDate.getHours().toString().padStart(2, '0')}:${scheduledDate.getMinutes().toString().padStart(2, '0')}`;
                        }
                        return '';
                      })()}
                      initialKpis={todolistDetailData.kpis}
                      deviceInfo={todolistDetailData.device}
                      todolistData={todolistDetailData.todolist}
                      completionUserEmail={todolistDetailData.completionUserEmail}
                    />
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                    <div className="text-lg">Errore nel caricamento dei dettagli</div>
                    <div className="text-sm">Riprova selezionando nuovamente la todolist</div>
                  </div>
                )
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                  <div className="text-lg">Seleziona una todolist dalla lista per vedere i dettagli</div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 