"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  BarChart2, 
  PieChart as PieChartIcon, 
  TrendingUp, 
  Activity,
  Layers, 
  FileText, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  BarChart as BarChartIcon,
  ArrowUp,
  ArrowDown
} from "lucide-react"
import { getTodolistsGroupedWithFilters } from "@/app/actions/actions-todolist"
import { getDevices } from "@/app/actions/actions-device"
import { getKpis } from "@/app/actions/actions-kpi"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, RadarChart, 
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ComposedChart, Scatter } from 'recharts'

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    devices: 0,
    kpis: 0,
    todolist: {
      all: 0,
      today: 0,
      overdue: 0,
      completed: 0,
      pending: 0
    }
  })
  const [statsData, setStatsData] = useState({
    weeklyTrend: [] as { date: string; completati: number; pendenti: number }[],
    devicePerformance: [] as { name: string; completati: number; pendenti: number; efficienza: number }[],
    kpiDistribution: [] as { name: string; value: number }[],
    performanceByCategory: [] as { subject: string; A: number; B: number; fullMark: number }[],
    monthlyCompletion: [] as { mese: string; controlli: number; completati: number; tasso: number }[],
    hourlyActivity: [] as { ora: string; attività: number }[]
  })

  useEffect(() => {
    async function loadDashboardData() {
      try {
        // Load data in parallel
        const [todolistsData, devicesData, kpisData] = await Promise.all([
          getTodolistsGroupedWithFilters(),
          getDevices({ limit: 1, countOnly: true }),
          getKpis({ limit: 1, countOnly: true })
        ])

        setStats({
          devices: devicesData.devices.length,
          kpis: kpisData.kpis.length,
          todolist: {
            all: todolistsData.counts.all,
            today: todolistsData.counts.today,
            overdue: todolistsData.counts.overdue,
            completed: todolistsData.counts.completed,
            pending: todolistsData.counts.today + todolistsData.counts.future
          }
        })

        // Dati simulati per i grafici
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
            { name: 'Device D', completati: 30, pendenti: 15, efficienza: 78 },
            { name: 'Device E', completati: 45, pendenti: 10, efficienza: 90 },
            { name: 'Device F', completati: 27, pendenti: 18, efficienza: 75 },
          ],
          kpiDistribution: [
            { name: 'Qualità', value: 35 },
            { name: 'Sicurezza', value: 25 },
            { name: 'Efficienza', value: 20 },
            { name: 'Manutenzione', value: 15 },
            { name: 'Altro', value: 5 },
          ],
          performanceByCategory: [
            { subject: 'Qualità', A: 120, B: 110, fullMark: 150 },
            { subject: 'Sicurezza', A: 98, B: 130, fullMark: 150 },
            { subject: 'Efficienza', A: 86, B: 130, fullMark: 150 },
            { subject: 'Manutenzione', A: 99, B: 100, fullMark: 150 },
            { subject: 'Produttività', A: 85, B: 90, fullMark: 150 },
            { subject: 'Monitoraggio', A: 65, B: 85, fullMark: 150 },
          ],
          monthlyCompletion: [
            { mese: 'Gen', controlli: 65, completati: 42, tasso: 64.6 },
            { mese: 'Feb', controlli: 75, completati: 60, tasso: 80.0 },
            { mese: 'Mar', controlli: 80, completati: 70, tasso: 87.5 },
            { mese: 'Apr', controlli: 70, completati: 65, tasso: 92.9 },
            { mese: 'Mag', controlli: 85, completati: 75, tasso: 88.2 },
            { mese: 'Giu', controlli: 90, completati: 85, tasso: 94.4 }
          ],
          hourlyActivity: [
            { ora: '6-8', attività: 12 },
            { ora: '8-10', attività: 45 },
            { ora: '10-12', attività: 67 },
            { ora: '12-14', attività: 32 },
            { ora: '14-16', attività: 55 },
            { ora: '16-18', attività: 48 },
            { ora: '18-20', attività: 23 },
            { ora: '20-22', attività: 8 },
          ]
        });

      } catch (error) {
        console.error("Error loading dashboard data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  // Colori per i grafici
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
  const chartColors = {
    completed: '#10b981', // verde
    pending: '#f59e0b',   // giallo
    overdue: '#ef4444',   // rosso
    primary: '#2563eb',   // blu
    secondary: '#8b5cf6', // viola
    neutral: '#6b7280'    // grigio
  };

  // Calcola il tasso di completamento totale
  const completionRate = stats.todolist.all > 0 
    ? Math.round((stats.todolist.completed / stats.todolist.all) * 100) 
    : 0;

  return (
    <div className="flex-1 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard Analitica</h1>
        <div className="text-sm text-muted-foreground">
          Ultimo aggiornamento: {new Date().toLocaleString('it-IT')}
        </div>
      </div>

      {/* Metriche principali */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 flex items-center">
              <Layers className="h-4 w-4 mr-2" />
              Punti di Controllo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{isLoading ? "..." : stats.devices}</div>
            <div className="mt-1 flex items-center text-xs">
              <ArrowUp className="h-3 w-3 mr-1 text-green-600" />
              <span className="text-green-600">+5%</span>
              <span className="ml-1 text-muted-foreground">vs mese prec.</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700 flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Controlli Totali
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{isLoading ? "..." : stats.kpis}</div>
            <div className="mt-1 flex items-center text-xs">
              <ArrowUp className="h-3 w-3 mr-1 text-green-600" />
              <span className="text-green-600">+12%</span>
              <span className="ml-1 text-muted-foreground">vs mese prec.</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-indigo-700 flex items-center">
              <CheckCircle className="h-4 w-4 mr-2" />
              Completamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-700">{isLoading ? "..." : `${completionRate}%`}</div>
            <div className="mt-1 flex items-center text-xs">
              <ArrowUp className="h-3 w-3 mr-1 text-green-600" />
              <span className="text-green-600">+3.2%</span>
              <span className="ml-1 text-muted-foreground">vs mese prec.</span>
            </div>
            <div className="mt-4 h-1 w-full bg-indigo-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-600 rounded-full" style={{width: `${completionRate}%`}}></div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-700 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Ritardo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">
              {isLoading ? "..." : `${stats.todolist.all > 0 ? Math.round((stats.todolist.overdue / stats.todolist.all) * 100) : 0}%`}
            </div>
            <div className="mt-1 flex items-center text-xs">
              <ArrowDown className="h-3 w-3 mr-1 text-green-600" />
              <span className="text-green-600">-2.5%</span>
              <span className="ml-1 text-muted-foreground">vs mese prec.</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grafici principali */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Panoramica</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="trends">Trend Temporali</TabsTrigger>
          <TabsTrigger value="distribution">Distribuzione</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart2 className="h-5 w-5 mr-2 text-primary" />
                  Performance dei Dispositivi
                </CardTitle>
                <CardDescription>
                  Stato attuale di tutti i punti di controllo
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={statsData.devicePerformance}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={80} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="completati" name="Completati" stackId="a" fill={chartColors.completed} />
                      <Bar dataKey="pendenti" name="Pendenti" stackId="a" fill={chartColors.pending} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChartIcon className="h-5 w-5 mr-2 text-primary" />
                  Distribuzione Controlli
                </CardTitle>
                <CardDescription>
                  Suddivisione per categoria
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statsData.kpiDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statsData.kpiDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
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
                  <TrendingUp className="h-5 w-5 mr-2 text-primary" />
                  Efficienza dei Punti di Controllo
                </CardTitle>
                <CardDescription>
                  Percentuale di efficienza per dispositivo
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
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-primary" />
                  Performance per Categoria
                </CardTitle>
                <CardDescription>
                  Confronto tra periodi
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart outerRadius={150} data={statsData.performanceByCategory}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" />
                      <PolarRadiusAxis angle={30} domain={[0, 150]} />
                      <Radar name="Periodo Attuale" dataKey="A" stroke={chartColors.primary} fill={chartColors.primary} fillOpacity={0.6} />
                      <Radar name="Periodo Precedente" dataKey="B" stroke={chartColors.secondary} fill={chartColors.secondary} fillOpacity={0.6} />
                      <Legend />
                      <Tooltip />
                    </RadarChart>
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
                  Andamento Mensile
                </CardTitle>
                <CardDescription>
                  Trend e tasso di completamento
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={statsData.monthlyCompletion}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mese" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="controlli" name="Controlli Totali" fill={chartColors.neutral} />
                      <Bar yAxisId="left" dataKey="completati" name="Completati" fill={chartColors.completed} />
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
                  Distribuzione Oraria
                </CardTitle>
                <CardDescription>
                  Attività per fascia oraria
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={statsData.hourlyActivity}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <defs>
                        <linearGradient id="colorAttività" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="ora" />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="attività" name="Numero Attività" stroke={chartColors.primary} fillOpacity={1} fill="url(#colorAttività)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="distribution">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChartIcon className="h-5 w-5 mr-2 text-primary" />
                  Attività Settimanali
                </CardTitle>
                <CardDescription>
                  Distribuzione per giorno della settimana
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
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-primary" />
                  Correlazione Indicatori
                </CardTitle>
                <CardDescription>
                  Relazione tra volume di attività e prestazioni
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={[
                        { name: 'A', attività: 25, prestazione: 82, size: 45 },
                        { name: 'B', attività: 42, prestazione: 75, size: 35 },
                        { name: 'C', attività: 18, prestazione: 95, size: 20 },
                        { name: 'D', attività: 35, prestazione: 88, size: 40 },
                        { name: 'E', attività: 60, prestazione: 72, size: 65 },
                        { name: 'F', attività: 28, prestazione: 85, size: 30 },
                        { name: 'G', attività: 15, prestazione: 98, size: 25 },
                      ]}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="attività" name="Volume Attività" />
                      <YAxis dataKey="prestazione" name="Prestazione" domain={[50, 100]} />
                      <Tooltip />
                      <Legend />
                      <Scatter name="Punti di Controllo" dataKey="size" fill={chartColors.primary} />
                      <Line type="monotone" dataKey="prestazione" stroke={chartColors.secondary} name="Trend Prestazione" dot={false} activeDot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* KPI Cards - indicatori di performance chiave */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">Efficienza</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">92%</div>
            <div className="mt-1 flex items-center text-xs">
              <ArrowUp className="h-3 w-3 mr-1 text-green-600" />
              <span className="text-green-600">+2.5%</span>
              <span className="ml-1 text-muted-foreground">vs mese prec.</span>
            </div>
            <div className="mt-4 h-1 w-full bg-blue-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full" style={{width: "92%"}}></div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Completamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">87%</div>
            <div className="mt-1 flex items-center text-xs">
              <ArrowUp className="h-3 w-3 mr-1 text-green-600" />
              <span className="text-green-600">+1.2%</span>
              <span className="ml-1 text-muted-foreground">vs mese prec.</span>
            </div>
            <div className="mt-4 h-1 w-full bg-green-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-600 rounded-full" style={{width: "87%"}}></div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-700">Puntualità</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700">78%</div>
            <div className="mt-1 flex items-center text-xs">
              <ArrowUp className="h-3 w-3 mr-1 text-green-600" />
              <span className="text-green-600">+3.7%</span>
              <span className="ml-1 text-muted-foreground">vs mese prec.</span>
            </div>
            <div className="mt-4 h-1 w-full bg-yellow-100 rounded-full overflow-hidden">
              <div className="h-full bg-yellow-600 rounded-full" style={{width: "78%"}}></div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-fuchsia-50 border-purple-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">Qualità</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">95%</div>
            <div className="mt-1 flex items-center text-xs">
              <ArrowUp className="h-3 w-3 mr-1 text-green-600" />
              <span className="text-green-600">+0.8%</span>
              <span className="ml-1 text-muted-foreground">vs mese prec.</span>
            </div>
            <div className="mt-4 h-1 w-full bg-purple-100 rounded-full overflow-hidden">
              <div className="h-full bg-purple-600 rounded-full" style={{width: "95%"}}></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
