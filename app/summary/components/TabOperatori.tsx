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
  const [selectedTodolistDate, setSelectedTodolistDate] = useState<string>('');

  const [activeTab, setActiveTab] = useState<'tabella' | 'grafico'>('tabella');

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

  // Fetch todolists when dialog opens and user is selected
  useEffect(() => {
    if (!dialogOpen || !selectedUser) return;
    setTodolistsLoading(true);
    setUserTodolists([]);
    fetch(`/api/summary/user-completed-todolists?user_id=${selectedUser.id}`)
      .then(async res => {
        if (!res.ok) throw new Error('Errore nel recupero delle todolist');
        const data = await res.json();
        setUserTodolists(data.todolists || []);
      })
      .catch(() => setUserTodolists([]))
      .finally(() => setTodolistsLoading(false));
  }, [dialogOpen, selectedUser]);

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
  };

  // Prepara dati per il grafico lineare: [{ date, user1: count, user2: count, ... }]
  const lineChartData = React.useMemo(() => {
    if (!operatori.length) return [];
    const from = dateRange.from ? startOfDay(dateRange.from) : null;
    const to = dateRange.to ? startOfDay(dateRange.to) : null;
    if (!from || !to) return [];
    // Crea lista di tutte le date nell'intervallo
    const days: string[] = [];
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      days.push(d.toISOString().slice(0, 10));
    }
    // Mappa: { userId: { email, completions: { [date]: count } } }
    const userMap: Record<string, { email: string; completions: Record<string, number> }> = {};
    operatori.forEach(op => {
      userMap[op.id] = { email: op.email, completions: {} };
      days.forEach(day => { userMap[op.id].completions[day] = 0; });
    });
    // Per ogni utente, fetch le todolist completate (solo se userTodolists contiene tutte, altrimenti serve API aggregata)
    // Qui userTodolists contiene solo quelle dell'utente selezionato, quindi il grafico sarà vuoto a meno di API aggregata
    // Per demo, mostriamo solo la linea dell'utente selezionato se presente
    if (selectedUser && userTodolists.length > 0) {
      userTodolists.forEach(tl => {
        const day = tl.created_at.slice(0, 10);
        if (userMap[selectedUser.id]) {
          userMap[selectedUser.id].completions[day] = (userMap[selectedUser.id].completions[day] || 0) + 1;
        }
      });
    }
    // Costruisci array per Recharts
    return days.map(day => {
      const entry: Record<string, any> = { date: day };
      Object.values(userMap).forEach(u => {
        entry[u.email] = u.completions[day];
      });
      return entry;
    });
  }, [operatori, dateRange, selectedUser, userTodolists]);

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
                  {lineChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={450}>
                      <LineChart data={lineChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
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
          <div className="flex flex-col w-full max-w-md h-full border-r p-6 overflow-y-auto bg-white">
            <h2 className="text-lg font-semibold mb-4">Todolist completate</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Filtra per data</label>
              <input
                type="date"
                className="border rounded px-2 py-1 text-sm"
                value={selectedTodolistDate}
                onChange={e => setSelectedTodolistDate(e.target.value)}
              />
            </div>
            {todolistsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2 text-gray-400" />
                <span className="text-gray-600">Caricamento todolist...</span>
              </div>
            ) : userTodolists.length === 0 ? (
              <div className="text-muted-foreground">Nessuna todolist completata trovata.</div>
            ) : (
              <ul className="space-y-2">
                {userTodolists
                  .filter(tl => {
                    if (!selectedTodolistDate) return true;
                    return tl.created_at && tl.created_at.slice(0, 10) === selectedTodolistDate;
                  })
                  .map(tl => (
                    <li key={tl.id}>
                      <button
                        className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 ${selectedTodolistId === tl.id ? 'bg-gray-200' : ''}`}
                        onClick={() => setSelectedTodolistId(tl.id)}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{tl.entity_id}</span>
                          <span className="text-xs text-muted-foreground">{format(new Date(tl.created_at), 'd MMM yyyy, HH:mm', { locale: it })}</span>
                        </div>
                      </button>
                    </li>
                  ))}
              </ul>
            )}
          </div>
          {/* Colonna destra: titolo + dettaglio */}
          <div className="flex-1 flex flex-col h-full">
            <div className="flex items-start p-6 border-b min-h-[88px]">
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                {selectedUser?.email}
                {selectedUser && (
                  <Badge className="ml-2 capitalize">{roleLabels[selectedUser.role] || selectedUser.role}</Badge>
                )}
              </DialogTitle>
            </div>
            <div className="flex-1 p-6">
              {selectedTodolistId ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                  <div className="text-lg font-semibold mb-2">Dettaglio Todolist</div>
                  <div className="text-sm">(placeholder dettagli per id: <span className="font-mono">{selectedTodolistId}</span>)</div>
                </div>
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