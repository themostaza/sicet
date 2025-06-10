'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowUp, Calendar, Activity, BarChart2, PieChart as PieChartIcon, TrendingUp } from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
  Scatter
} from 'recharts';

// Chart colors
const chartColors = {
  primary: '#2563eb',
  secondary: '#7c3aed',
  completed: '#16a34a',
  pending: '#dc2626',
  neutral: '#6b7280'
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

// Define types for the chart data
type WeeklyTrendData = {
  date: string;
  completati: number;
  pendenti: number;
};

type DevicePerformanceData = {
  name: string;
  completati: number;
  pendenti: number;
  efficienza: number;
};

type TodolistDistributionData = {
  name: string;
  value: number;
};

type CompletionTrendData = {
  mese: string;
  completati: number;
  pendenti: number;
  tasso: number;
};

export default function SummaryPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    devices: 0,
    todolist: {
      all: 0,
      today: 0,
      overdue: 0,
      completed: 0,
      pending: 0
    }
  });

  const [statsData, setStatsData] = useState<{
    weeklyTrend: WeeklyTrendData[];
    devicePerformance: DevicePerformanceData[];
    todolistDistribution: TodolistDistributionData[];
    completionTrend: CompletionTrendData[];
  }>({
    weeklyTrend: [],
    devicePerformance: [],
    todolistDistribution: [],
    completionTrend: []
  });

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function loadSummaryData() {
      try {
        // Load data in parallel
        const [todolistsData, devicesData] = await Promise.all([
          supabase
            .from('todolists')
            .select('*', { count: 'exact' })
            .eq('status', 'pending'),
          supabase
            .from('devices')
            .select('*', { count: 'exact' })
        ]);

        // Calculate todolist statistics
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todolists = todolistsData.data || [];
        const overdue = todolists.filter(t => new Date(t.due_date) < today).length;
        const todayTasks = todolists.filter(t => {
          const dueDate = new Date(t.due_date);
          return dueDate.toDateString() === today.toDateString();
        }).length;
        const completed = todolists.filter(t => t.status === 'completed').length;

        setStats({
          devices: devicesData.count || 0,
          todolist: {
            all: todolists.length,
            today: todayTasks,
            overdue: overdue,
            completed: completed,
            pending: todolists.length - completed
          }
        });

        // Simulated data for charts
        setStatsData({
          weeklyTrend: [
            { date: 'Lun', completati: 14, pendenti: 7 },
            { date: 'Mar', completati: 13, pendenti: 8 },
            { date: 'Mer', completati: 15, pendenti: 5 },
            { date: 'Gio', completati: 12, pendenti: 9 },
            { date: 'Ven', completati: 18, pendenti: 6 },
            { date: 'Sab', completati: 10, pendenti: 4 },
            { date: 'Dom', completati: 6, pendenti: 3 },
          ],
          devicePerformance: [
            { name: 'Device A', completati: 42, pendenti: 8, efficienza: 92 },
            { name: 'Device B', completati: 38, pendenti: 12, efficienza: 87 },
            { name: 'Device C', completati: 55, pendenti: 5, efficienza: 95 },
          ],
          todolistDistribution: [
            { name: 'Completati', value: 65 },
            { name: 'In Scadenza', value: 20 },
            { name: 'Scaduti', value: 15 },
          ],
          completionTrend: [
            { mese: 'Gen', completati: 120, pendenti: 30, tasso: 80 },
            { mese: 'Feb', completati: 150, pendenti: 25, tasso: 85 },
            { mese: 'Mar', completati: 180, pendenti: 20, tasso: 90 },
            { mese: 'Apr', completati: 160, pendenti: 35, tasso: 82 },
            { mese: 'Mag', completati: 200, pendenti: 15, tasso: 93 },
            { mese: 'Giu', completati: 170, pendenti: 25, tasso: 87 },
          ]
        });

      } catch (error) {
        console.error('Error loading summary data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadSummaryData();
  }, [supabase]);

  return (
    <div className="flex-1 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard Referente</h1>
        <div className="text-sm text-muted-foreground">
          Ultimo aggiornamento: {new Date().toLocaleString('it-IT')}
        </div>
      </div>

      {/* Metriche principali */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              Attività Oggi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{isLoading ? "..." : stats.todolist.today}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {stats.todolist.overdue} attività scadute
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700 flex items-center">
              <Activity className="h-4 w-4 mr-2" />
              Completamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {isLoading ? "..." : `${Math.round((stats.todolist.completed / stats.todolist.all) * 100)}%`}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {stats.todolist.completed} completate su {stats.todolist.all} totali
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 flex items-center">
              <BarChart2 className="h-4 w-4 mr-2" />
              Punti di Controllo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">{isLoading ? "..." : stats.devices}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Totale dispositivi monitorati
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Panoramica</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="trends">Trend</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart2 className="h-5 w-5 mr-2 text-primary" />
                  Stato Attività
                </CardTitle>
                <CardDescription>
                  Distribuzione delle attività per stato
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statsData.todolistDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statsData.todolistDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-primary" />
                  Performance Dispositivi
                </CardTitle>
                <CardDescription>
                  Efficienza per punto di controllo
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={statsData.devicePerformance}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="efficienza" name="Efficienza %" fill={chartColors.primary} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="performance">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-primary" />
                  Trend Completamento
                </CardTitle>
                <CardDescription>
                  Andamento mensile delle attività
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={statsData.completionTrend}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mese" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="completati" name="Completati" fill={chartColors.completed} />
                      <Bar yAxisId="left" dataKey="pendenti" name="Pendenti" fill={chartColors.pending} />
                      <Line yAxisId="right" type="monotone" dataKey="tasso" name="Tasso Completamento %" stroke={chartColors.primary} strokeWidth={2} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-primary" />
                  Distribuzione Settimanale
                </CardTitle>
                <CardDescription>
                  Attività per giorno della settimana
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={statsData.weeklyTrend}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="completati" name="Completati" fill={chartColors.completed} />
                      <Bar dataKey="pendenti" name="Pendenti" fill={chartColors.pending} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="trends">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-primary" />
                  Trend Attività
                </CardTitle>
                <CardDescription>
                  Andamento delle attività nel tempo
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={statsData.completionTrend}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <defs>
                        <linearGradient id="colorCompletati" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={chartColors.completed} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={chartColors.completed} stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mese" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="completati" name="Attività Completate" stroke={chartColors.completed} fillOpacity={1} fill="url(#colorCompletati)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-primary" />
                  Correlazione Attività
                </CardTitle>
                <CardDescription>
                  Relazione tra volume e completamento
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={statsData.completionTrend}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mese" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="completati" name="Volume Attività" fill={chartColors.primary} />
                      <Line yAxisId="right" type="monotone" dataKey="tasso" name="Tasso Completamento %" stroke={chartColors.secondary} strokeWidth={2} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 