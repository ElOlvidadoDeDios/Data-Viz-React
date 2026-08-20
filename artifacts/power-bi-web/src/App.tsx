import { useState, useEffect, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster, toast } from 'sonner';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  Download,
  Filter,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  RefreshCw,
  Search,
  Share2,
  SlidersHorizontal,
  Target,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
  Legend
} from 'recharts';
import { useLocation } from 'wouter';

const queryClient = new QueryClient();

type View = 'gerencia' | 'supervision' | 'agencia' | 'asesores' | 'colocaciones' | 'diaria';
type Filters = { period: string; agency: string; advisor: string; day: string };

type AgencyRow = {
  agency: string;
  growth: number;
  operations: number;
  disbursements: number;
  repayments: number;
  portfolio: number;
  cppMax: number;
  cppActual: number;
  deficientMax: number;
  deficientActual: number;
};

type AdvisorRow = {
  advisor: string;
  portfolio: number;
  disbursements: number;
  repayments: number;
  netGrowth: number;
  mora: number;
  moraPct: number;
  missing: number;
};

type DailyRow = {
  agency: string;
  targetCount: number;
  projectionCount: number;
  achievedCount: number;
  targetAmount: number;
  projectionAmount: number;
  achievedAmount: number;
};

const viewMeta: Record<View, { label: string; eyebrow: string; title: string; subtitle: string }> = {
  gerencia: {
    label: 'Reporte Gerencia',
    eyebrow: 'Lectura general de la operación',
    title: 'La colocación avanza con foco y control.',
    subtitle: 'Una lectura ejecutiva de metas, cartera, crecimiento, mora y productividad por agencia.',
  },
  supervision: {
    label: 'Supervisión Agencias',
    eyebrow: 'Supervisión · indicadores consolidados',
    title: 'Cada agencia muestra una oportunidad distinta.',
    subtitle: 'Compara el desempeño comercial y de recuperación para decidir dónde intervenir primero.',
  },
  agencia: {
    label: 'Detalle de Agencia',
    eyebrow: 'Supervisión · agencia seleccionada',
    title: 'Profundiza en la salud de una agencia.',
    subtitle: 'Revisa colocación, repagos, cartera y mora CPP por agencia y por asesor.',
  },
  asesores: {
    label: 'Indicadores Asesores',
    eyebrow: 'Seguimiento de equipos',
    title: 'La productividad se construye asesor por asesor.',
    subtitle: 'Identifica desempeño, duración, socios nuevos, mora y faltante a la meta de S/ 20K.',
  },
  colocaciones: {
    label: 'Colocaciones',
    eyebrow: 'Ritmo de colocación',
    title: 'El objetivo del mes se vuelve alcanzable.',
    subtitle: 'Monitorea meta, logrado y proyección para anticiparte al cierre de la agencia.',
  },
  diaria: {
    label: 'Productividad Diaria',
    eyebrow: 'Metas, proyecciones y colocaciones logradas',
    title: 'La gestión de hoy define el cierre.',
    subtitle: 'Compara cantidad y monto de colocaciones frente a la meta diaria de cada agencia.',
  },
};

const agencies: AgencyRow[] = [
  { agency: 'Chiclayo', growth: 256802, operations: 52, disbursements: 265430, repayments: 259847, portfolio: 259847, cppMax: 25985, cppActual: 0, deficientMax: 5197, deficientActual: 0 },
  { agency: 'Lima SJL', growth: 281631, operations: 150, disbursements: 293501, repayments: 297006, portfolio: 297006, cppMax: 29701, cppActual: 6923, deficientMax: 5940, deficientActual: 0 },
  { agency: 'Arequipa', growth: 251187, operations: 171, disbursements: 265935, repayments: 272622, portfolio: 272622, cppMax: 27262, cppActual: 2060, deficientMax: 5452, deficientActual: 0 },
  { agency: 'Pucallpa', growth: 400745, operations: 307, disbursements: 475699, repayments: 543502, portfolio: 543502, cppMax: 54350, cppActual: 5951, deficientMax: 10870, deficientActual: 0 },
  { agency: 'Tica Tica', growth: -71207, operations: 156, disbursements: 369708, repayments: 213395, portfolio: 213395, cppMax: 21339, cppActual: 549049, deficientMax: 42679, deficientActual: 296615 },
  { agency: 'Lima Los Olivos', growth: 327654, operations: 292, disbursements: 767358, repayments: 2431641, portfolio: 2431641, cppMax: 241464, cppActual: 310467, deficientMax: 48293, deficientActual: 172117 },
  { agency: 'Magisterio', growth: 366786, operations: 234, disbursements: 791407, repayments: 2267868, portfolio: 2267868, cppMax: 226787, cppActual: 225885, deficientMax: 45357, deficientActual: 56681 },
  { agency: 'Sicuani', growth: 272936, operations: 187, disbursements: 517850, repayments: 536644, portfolio: 536644, cppMax: 53664, cppActual: 514880, deficientMax: 46913, deficientActual: 377318 },
  { agency: 'Juliaca', growth: 43117, operations: 205, disbursements: 527563, repayments: 1960120, portfolio: 1960120, cppMax: 196013, cppActual: 329488, deficientMax: 39203, deficientActual: 160083 },
  { agency: 'Molino', growth: 75145, operations: 222, disbursements: 719859, repayments: 4263430, portfolio: 4263430, cppMax: 436243, cppActual: 627511, deficientMax: 87249, deficientActual: 370647 },
  { agency: 'San Jerónimo', growth: 189356, operations: 244, disbursements: 957175, repayments: 4315840, portfolio: 4315840, cppMax: 431584, cppActual: 422910, deficientMax: 86137, deficientActual: 120310 },
  { agency: 'Quillabamba', growth: 121837, operations: 250, disbursements: 954276, repayments: 3574129, portfolio: 3574129, cppMax: 357413, cppActual: 371772, deficientMax: 71483, deficientActual: 108064 },
  { agency: 'Wanchaq', growth: -54769, operations: 240, disbursements: 900604, repayments: 6400380, portfolio: 6400380, cppMax: 640038, cppActual: 667385, deficientMax: 128008, deficientActual: 238062 },
];

const advisors: AdvisorRow[] = [
  { advisor: 'Edmon VA', portfolio: 177490, disbursements: 11620, repayments: 8129, netGrowth: 3491, mora: 4090, moraPct: 2.3, missing: 20599 },
  { advisor: 'Yudith CL', portfolio: 530561, disbursements: 25765, repayments: 26414, netGrowth: -649, mora: 2824, moraPct: 0.53, missing: 23473 },
  { advisor: 'Christian AG', portfolio: 200869, disbursements: 14771, repayments: 8549, netGrowth: 6223, mora: 2055, moraPct: 1.02, missing: 15832 },
  { advisor: 'Rossmery TH', portfolio: 714797, disbursements: 41592, repayments: 33110, netGrowth: 8482, mora: 2029, moraPct: 0.28, missing: 13547 },
  { advisor: 'Marilhynn FS', portfolio: 651140, disbursements: 34210, repayments: 30865, netGrowth: 3345, mora: 1046, moraPct: 0.16, missing: 17701 },
  { advisor: 'Hugo SC', portfolio: 47199, disbursements: 13100, repayments: 10758, netGrowth: 2342, mora: 1029, moraPct: 2.18, missing: 6900 },
  { advisor: 'Alvin TM', portfolio: 141723, disbursements: 19240, repayments: 8310, netGrowth: 10930, mora: 825, moraPct: 0.58, missing: 10760 },
  { advisor: 'Analý SP', portfolio: 341438, disbursements: 7440, repayments: 1256, netGrowth: 6184, mora: 0, moraPct: 0, missing: 12560 },
  { advisor: 'Brigitte CV', portfolio: 177486, disbursements: 36440, repayments: 5482, netGrowth: 30958, mora: 2753, moraPct: 1.55, missing: 0 },
  { advisor: 'Laura MP', portfolio: 230642, disbursements: 42185, repayments: 19255, netGrowth: 22930, mora: 54989, moraPct: 23.84, missing: 0 },
  { advisor: 'Lisbeth CH', portfolio: 297790, disbursements: 44950, repayments: 22221, netGrowth: 22729, mora: 131287, moraPct: 44.08, missing: 0 },
];

const dailyRows: DailyRow[] = [
  { agency: 'Wanchaq', targetCount: 12, projectionCount: 11, achievedCount: 4, targetAmount: 39036, projectionAmount: 40500, achievedAmount: 22680 },
  { agency: 'Tica Tica', targetCount: 10, projectionCount: 9, achievedCount: 1, targetAmount: 34490, projectionAmount: 35000, achievedAmount: 6230 },
  { agency: 'Sicuani', targetCount: 13, projectionCount: 13, achievedCount: 2, targetAmount: 32589, projectionAmount: 35000, achievedAmount: 11527 },
  { agency: 'San Jerónimo', targetCount: 13, projectionCount: 11, achievedCount: 2, targetAmount: 31434, projectionAmount: 35000, achievedAmount: 6430 },
  { agency: 'Quillabamba', targetCount: 11, projectionCount: 10, achievedCount: 6, targetAmount: 31088, projectionAmount: 35000, achievedAmount: 11527 },
  { agency: 'Pucallpa', targetCount: 12, projectionCount: 12, achievedCount: 1, targetAmount: 31091, projectionAmount: 25000, achievedAmount: 1500 },
  { agency: 'Molino', targetCount: 11, projectionCount: 10, achievedCount: 4, targetAmount: 30100, projectionAmount: 25000, achievedAmount: 9795 },
  { agency: 'Magisterio', targetCount: 15, projectionCount: 12, achievedCount: 1, targetAmount: 30800, projectionAmount: 36000, achievedAmount: 1525 },
  { agency: 'Lima SJL', targetCount: 12, projectionCount: 11, achievedCount: 0, targetAmount: 30570, projectionAmount: 24000, achievedAmount: 0 },
  { agency: 'Lima Los Olivos', targetCount: 13, projectionCount: 12, achievedCount: 0, targetAmount: 30500, projectionAmount: 25000, achievedAmount: 0 },
  { agency: 'Juliaca', targetCount: 14, projectionCount: 11, achievedCount: 1, targetAmount: 30100, projectionAmount: 12000, achievedAmount: 4190 },
  { agency: 'Arequipa', targetCount: 11, projectionCount: 9, achievedCount: 0, targetAmount: 11490, projectionAmount: 12000, achievedAmount: 0 },
  { agency: 'Chiclayo', targetCount: 11, projectionCount: 14, achievedCount: 2, targetAmount: 10075, projectionAmount: 14000, achievedAmount: 0 },
];

const trendData = [
  { month: 'Mar', achieved: 480, target: 620 },
  { month: 'Abr', achieved: 690, target: 760 },
  { month: 'May', achieved: 580, target: 710 },
  { month: 'Jun', achieved: 840, target: 820 },
  { month: 'Jul', achieved: 920, target: 940 },
  { month: 'Ago', achieved: 1120, target: 1060 },
];

// Tabla interna de Agencias
const catalogoAgencias = [
  { id: '01', nombre: 'Wanchaq' },
  { id: '02', nombre: 'San Jerónimo' },
  { id: '03', nombre: 'Quillabamba' },
  { id: '04', nombre: 'Sicuani' },
  { id: '05', nombre: 'Molino' },
  { id: '06', nombre: 'Juliaca' },
  { id: '07', nombre: 'Lima Los Olivos' },
  { id: '08', nombre: 'Tica Tica' },
  { id: '09', nombre: 'Magisterio' },
  { id: '10', nombre: 'Lima SJL' },
  { id: '11', nombre: 'Chiclayo' },
  { id: '12', nombre: 'Arequipa' },
  { id: '13', nombre: 'Pucallpa' }
];
const nombresAgencias = ['Todas', ...catalogoAgencias.map(a => a.nombre)];

function money(value: number) {
  return `S/ ${new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 }).format(Math.round(value))}`;
}

function number(value: number) {
  return new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 }).format(value);
}

function percent(value: number) {
  return `${value.toFixed(value % 1 === 0 ? 0 : 2)}%`;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><Dashboard /><Toaster position="bottom-right" richColors /></TooltipProvider></QueryClientProvider>;
}

function Dashboard() {
  const [location, setLocation] = useLocation();
  const pathView = location.slice(1) as View;
  const activeView: View = viewMeta[pathView] ? pathView : 'gerencia';
  
  // 1. Llamamos a la base de datos para obtener los filtros
  const { data: dbFilters } = useQuery({
    queryKey: ['filtros-bd'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3000/api/filtros');
      if (!res.ok) throw new Error('Error al obtener filtros');
      return res.json();
    }
  });

  // 2. Estado inicial de los filtros
  const [filters, setFilters] = useState<Filters>({ period: 'Cargando...', agency: 'Todas', advisor: 'Todos', day: 'Hoy' });

  // 3. Cuando la base de datos responda, actualizamos el periodo inicial automáticamente
  useEffect(() => {
    if (dbFilters?.periodos?.length > 0 && filters.period === 'Cargando...') {
      setFilters(prev => ({ ...prev, period: dbFilters.periodos[0] }));
    }
  }, [dbFilters, filters.period]);

  const [mobileNav, setMobileNav] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('11/08/2026 · 12:50 p. m.');
  const meta = viewMeta[activeView];

  const navigate = (view: View) => { setLocation(view === 'gerencia' ? '/' : `/${view}`); setMobileNav(false); };
  
  const refresh = () => {
    setIsRefreshing(true);
    setTimeout(() => { setIsRefreshing(false); setLastUpdated('justo ahora'); toast.success('Vista actualizada'); }, 650);
  };
  
  const resetFilters = () => { 
    setFilters({ period: dbFilters?.periodos?.[0] || 'Cargando...', agency: 'Todas', advisor: 'Todos', day: 'Hoy' }); 
    toast.success('Filtros restablecidos'); 
  };

  return (
    <div className="dashboard-noise min-h-[100dvh] bg-background">
      <aside className={`fixed inset-y-0 left-0 z-30 flex w-[256px] flex-col bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))] transition-transform duration-300 md:translate-x-0 ${mobileNav ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-[88px] items-center gap-3 border-b border-[hsl(var(--sidebar-border))] px-7">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))]"><BarChart3 size={22} strokeWidth={2.5} /></div>
          <div><div className="font-display text-[19px] font-bold tracking-[-.04em]">Pulso<span className="text-[hsl(var(--sidebar-primary))]">.</span></div><div className="font-mono text-[9px] uppercase tracking-[.19em] text-[hsl(var(--sidebar-foreground)/.55)]">Business intelligence</div></div>
          <button data-testid="button-close-navigation" className="ml-auto rounded-lg p-1 text-[hsl(var(--sidebar-foreground)/.65)] md:hidden" onClick={() => setMobileNav(false)}><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-7">
          <div className="mb-3 px-3 font-mono text-[10px] uppercase tracking-[.16em] text-[hsl(var(--sidebar-foreground)/.42)]">Reporte operativo</div>
          <nav className="space-y-1">
            {([
              ['gerencia', 'Reporte Gerencia', LayoutDashboard],
              ['supervision', 'Supervisión Agencias', Building2],
              ['agencia', 'Detalle de Agencia', SlidersHorizontal],
              ['asesores', 'Indicadores Asesores', Users],
              ['colocaciones', 'Colocaciones', Target],
              ['diaria', 'Productividad Diaria', TrendingUp],
            ] as const).map(([view, label, Icon]) => (
              <button key={view} data-testid={`button-nav-${view}`} onClick={() => navigate(view)} className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[12px] font-semibold transition-all ${activeView === view ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))] shadow-[inset_3px_0_0_hsl(var(--sidebar-primary))]' : 'text-[hsl(var(--sidebar-foreground)/.64)] hover:bg-[hsl(var(--sidebar-accent)/.7)] hover:text-[hsl(var(--sidebar-foreground))]'}`}><Icon size={16} strokeWidth={activeView === view ? 2.4 : 1.8} /><span>{label}</span>{activeView === view && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[hsl(var(--sidebar-primary))]" />}</button>
            ))}
          </nav>
          <div className="mt-10 mb-3 px-3 font-mono text-[10px] uppercase tracking-[.16em] text-[hsl(var(--sidebar-foreground)/.42)]">Atajos</div>
          <button data-testid="button-help" onClick={() => toast.info('Meta, proyección, faltante, CPP, mora deficiente, TEA y productividad están definidos en el modelo Power BI')} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[12px] text-[hsl(var(--sidebar-foreground)/.62)] hover:bg-[hsl(var(--sidebar-accent)/.7)]"><CircleHelp size={16} /><span>Ayuda y definiciones</span></button>
        </div>
        <div className="m-4 rounded-2xl border border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-accent)/.55)] p-4">
          <div className="mb-3 flex items-center justify-between"><span className="font-mono text-[9px] uppercase tracking-[.13em] text-[hsl(var(--sidebar-foreground)/.5)]">Modelo de datos</span><span className="flex items-center gap-1 text-[10px] text-[hsl(var(--sidebar-primary))]"><span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--sidebar-primary))] animate-pulse-soft" />Demo local</span></div>
          <div className="text-[12px] leading-5 text-[hsl(var(--sidebar-foreground)/.7)]">Flujo · stock · calendario<br />Agencias · asesores · medidas</div>
        </div>
        <div className="flex items-center gap-3 border-t border-[hsl(var(--sidebar-border))] px-6 py-5"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--accent))] font-display text-xs font-bold text-[hsl(var(--accent-foreground))]">BI</div><div className="min-w-0"><div className="truncate text-xs font-semibold">Gestión Administradores</div><div className="truncate text-[10px] text-[hsl(var(--sidebar-foreground)/.48)]">Reporte operativo</div></div><MoreHorizontal size={17} className="ml-auto text-[hsl(var(--sidebar-foreground)/.5)]" /></div>
      </aside>
      {mobileNav && <button data-testid="button-overlay-navigation" aria-label="Cerrar navegación" className="fixed inset-0 z-20 bg-[hsl(var(--foreground)/.32)] md:hidden" onClick={() => setMobileNav(false)} />}
      <main className="min-h-[100dvh] md:pl-[256px]">
        <header className="sticky top-0 z-10 border-b border-border/70 bg-[hsl(var(--background)/.86)] px-5 py-4 backdrop-blur-xl sm:px-8 lg:px-11">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3"><button data-testid="button-open-navigation" className="rounded-xl border border-border bg-card p-2 md:hidden" onClick={() => setMobileNav(true)}><Menu size={19} /></button><div><div className="font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">{meta.eyebrow}</div><div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays size={13} />Periodo de gestión · {filters.period}</div></div></div>
            <div className="flex items-center gap-2"><button data-testid="button-search" onClick={() => toast.info('Usa los filtros para acotar la lectura del reporte')} className="hidden rounded-xl border border-border bg-card p-2.5 text-muted-foreground transition-colors hover:text-foreground sm:block"><Search size={17} /></button><button data-testid="button-notifications" onClick={() => toast.info('No hay alertas nuevas')} className="relative rounded-xl border border-border bg-card p-2.5 text-muted-foreground transition-colors hover:text-foreground"><Bell size={17} /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]" /></button><div className="mx-1 hidden h-7 w-px bg-border sm:block" /><div className="hidden items-center gap-2 sm:flex"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-[11px] font-bold text-[hsl(var(--primary-foreground))]">BI</span><span className="text-xs font-semibold">Gestión Administradores</span></div></div>
          </div>
        </header>
        <div className="px-5 py-7 sm:px-8 lg:px-11 lg:py-9">
          <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div className="animate-rise"><div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[hsl(var(--primary))]"><span className="h-2 w-2 rounded-full bg-[hsl(var(--primary))]" />Reporte Power BI · {meta.label}</div><h1 data-testid="text-page-title" className="font-display max-w-2xl text-[30px] font-bold leading-[1.08] tracking-[-.045em] sm:text-[39px]">{meta.title}</h1><p className="mt-3 max-w-2xl text-[14px] leading-6 text-muted-foreground">{meta.subtitle}</p></div>
            <div className="flex flex-wrap items-center gap-2"><button data-testid="button-refresh" onClick={refresh} className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs font-semibold text-muted-foreground shadow-sm transition hover:text-foreground"><RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />Actualizar</button><button data-testid="button-export" onClick={() => toast.success('Vista preparada para exportar', { description: 'La exportación conservará los filtros activos.' })} className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs font-semibold text-muted-foreground shadow-sm transition hover:text-foreground"><Download size={14} />Exportar</button><button data-testid="button-share" onClick={() => { navigator.clipboard?.writeText(window.location.href); toast.success('Enlace copiado'); }} className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-3.5 py-2.5 text-xs font-semibold text-[hsl(var(--primary-foreground))] shadow-sm transition hover:brightness-110"><Share2 size={14} />Compartir</button></div>
          </div>
          
          {/* AQUÍ LE PASAMOS dbFilters a FilterBar */}
          <FilterBar filters={filters} setFilters={setFilters} showFilters={showFilters} setShowFilters={setShowFilters} resetFilters={resetFilters} dbFilters={dbFilters} />
          
          <div className="mb-6 flex items-center justify-between text-[11px] text-muted-foreground"><span>Actualizado {lastUpdated} · Fuente: modelo local preparado para conectar</span><button data-testid="button-data-definition" onClick={() => toast.info('Meta, proyección y faltante se calculan con los días laborales y el avance del periodo')} className="flex items-center gap-1.5 hover:text-foreground"><CircleHelp size={13} />¿Cómo se calcula?</button></div>
          {isRefreshing ? <LoadingState /> : <DashboardView activeView={activeView} filters={filters} navigate={navigate} />}
        </div>
      </main>
    </div>
  );
}

function FilterBar({ filters, setFilters, showFilters, setShowFilters, resetFilters, dbFilters }: any) {
  // Obtenemos los datos que vinieron de SQL Server
  const periodos = dbFilters?.periodos || ['Cargando...'];
  const asesoresBd = dbFilters?.asesores || [];

  // Lógica dinámica: Filtrar asesores según el Periodo y Agencia que seleccionó el usuario
  const asesoresFiltrados = asesoresBd
    .filter((a: any) => a.Periodo === filters.period)
    .filter((a: any) => {
      if (filters.agency === 'Todas') return true;
      const agenciaObj = catalogoAgencias.find(cat => cat.nombre === filters.agency);
      return a.IdSAgencia === agenciaObj?.id;
    })
    .map((a: any) => a.Asesor);

  const advisorNamesFiltrados = ['Todos', ...new Set(asesoresFiltrados)] as string[];

  const options: { key: keyof Filters; label: string; values: string[] }[] = [
    { key: 'period', label: 'Periodo', values: periodos },
    { key: 'agency', label: 'Agencia', values: nombresAgencias },
    { key: 'advisor', label: 'Asesor', values: advisorNamesFiltrados },
    { key: 'day', label: 'Fecha', values: ['Hoy', 'Ayer', 'Últimos 7 días'] },
  ];

  return (
    <section className="mb-4 rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-center gap-2">
        <button data-testid="button-toggle-filters" onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${showFilters ? 'bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]' : 'text-muted-foreground hover:bg-muted'}`}><Filter size={14} />Filtros</button>
        {showFilters && options.map(({ key, label, values }) => (
          <label key={key} className="relative flex items-center gap-2 rounded-xl border border-border bg-[hsl(var(--background)/.65)] px-3 py-2 text-xs">
            <span className="text-muted-foreground">{label}</span>
            <select data-testid={`select-filter-${key}`} value={filters[key]} onChange={(e) => setFilters((current) => ({ ...current, [key]: e.target.value }))} className="max-w-[155px] cursor-pointer appearance-none bg-transparent pr-4 font-semibold outline-none">
              {values.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-2.5 text-muted-foreground" />
          </label>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button data-testid="button-reset-filters" onClick={resetFilters} className="rounded-lg px-2.5 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground">Limpiar</button>
          <span className="hidden items-center gap-1.5 border-l border-border pl-3 text-[10px] text-muted-foreground md:flex"><span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))]" />Sincronizado</span>
        </div>
      </div>
    </section>
  );
}

function DashboardView({ activeView, filters, navigate }: { activeView: View; filters: Filters; navigate: (view: View) => void }) {
  if (activeView === 'supervision') return <SupervisionAgenciasView navigate={navigate} filters={filters} />;
  if (activeView === 'agencia') return <AgenciaView filters={filters} />;
  if (activeView === 'asesores') return <AsesoresView filters={filters} />;
  
  // 👇 AQUÍ ESTÁ EL ARREGLO: Agregamos filters={filters} 👇
  if (activeView === 'colocaciones') return <ColocacionesView filters={filters} />;
  
  if (activeView === 'diaria') return <PreventivaView filters={filters} />;
  
  return <GerenciaView navigate={navigate} filters={filters} />; 
}

function LoadingState() {
  return <div className="animate-pulse space-y-5"><div className="grid gap-4 sm:grid-cols-3"><div className="h-28 rounded-2xl bg-muted" /><div className="h-28 rounded-2xl bg-muted" /><div className="h-28 rounded-2xl bg-muted" /></div><div className="h-[420px] rounded-2xl bg-muted" /><div className="h-[300px] rounded-2xl bg-muted" /></div>;
}

function Panel({ title, eyebrow, children, action }: { title: string; eyebrow?: string; children: ReactNode; action?: ReactNode }) {
  return <section className="overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6"><div className="mb-5 flex items-start justify-between gap-3"><div><h2 className="font-display text-[17px] font-bold tracking-[-.025em]">{title}</h2>{eyebrow && <p className="mt-1 font-mono text-[9px] uppercase tracking-[.13em] text-muted-foreground">{eyebrow}</p>}</div>{action}</div>{children}</section>;
}

function SectionBand({ children, tone = 'green' }: { children: ReactNode; tone?: 'green' | 'blue' | 'coral' }) {
  const classes = { green: 'bg-[hsl(138_72%_32%)]', blue: 'bg-[hsl(202_76%_31%)]', coral: 'bg-[hsl(16_75%_72%)] text-[hsl(18_40%_20%)]' }[tone];
  return <div className={`rounded-lg px-4 py-2.5 text-center font-display text-[12px] font-bold uppercase tracking-[.08em] text-white shadow-sm ${classes}`}>{children}</div>;
}

function KpiCard({ label, value, note, icon: Icon, tone = 'teal', delta }: { label: string; value: string; note: string; icon: typeof TrendingUp; tone?: 'teal' | 'gold' | 'blue' | 'red'; delta?: string }) {
  const toneClass = { teal: 'bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]', gold: 'bg-[hsl(var(--accent)/.17)] text-[hsl(35_70%_35%)]', blue: 'bg-[hsl(202_62%_45%/.12)] text-[hsl(202_62%_35%)]', red: 'bg-[hsl(var(--destructive)/.1)] text-[hsl(var(--destructive))]' }[tone];
  return <article className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] transition duration-300 hover:-translate-y-1 hover:shadow-lg"><div className="flex items-start justify-between"><div className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneClass}`}><Icon size={17} /></div>{delta && <span className={`flex items-center gap-1 rounded-full px-2 py-1 font-mono text-[10px] font-bold ${delta.startsWith('-') ? 'bg-[hsl(var(--destructive)/.1)] text-[hsl(var(--destructive))]' : 'bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]'}`}>{delta.startsWith('-') ? <ArrowDownRight size={11} /> : <ArrowUpRight size={11} />}{delta}</span>}</div><div className="mt-5 font-mono text-[10px] uppercase tracking-[.12em] text-muted-foreground">{label}</div><div className="metric-number mt-1 text-[29px] font-bold text-foreground">{value}</div><div className="mt-2 text-[11px] text-muted-foreground">{note}</div><div className="absolute -bottom-6 -right-5 h-24 w-24 rounded-full border-[12px] border-[hsl(var(--primary)/.035)]" /></article>;
}

function WorkdayStrip({ periodo }: { periodo: string }) {
  const { data: dias, isLoading } = useQuery({
    queryKey: ['dias-laborales', periodo],
    queryFn: async () => {
      if (!periodo || periodo === 'Cargando...') return null;
      const res = await fetch(`http://localhost:3000/api/dias-laborales/${periodo}`);
      return res.json();
    },
    enabled: !!periodo && periodo !== 'Cargando...'
  });

  if (isLoading || !dias) return <div className="grid gap-3 sm:grid-cols-3"><div className="h-28 rounded-2xl bg-muted animate-pulse" /><div className="h-28 rounded-2xl bg-muted animate-pulse" /><div className="h-28 rounded-2xl bg-muted animate-pulse" /></div>;

  const pctTranscurrido = dias.totales > 0 ? Math.round((dias.transcurridos / dias.totales) * 100) : 0;
  const pctRestante = dias.totales > 0 ? Math.round((dias.restantes / dias.totales) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* 1. Las 3 Tarjetas */}
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard label="Días laborales TOTALES" value={dias.totales.toString()} note={`Periodo ${periodo}`} icon={CalendarDays} tone="blue" />
        <KpiCard label="Días laborales TRANSCURRIDOS" value={dias.transcurridos.toString()} note={`${pctTranscurrido}% del periodo`} icon={Clock3} tone="teal" />
        <KpiCard label="Días laborales RESTANTES" value={dias.restantes.toString()} note={`${pctRestante}% para cerrar la meta`} icon={Target} tone="red" />
      </div>
      
      {/* 2. La Barra de Progreso Continua (Estilo Power BI) */}
      <div className="flex h-3.5 w-full overflow-hidden rounded-full shadow-inner">
        <div 
          className="bg-[hsl(202_76%_45%)] transition-all duration-1000 ease-out" 
          style={{ width: `${pctTranscurrido}%` }} 
          title={`${pctTranscurrido}% transcurrido`}
        />
        <div 
          className="bg-[hsl(220_50%_20%)] transition-all duration-1000 ease-out" 
          style={{ width: `${pctRestante}%` }} 
          title={`${pctRestante}% restante`}
        />
      </div>
    </div>
  );
}

function CompletionBar({ achieved, target, label = 'Cumplimiento porcentual de la meta mensual' }: { achieved: number; target: number; label?: string }) {
  const value = Math.min(100, Math.round((achieved / target) * 100));
  return <div><div className="mb-2 flex items-center justify-between text-[11px]"><span className="text-muted-foreground">{label}</span><strong className="font-mono">{value}%</strong></div><div className="h-3 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full transition-all ${value >= 100 ? 'bg-[hsl(138_72%_32%)]' : value >= 75 ? 'bg-[hsl(var(--accent))]' : 'bg-[hsl(var(--destructive))]'}`} style={{ width: `${value}%` }} /></div><div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground"><span>Logrado {number(achieved)}</span><span>Meta {number(target)}</span></div></div>;
}

function TableShell({ children, minWidth = '900px' }: { children: ReactNode; minWidth?: string }) {
  return <div className="mobile-scroll overflow-x-auto rounded-xl border border-border"><div style={{ minWidth }}>{children}</div></div>;
}

function StatusCell({ value, threshold = 0 }: { value: number; threshold?: number }) {
  const good = value <= threshold;
  return (
    <span 
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-[13px] font-bold ${
        good 
          ? 'bg-[hsl(138_72%_32%/.15)] text-[hsl(138_72%_25%)]' 
          : 'bg-[hsl(var(--destructive)/.12)] text-[hsl(var(--destructive))]'
      }`}
    >
      {good ? <CheckCircle2 size={15} strokeWidth={2.5} /> : <AlertTriangle size={15} strokeWidth={2.5} />}
      {money(value)}
    </span>
  );
}

function HalfGauge({ value, title, color = '#15803d' }: { value: number; title: string; color?: string }) {
  const radius = 80;
  const stroke = 26;
  const normalizedValue = Math.min(Math.max(value, 0), 100);
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (normalizedValue / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-4 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className="relative flex items-end justify-center overflow-hidden" style={{ width: '200px', height: '100px' }}>
        <svg width="200" height="200" className="absolute top-0 transform transition-transform duration-1000">
          {/* Fondo gris */}
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} strokeLinecap="round" />
          {/* Barra de progreso de color */}
          <path 
            d="M 20 100 A 80 80 0 0 1 180 100" 
            fill="none" 
            stroke={color} 
            strokeWidth={stroke} 
            strokeLinecap="round" 
            strokeDasharray={circumference} 
            strokeDashoffset={strokeDashoffset} 
            className="transition-all duration-1000 ease-out" 
          />
        </svg>
        <div className="absolute bottom-1 text-center font-display text-4xl font-bold">{value}%</div>
        <div className="absolute bottom-0 left-2 font-mono text-[10px] text-muted-foreground">0%</div>
        <div className="absolute bottom-0 right-1 font-mono text-[10px] text-muted-foreground">100%</div>
      </div>
    </div>
  );
}
// AQUÍ AGREGAMOS "filters" COMO PARÁMETRO

// 1. Lógica de Drag & Drop para columnas
const ORDEN_INICIAL_COMERCIAL = ['agency', 'cartera', 'crecimiento', 'nroOper', 'desembolsos', 'repagos', 'duracion', 'moraCPP', 'pctMora', 'moraDef', 'crecNeto150'];

function useColumnOrder(initialOrder: string[]) {
  const [order, setOrder] = useState(initialOrder);

  // Detectamos si el usuario movió alguna columna para mostrar el botón de reinicio
  const isModified = JSON.stringify(order) !== JSON.stringify(initialOrder);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('col_id', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necesario para permitir el Drop
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('col_id');
    if (!sourceId || sourceId === targetId) return;

    const sourceIndex = order.indexOf(sourceId);
    const targetIndex = order.indexOf(targetId);

    const newOrder = [...order];
    const [removed] = newOrder.splice(sourceIndex, 1);
    newOrder.splice(targetIndex, 0, removed); // Insertamos en la nueva posición

    setOrder(newOrder);
  };

  const resetOrder = () => setOrder(initialOrder);

  return { order, handleDragStart, handleDragOver, handleDrop, resetOrder, isModified };
}

function GerenciaView({ navigate, filters }: { navigate: (view: View) => void; filters: Filters }) {
  // ============================================================================
  // 1. REGLA DE ORO DE REACT: TODOS LOS HOOKS SIEMPRE VAN ARRIBA
  // ============================================================================
  const [tipoCartera, setTipoCartera] = useState<'comercial' | 'normalizacion'>('comercial');
  const { order, handleDragStart, handleDragOver, handleDrop, resetOrder, isModified } = useColumnOrder(ORDEN_INICIAL_COMERCIAL);

  const { data: indicadoresBD, isLoading, error } = useQuery({
    queryKey: ['indicadores-gerencia', filters.period],
    queryFn: async () => {
      if (!filters.period || filters.period === 'Cargando...') return null;
      const res = await fetch(`http://localhost:3000/api/indicadores-gerencia/${filters.period}`);
      if (!res.ok) throw new Error('Error al cargar indicadores');
      return res.json();
    },
    enabled: !!filters.period && filters.period !== 'Cargando...'
  });

  // ============================================================================
  // 2. PANTALLAS DE CARGA Y ERROR (Después de los Hooks)
  // ============================================================================
  if (isLoading || !indicadoresBD) return <LoadingState />;
  if (error) return <div className="p-5 text-red-500 font-bold border border-red-200 bg-red-50 rounded-xl">Error de conexión al DWH. Verifica la terminal del backend.</div>;

  // ============================================================================
  // 3. FILTROS Y MATEMÁTICAS GLOBALES
  // ============================================================================
  const datosFiltrados = (indicadoresBD.comercial || []).filter((row: any) => 
    filters.agency === 'Todas' ? true : row.agency === filters.agency
  );
  const datosNormalizacion = (indicadoresBD.normalizacion || []).filter((row: any) => 
    filters.agency === 'Todas' ? true : row.agency === filters.agency
  );

  const totalOpLogradas = datosFiltrados.reduce((sum: number, row: any) => sum + Number(row.opAchieved || 0), 0);
  const totalOpMeta = datosFiltrados.reduce((sum: number, row: any) => sum + Number(row.opTarget || 0), 0);
  const pctAvanceOperaciones = totalOpMeta > 0 ? Math.round((totalOpLogradas / totalOpMeta) * 100) : 0;

  const totalMontoLogrado = datosFiltrados.reduce((sum: number, row: any) => sum + Number(row.amountAchieved || 0), 0);
  const totalMontoMeta = datosFiltrados.reduce((sum: number, row: any) => sum + Number(row.amountTarget || 0), 0);
  const pctAvanceMontos = totalMontoMeta > 0 ? Math.round((totalMontoLogrado / totalMontoMeta) * 100) : 0;

  const totCartera = datosFiltrados.reduce((sum: number, row: any) => sum + Number(row.cartera || 0), 0);
  const totCrecimientoBruto = datosFiltrados.reduce((sum: number, row: any) => sum + Number(row.crecimientoBruto || 0), 0);
  const totRepagos = datosFiltrados.reduce((sum: number, row: any) => sum + Number(row.repagos || 0), 0);
  const totMoraCPP = datosFiltrados.reduce((sum: number, row: any) => sum + Number(row.moraCPP_soles || 0), 0);
  const totMoraDeficiente = datosFiltrados.reduce((sum: number, row: any) => sum + Number(row.moraDeficiente_soles || 0), 0);
  const totCrecimientoNeto150 = datosFiltrados.reduce((sum: number, row: any) => sum + Number(row.crecimientoNeto150 || 0), 0);
  const totExcedenteMora = datosFiltrados.reduce((sum: number, row: any) => sum + Number(row.excedente || 0), 0);
  const avgPctMora = totCartera > 0 ? (totMoraCPP / totCartera) * 100 : 0;
  
  const totDuracionPonderada = datosFiltrados.reduce((sum: number, row: any) => sum + (Number(row.duration || 0) * Number(row.opAchieved || 0)), 0);
  const avgDuracion = totalOpLogradas > 0 ? (totDuracionPonderada / totalOpLogradas) : 0;

  const totNormCartera = datosNormalizacion.reduce((sum: number, row: any) => sum + Number(row.cartera || 0), 0);
  const totNormRepagos = datosNormalizacion.reduce((sum: number, row: any) => sum + Number(row.repagos || 0), 0);
  const totNormMoraCPP = datosNormalizacion.reduce((sum: number, row: any) => sum + Number(row.moraCPP_soles || 0), 0);
  const totNormMoraDef = datosNormalizacion.reduce((sum: number, row: any) => sum + Number(row.moraDeficiente_soles || 0), 0);
  const totNormCrecNeto30 = datosNormalizacion.reduce((sum: number, row: any) => sum + Number(row.crecNeto30 || 0), 0);
  const avgNormPctMora = totNormCartera > 0 ? (totNormMoraCPP / totNormCartera) * 100 : 0;

  // ============================================================================
  // 4. DEFINICIÓN DINÁMICA DE COLUMNAS (Usa las matemáticas de arriba)
  // ============================================================================
  const defColumnasComercial = [
    { id: 'agency', header: 'Agencia', align: 'left', cell: (row: any) => <span className="font-semibold">{row.agency}</span>, footer: () => 'Total Comercial' },
    { id: 'cartera', header: 'Cartera', align: 'right', cell: (row: any) => money(row.cartera), footer: () => money(totCartera) },
    { id: 'crecimiento', header: 'Crecimiento', align: 'right', 
      cell: (row: any) => <span className={`font-semibold ${row.crecimientoBruto >= 0 ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--destructive))]'}`}>{row.crecimientoBruto >= 0 ? '+' : ''}{money(row.crecimientoBruto)}</span>, 
      footer: () => <span className={totCrecimientoBruto >= 0 ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--destructive))]'}>{totCrecimientoBruto >= 0 ? '+' : ''}{money(totCrecimientoBruto)}</span> 
    },
    { id: 'nroOper', header: 'Nro Oper', align: 'right', cell: (row: any) => <span className="font-mono bg-[hsl(var(--accent)/.1)] px-1">{row.opAchieved}</span>, footer: () => totalOpLogradas },
    { id: 'desembolsos', header: 'Desembolsos', align: 'right', cell: (row: any) => money(row.amountAchieved), footer: () => money(totalMontoLogrado) },
    { id: 'repagos', header: 'Repagos', align: 'right', cell: (row: any) => money(row.repagos), footer: () => money(totRepagos) },
    { id: 'duracion', header: 'Duración', align: 'right', cell: (row: any) => <span className="font-mono">{Number(row.duration).toFixed(2)}</span>, footer: () => <span className="font-mono">{avgDuracion.toFixed(2)}</span> },
    { id: 'moraCPP', header: 'Mora CPP', align: 'right', cell: (row: any) => <span className={row.cpp > 10 ? 'text-[hsl(var(--destructive))]' : ''}>{money(row.moraCPP_soles)}</span>, footer: () => money(totMoraCPP) },
    { id: 'pctMora', header: '% Mora', align: 'right', cell: (row: any) => <span className={row.cpp > 10 ? 'bg-[hsl(var(--destructive)/.1)] text-[hsl(var(--destructive))] font-bold px-1' : ''}>{Number(row.cpp).toFixed(2)}%</span>, footer: () => `${avgPctMora.toFixed(2)}%` },
    { id: 'moraDef', header: 'Mora Defic.', align: 'right', cell: (row: any) => money(row.moraDeficiente_soles), footer: () => money(totMoraDeficiente) },
    { id: 'crecNeto150', header: 'Crec. Neto 150', align: 'right', 
      cell: (row: any) => <span className={`font-bold ${row.crecimientoNeto150 >= 0 ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--destructive))]'}`}>{row.crecimientoNeto150 >= 0 ? '+' : ''}{money(row.crecimientoNeto150)}</span>, 
      footer: () => <span className={totCrecimientoNeto150 >= 0 ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--destructive))]'}>{totCrecimientoNeto150 >= 0 ? '+' : ''}{money(totCrecimientoNeto150)}</span> 
    }
  ];

  const columnasRender = order.map(id => defColumnasComercial.find(c => c.id === id)!);

  // ============================================================================
  // 5. INTERFAZ VISUAL
  // ============================================================================
  return (
    <div className="space-y-8" key={filters.period}>
      <WorkdayStrip periodo={filters.period} />
      
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Colocación acumulada" value={money(totalMontoLogrado)} note="Logrado a la fecha" icon={TrendingUp} delta={`+${pctAvanceMontos}%`} />
        <KpiCard label="Meta mensual" value={money(totalMontoMeta)} note="Monto objetivo" icon={Target} tone="gold" />
        <KpiCard label="Crecimiento Neto 150" value={money(totCrecimientoNeto150)} note="Variación real del mes" icon={Building2} tone="blue" />
        <KpiCard label="Excedente Mora CPP" value={money(totExcedenteMora)} note="Sobre la meta del 10%" icon={AlertTriangle} tone={totExcedenteMora > 0 ? "red" : "teal"} delta={totExcedenteMora > 0 ? "Excede" : "OK"} />
      </div>

      <SectionBand tone="green">Indicadores de Crecimiento Global</SectionBand>
      <Panel 
        title="Matriz General de Resultados" 
        eyebrow="Flujo, Duración y Riesgo consolidado"
        action={
          isModified && (
            <button onClick={resetOrder} className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm transition hover:text-foreground">
              <RefreshCw size={13} /> Restablecer columnas
            </button>
          )
        }
      >
        <div className="mb-5 flex w-full max-w-sm rounded-lg bg-muted/60 p-1 font-semibold">
          <button onClick={() => setTipoCartera('comercial')} className={`flex-1 rounded-md py-2 text-xs transition-all ${tipoCartera === 'comercial' ? 'bg-white text-[hsl(var(--primary))] shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Cartera Comercial</button>
          <button onClick={() => setTipoCartera('normalizacion')} className={`flex-1 rounded-md py-2 text-xs transition-all ${tipoCartera === 'normalizacion' ? 'bg-white text-[hsl(var(--primary))] shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Cartera Normalización</button>
        </div>

        {tipoCartera === 'comercial' ? (
          <div key="vista-comercial" className="animate-in fade-in zoom-in-95 duration-200">
            <TableShell minWidth="1200px">
              <table className="w-full text-[13px] whitespace-nowrap">
                <thead>
                  <tr className="border-b border-border bg-[hsl(138_72%_32%/.08)]">
                    {columnasRender.map((col) => (
                      <th
                        key={col.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, col.id)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, col.id)}
                        title="Arrastra para mover la columna"
                        className={`px-4 py-3.5 font-bold text-[hsl(138_72%_25%)] cursor-grab active:cursor-grabbing transition-colors hover:bg-[hsl(138_72%_32%/.12)] ${col.align === 'left' ? 'text-left' : 'text-right'}`}
                      >
                        {col.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {datosFiltrados.map((row: any) => (
                    <tr key={row.agency} className="hover:bg-muted/20 transition-colors">
                      {columnasRender.map((col) => (
                        <td key={`${row.agency}-${col.id}`} className={`px-4 py-3 ${col.align === 'left' ? 'text-left' : 'text-right'}`}>
                          {col.cell(row)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border font-bold bg-muted/30">
                    {columnasRender.map((col) => (
                      <td key={`footer-${col.id}`} className={`px-4 py-3 ${col.align === 'left' ? 'text-left' : 'text-right'}`}>
                        {col.footer()}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </TableShell>
          </div>
        ) : (
          <div key="vista-normalizacion" className="animate-in fade-in zoom-in-95 duration-200">
            <TableShell minWidth="1000px">
              <table className="w-full text-[13px] whitespace-nowrap">
                <thead>
                  <tr className="border-b border-border bg-[hsl(138_72%_32%/.08)]">
                    <th className="px-4 py-3.5 text-left font-bold text-[hsl(138_72%_25%)]">Agencia</th>
                    <th className="px-4 py-3.5 text-left font-bold text-[hsl(138_72%_25%)]">Recuperador</th>
                    <th className="px-4 py-3.5 text-right font-bold text-[hsl(138_72%_25%)]">Cartera</th>
                    <th className="px-4 py-3.5 text-right font-bold text-[hsl(138_72%_25%)]">Repagos</th>
                    <th className="px-4 py-3.5 text-right font-bold text-[hsl(138_72%_25%)]">Mora CPP</th>
                    <th className="px-4 py-3.5 text-right font-bold text-[hsl(138_72%_25%)]">Mora Deficiente</th>
                    <th className="px-4 py-3.5 text-right font-bold text-[hsl(138_72%_25%)]">% Mora 9</th>
                    <th className="px-4 py-3.5 text-right font-bold text-[hsl(138_72%_25%)]">Crec. Neto 30</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {datosNormalizacion.map((row: any) => (
                    <tr key={`${row.agency}-${row.recuperador}`} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-semibold text-left">{row.agency}</td>
                      <td className="px-4 py-3 text-left text-muted-foreground">{row.recuperador}</td>
                      <td className="px-4 py-3 text-right">{money(row.cartera)}</td>
                      <td className="px-4 py-3 text-right">{money(row.repagos)}</td>
                      <td className="px-4 py-3 text-right text-[hsl(var(--destructive))]">{money(row.moraCPP_soles)}</td>
                      <td className="px-4 py-3 text-right text-[hsl(var(--destructive))]">{money(row.moraDeficiente_soles)}</td>
                      <td className="px-4 py-3 text-right bg-[hsl(var(--destructive)/.1)] text-[hsl(var(--destructive))] font-bold">{Number(row.pctMora9).toFixed(2)}%</td>
                      <td className="px-4 py-3 text-right font-bold text-[hsl(var(--destructive))]">{money(row.crecNeto30)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border font-bold bg-muted/30">
                    <td className="px-4 py-3 text-left" colSpan={2}>Total Normalización</td>
                    <td className="px-4 py-3 text-right">{money(totNormCartera)}</td>
                    <td className="px-4 py-3 text-right">{money(totNormRepagos)}</td>
                    <td className="px-4 py-3 text-right text-[hsl(var(--destructive))]">{money(totNormMoraCPP)}</td>
                    <td className="px-4 py-3 text-right text-[hsl(var(--destructive))]">{money(totNormMoraDef)}</td>
                    <td className="px-4 py-3 text-right text-[hsl(var(--destructive))]">{avgNormPctMora.toFixed(2)}%</td>
                    <td className="px-4 py-3 text-right text-[hsl(var(--destructive))]">{money(totNormCrecNeto30)}</td>
                  </tr>
                </tfoot>
              </table>
            </TableShell>
          </div>
        )}
      </Panel>

      <SectionBand tone="blue">Avance de Operaciones y Montos</SectionBand>
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="En Cantidad de Colocaciones" eyebrow="Tabla de datos vs Gráfico de avance">
          <div className="grid gap-5 lg:grid-cols-[1.3fr_1.5fr] items-stretch">
            <TableShell minWidth="100%">
              <table className="w-full text-[13px] whitespace-nowrap">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">Agencia</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground">Operac.</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground">Meta</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground">Avance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {datosFiltrados.map((row: any) => (
                    <tr key={row.agency} className="hover:bg-muted/20">
                      <td className="px-3 py-2.5 font-semibold text-left">{row.agency}</td>
                      <td className="px-3 py-2.5 text-right font-mono">{row.opAchieved}</td>
                      <td className="px-3 py-2.5 text-right bg-[hsl(var(--accent)/.15)]">
                        <div className="font-bold text-[14px]">{row.opTarget}</div>
                        {row.opTarget !== row.opTargetBase && row.opTargetBase > 0 && (
                          <div className="text-[11px] text-muted-foreground line-through" title="Meta Base Original">{row.opTargetBase}</div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-[hsl(var(--primary))]">
                        {row.opTarget > 0 ? Math.round((row.opAchieved / row.opTarget) * 100) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border font-bold bg-muted/30">
                    <td className="px-3 py-2.5 text-left">Total</td>
                    <td className="px-3 py-2.5 text-right font-mono">{totalOpLogradas}</td>
                    <td className="px-3 py-2.5 text-right text-[14px]">{totalOpMeta}</td>
                    <td className="px-3 py-2.5 text-right text-[hsl(var(--primary))]">{pctAvanceOperaciones}%</td>
                  </tr>
                </tfoot>
              </table>
            </TableShell>
            <div className="flex flex-col h-full min-h-[350px]">
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={datosFiltrados} margin={{ top: 10, right: 0, left: -25, bottom: 45 }}>
                    <CartesianGrid vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="agency" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="opAchieved" fill="#0284c7" barSize={20} radius={[2, 2, 0, 0]} />
                    <Line type="step" dataKey="opTarget" stroke="#ea580c" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center pb-2">
                <HalfGauge value={pctAvanceOperaciones} title="CUMPLIMIENTO MENSUAL (CANT)" color="#15803d" />
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="En Monto de Colocaciones" eyebrow="Tabla de datos vs Gráfico de avance">
          <div className="grid gap-5 lg:grid-cols-[1.3fr_1.5fr] items-stretch">
            <TableShell minWidth="100%">
              <table className="w-full text-[13px] whitespace-nowrap">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">Agencia</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground">Desembolso</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground">Meta</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground">Avance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {datosFiltrados.map((row: any) => (
                    <tr key={row.agency} className="hover:bg-muted/20">
                      <td className="px-3 py-2.5 font-semibold text-left">{row.agency}</td>
                      <td className="px-3 py-2.5 text-right">{money(row.amountAchieved)}</td>
                      <td className="px-3 py-2.5 text-right bg-[hsl(var(--accent)/.15)]">
                        <div className="font-bold text-[14px]">{money(row.amountTarget)}</div>
                        {row.amountTarget !== row.amountTargetBase && row.amountTargetBase > 0 && (
                          <div className="text-[11px] text-muted-foreground line-through" title="Meta Base Original">{money(row.amountTargetBase)}</div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-[hsl(var(--primary))]">
                        {row.amountTarget > 0 ? Math.round((row.amountAchieved / row.amountTarget) * 100) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border font-bold bg-muted/30">
                    <td className="px-3 py-2.5 text-left">Total</td>
                    <td className="px-3 py-2.5 text-right">{money(totalMontoLogrado)}</td>
                    <td className="px-3 py-2.5 text-right text-[14px]">{money(totalMontoMeta)}</td>
                    <td className="px-3 py-2.5 text-right text-[hsl(var(--primary))]">{pctAvanceMontos}%</td>
                  </tr>
                </tfoot>
              </table>
            </TableShell>
            <div className="flex flex-col h-full min-h-[350px]">
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={datosFiltrados} margin={{ top: 10, right: 0, left: 10, bottom: 45 }}>
                    <CartesianGrid vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="agency" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" interval={0} />
                    <YAxis tickFormatter={v => `${v / 1000}k`} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => money(v)} />
                    <Bar dataKey="amountAchieved" fill="#0369a1" barSize={20} radius={[2, 2, 0, 0]} />
                    <Line type="step" dataKey="amountTarget" stroke="#ea580c" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center pb-2">
                <HalfGauge value={pctAvanceMontos} title="CUMPLIMIENTO MENSUAL (S/)" color="#15803d" />
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <SectionBand tone="coral">Calidad de Cartera y Moras</SectionBand>
      <div className="grid gap-5 xl:grid-cols-[1.15fr_1fr] items-stretch">
        <Panel title="Mora CPP - Detalle" eyebrow="Excedentes y variaciones en tabla">
          <TableShell minWidth="100%">
            <table className="w-full text-[13px] whitespace-nowrap">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Agencia</th>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Mora CPP</th>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground">% Vigente</th>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Meta</th>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Excedente (S/)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {datosFiltrados.map((row: any) => (
                  <tr key={row.agency} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-semibold text-left">{row.agency}</td>
                    <td className="px-4 py-3 text-right">{money(row.moraCPP_soles)}</td>
                    <td className={`px-4 py-3 text-right ${row.cpp > 10 ? 'text-[hsl(var(--destructive))] font-bold' : ''}`}>{Number(row.cpp).toFixed(2)}%</td>
                    <td className="px-4 py-3 text-right bg-[hsl(var(--accent)/.15)]">{row.meta}%</td>
                    <td className={`px-4 py-3 text-right font-bold ${row.excedente > 0 ? 'text-[hsl(var(--destructive))]' : 'text-green-600'}`}>
                      {row.excedente > 0 ? '+' : ''}{money(row.excedente)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border font-bold bg-muted/30">
                  <td className="px-4 py-3 text-left">Total</td>
                  <td className="px-4 py-3 text-right">{money(totMoraCPP)}</td>
                  <td className="px-4 py-3 text-right">{avgPctMora.toFixed(2)}%</td>
                  <td className="px-4 py-3 text-right">10%</td>
                  <td className={`px-4 py-3 text-right ${totExcedenteMora > 0 ? 'text-[hsl(var(--destructive))]' : 'text-green-600'}`}>
                    {totExcedenteMora > 0 ? '+' : ''}{money(totExcedenteMora)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </TableShell>
        </Panel>

        <Panel title="Curva de Cumplimiento Mora CPP" eyebrow="Ordenado por % de Mora">
          <div className="w-full h-[620px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={[...datosFiltrados].sort((a, b) => Number(a.cpp) - Number(b.cpp))} margin={{ top: 20, right: 10, left: -20, bottom: 45 }}>
                <defs>
                  <linearGradient id="colorCpp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="4 4" />
                <XAxis dataKey="agency" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" interval={0} />
                <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Line type="monotone" dataKey="meta" name="Meta 10%" stroke="#dc2626" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                <Area type="monotone" dataKey="cpp" name="% Mora CPP" stroke="#0284c7" strokeWidth={3} fillOpacity={1} fill="url(#colorCpp)" dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6, fill: '#0284c7' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Signal({ icon: Icon, title, text, tone }: { icon: typeof TrendingUp; title: string; text: string; tone: 'good' | 'bad' | 'warn' }) {
  const classes = { good: 'bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]', bad: 'bg-[hsl(var(--destructive)/.1)] text-[hsl(var(--destructive))]', warn: 'bg-[hsl(var(--accent)/.17)] text-[hsl(35_70%_35%)]' }[tone];
  return <div className="flex items-start gap-3 rounded-xl p-2.5 transition hover:bg-muted"><div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${classes}`}><Icon size={15} /></div><div><div className="text-xs font-semibold">{title}</div><div className="mt-0.5 text-[11px] leading-5 text-muted-foreground">{text}</div></div></div>;
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-muted/70 p-3"><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div><div className="mt-2 font-display text-lg font-bold">{value}</div></div>;
}

function SupervisionAgenciasView({ navigate, filters }: { navigate: (view: View) => void; filters: Filters }) {
  const { data: supervisionBD, isLoading, error } = useQuery({
    queryKey: ['indicadores-supervision', filters.period],
    queryFn: async () => {
      if (!filters.period || filters.period === 'Cargando...') return null;
      const res = await fetch(`http://localhost:3000/api/supervision/${filters.period}`);
      if (!res.ok) throw new Error('Error al cargar supervisión');
      return res.json();
    },
    enabled: !!filters.period && filters.period !== 'Cargando...'
  });

  if (isLoading || !supervisionBD) return <LoadingState />;
  if (error) return <div className="p-5 text-red-500 font-bold border border-red-200 bg-red-50 rounded-xl">Error de conexión al DWH. Verifica la terminal del backend.</div>;

  const filterByAgency = (arr: any[]) => filters.agency === 'Todas' ? arr : arr.filter((r: any) => r.agency === filters.agency);
  const sum = (arr: any[], key: string) => arr.reduce((acc, row) => acc + Number(row[key] || 0), 0);
  const wAvg = (arr: any[], valKey: string, weightKey: string) => {
    const totalWeight = sum(arr, weightKey);
    if (totalWeight === 0) return 0;
    const sumProduct = arr.reduce((acc, row) => acc + (Number(row[valKey] || 0) * Number(row[weightKey] || 0)), 0);
    return sumProduct / totalWeight;
  };

  const dataCompleta = filterByAgency(supervisionBD.completa || []);
  const dataComercial = filterByAgency(supervisionBD.comercial || []);
  const dataRecuperacion = filterByAgency(supervisionBD.recuperacion || []);

  // TOTALES: TABLA COMPLETA
  const t1_crecNeto = sum(dataCompleta, 'crecimientoNeto150');
  const t1_tea = wAvg(dataCompleta, 'tea', 'amountAchieved');
  const t1_metaOp = sum(dataCompleta, 'opTarget');
  const t1_nroOp = sum(dataCompleta, 'opAchieved');
  const t1_plazo = wAvg(dataCompleta, 'plazo', 'opAchieved');
  const t1_socInicio = sum(dataCompleta, 'sociosInicio');
  const t1_socActual = sum(dataCompleta, 'sociosActual');
  const t1_colocacion = sum(dataCompleta, 'amountAchieved');
  const t1_cartera = sum(dataCompleta, 'cartera');
  const t1_moraCppMax = sum(dataCompleta, 'moraCppMax');
  const t1_moraCppAct = sum(dataCompleta, 'moraCppActual');
  const t1_moraDefMax = sum(dataCompleta, 'moraDefMax');
  const t1_moraDefAct = sum(dataCompleta, 'moraDefActual');
  const t1_repagos = sum(dataCompleta, 'repagos');

  // TOTALES: TABLA COMERCIAL
  const t2_crecNeto = sum(dataComercial, 'crecimientoNeto150');
  const t2_tea = wAvg(dataComercial, 'tea', 'amountAchieved');
  const t2_metaOp = sum(dataComercial, 'opTarget');
  const t2_nroOp = sum(dataComercial, 'opAchieved');
  const t2_plazo = wAvg(dataComercial, 'plazo', 'opAchieved');
  const t2_socInicio = sum(dataComercial, 'sociosInicio');
  const t2_socActual = sum(dataComercial, 'sociosActual');
  const t2_colocacion = sum(dataComercial, 'amountAchieved');
  const t2_cartera = sum(dataComercial, 'cartera');
  const t2_moraCppMax = sum(dataComercial, 'moraCppMax');
  const t2_moraCppAct = sum(dataComercial, 'moraCppActual');
  const t2_pctMoraCpp = t2_cartera > 0 ? (t2_moraCppAct / t2_cartera) * 100 : 0;
  const t2_moraDefMax = sum(dataComercial, 'moraDefMax');
  const t2_moraDefAct = sum(dataComercial, 'moraDefActual');
  const t2_repagos = sum(dataComercial, 'repagos');
  const t2_pctMoraDef = t2_cartera > 0 ? (t2_moraDefAct / t2_cartera) * 100 : 0;
  const t2_carteraFin = sum(dataComercial, 'carteraFin');
  const t2_pctMoraCppCf = t2_carteraFin > 0 ? (t2_moraCppAct / t2_carteraFin) * 100 : 0;
  const t2_pctMoraDefCf = t2_carteraFin > 0 ? (t2_moraDefAct / t2_carteraFin) * 100 : 0;

  // TOTALES: TABLA RECUPERACIÓN
  const t3_crecNeto = sum(dataRecuperacion, 'crecimientoNeto150');
  const t3_cartInicio = sum(dataRecuperacion, 'carteraInicio');
  const t3_moraCppMax = sum(dataRecuperacion, 'moraCppMax');
  const t3_moraCppAct = sum(dataRecuperacion, 'moraCppActual');
  const t3_moraDefMax = sum(dataRecuperacion, 'moraDefMax');
  const t3_moraDefAct = sum(dataRecuperacion, 'moraDefActual');
  const t3_repagos = sum(dataRecuperacion, 'repagos');

  // Clase para el color crema/naranja de las columnas destacadas (como en Power BI)
  const colDestacada = "bg-[hsl(35_80%_50%/.15)]";

  return (
    <div className="space-y-6" key={`${filters.period}-${filters.agency}`}>
      
      {/* ========================================================= */}
      {/* 1. AGENCIA COMPLETA                                       */}
      {/* ========================================================= */}
      <SectionBand tone="blue">Agencia Completa: Comercial + Recuperadores</SectionBand>
      <Panel title="Indicadores por agencia" eyebrow="Crecimiento Neto 150 · Cartera y Mora" action={<button onClick={() => navigate('agencia')} className="text-xs font-semibold text-[hsl(var(--primary))] hover:underline">Abrir detalle →</button>}>
        <TableShell minWidth="1800px">
          <table className="w-full text-[13px] whitespace-nowrap">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3.5 text-left font-bold text-muted-foreground">Agencia</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Crecimiento Neto 150</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">TEA</th>
                <th className={`px-4 py-3.5 text-right font-bold text-muted-foreground ${colDestacada}`}>Meta Ope</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Nro Ope</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Plazo</th>
                <th className={`px-4 py-3.5 text-right font-bold text-muted-foreground ${colDestacada}`}>Nro Socios de Inicio</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Nro Socios</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Colocación</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Cartera</th>
                <th className={`px-4 py-3.5 text-right font-bold text-muted-foreground ${colDestacada}`}>Mora CPP Máximo</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Mora CPP Actual</th>
                <th className={`px-4 py-3.5 text-right font-bold text-muted-foreground ${colDestacada}`}>Mora Deficiente Máximo</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Mora deficiente real</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Repagos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {dataCompleta.map((r: any) => (
                <tr key={r.agency} onClick={() => navigate('agencia')} className="cursor-pointer hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-bold text-left">{r.agency}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${r.crecimientoNeto150 < 0 ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--primary))]'}`}>
                    {r.crecimientoNeto150 >= 0 ? '+' : ''}{money(r.crecimientoNeto150)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{Number(r.tea).toFixed(2)}</td>
                  <td className={`px-4 py-3 text-right font-mono font-semibold ${colDestacada}`}>{r.opTarget}</td>
                  <td className="px-4 py-3 text-right font-mono">{r.opAchieved}</td>
                  <td className="px-4 py-3 text-right font-mono text-[hsl(138_72%_35%)]">{Number(r.plazo).toFixed(2)}</td>
                  <td className={`px-4 py-3 text-right font-mono font-semibold ${colDestacada}`}>{number(r.sociosInicio)}</td>
                  <td className="px-4 py-3 text-right font-mono text-[hsl(138_72%_35%)]">{number(r.sociosActual)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{money(r.amountAchieved)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{money(r.cartera)}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${colDestacada}`}>{money(r.moraCppMax)}</td>
                  <td className="px-4 py-3 text-right"><StatusCell value={r.moraCppActual} threshold={r.moraCppMax} /></td>
                  <td className={`px-4 py-3 text-right font-semibold ${colDestacada}`}>{money(r.moraDefMax)}</td>
                  <td className="px-4 py-3 text-right"><StatusCell value={r.moraDefActual} threshold={r.moraDefMax} /></td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{money(r.repagos)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border font-bold bg-muted/40">
                <td className="px-4 py-3 text-left">Total</td>
                <td className={`px-4 py-3 text-right ${t1_crecNeto < 0 ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--primary))]'}`}>
                  {t1_crecNeto >= 0 ? '+' : ''}{money(t1_crecNeto)}
                </td>
                <td className="px-4 py-3 text-right font-mono">{t1_tea.toFixed(2)}</td>
                <td className={`px-4 py-3 text-right font-mono ${colDestacada}`}>{t1_metaOp}</td>
                <td className="px-4 py-3 text-right font-mono">{t1_nroOp}</td>
                <td className="px-4 py-3 text-right font-mono text-[hsl(138_72%_35%)]">{t1_plazo.toFixed(2)}</td>
                <td className={`px-4 py-3 text-right font-mono ${colDestacada}`}>{number(t1_socInicio)}</td>
                <td className="px-4 py-3 text-right font-mono text-[hsl(138_72%_35%)]">{number(t1_socActual)}</td>
                <td className="px-4 py-3 text-right font-mono">{money(t1_colocacion)}</td>
                <td className="px-4 py-3 text-right font-mono">{money(t1_cartera)}</td>
                <td className={`px-4 py-3 text-right ${colDestacada}`}>{money(t1_moraCppMax)}</td>
                <td className="px-4 py-3 text-right font-mono"><StatusCell value={t1_moraCppAct} threshold={t1_moraCppMax} /></td>
                <td className={`px-4 py-3 text-right font-mono ${colDestacada}`}>{money(t1_moraDefMax)}</td>
                <td className="px-4 py-3 text-right font-mono"><StatusCell value={t1_moraDefAct} threshold={t1_moraDefMax} /></td>
                <td className="px-4 py-3 text-right font-mono">{money(t1_repagos)}</td>
              </tr>
            </tfoot>
          </table>
        </TableShell>
      </Panel>

      {/* ========================================================= */}
      {/* 2. AGENCIA COMERCIAL                                        */}
      {/* ========================================================= */}
      <SectionBand tone="green">Agencias - Parte Comercial</SectionBand>
      <Panel title="Indicadores por agencia" eyebrow="Analistas y Administradores">
        <TableShell minWidth="2400px">
          <table className="w-full text-[13px] whitespace-nowrap">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3.5 text-left font-bold text-muted-foreground">Agencia</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Crecimiento Neto 150</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">TEA</th>
                <th className={`px-4 py-3.5 text-right font-bold text-muted-foreground ${colDestacada}`}>Meta Ope</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Nro Ope</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Plazo</th>
                <th className={`px-4 py-3.5 text-right font-bold text-muted-foreground ${colDestacada}`}>Nro Socios de Inicio</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Nro Socios</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Colocación</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Cartera</th>
                <th className={`px-4 py-3.5 text-right font-bold text-muted-foreground ${colDestacada}`}>Mora Piso Maximo</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Mora Piso Actual</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">% Mora Piso</th>
                <th className={`px-4 py-3.5 text-right font-bold text-muted-foreground ${colDestacada}`}>Mora Deficiente Maximo</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Mora deficiente real</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Repagos</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">% Mora deficiente</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">M M Cartera Fin</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">% mora piso cf</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Mora deficiente cf</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {dataComercial.map((r: any) => (
                <tr key={r.agency} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-bold text-left">{r.agency}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${r.crecimientoNeto150 < 0 ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--primary))]'}`}>
                    {r.crecimientoNeto150 >= 0 ? '+' : ''}{money(r.crecimientoNeto150)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{Number(r.tea).toFixed(2)}</td>
                  <td className={`px-4 py-3 text-right font-mono font-semibold ${colDestacada}`}>{r.opTarget}</td>
                  <td className="px-4 py-3 text-right font-mono">{r.opAchieved}</td>
                  <td className="px-4 py-3 text-right font-mono text-[hsl(138_72%_35%)]">{Number(r.plazo).toFixed(2)}</td>
                  <td className={`px-4 py-3 text-right font-mono font-semibold ${colDestacada}`}>{number(r.sociosInicio)}</td>
                  <td className="px-4 py-3 text-right font-mono text-[hsl(138_72%_35%)]">{number(r.sociosActual)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{money(r.amountAchieved)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{money(r.cartera)}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${colDestacada}`}>{money(r.moraCppMax)}</td>
                  <td className="px-4 py-3 text-right"><StatusCell value={r.moraCppActual} threshold={r.moraCppMax} /></td>
                  <td className="px-4 py-3 text-right font-mono">{Number(r.pctMoraCpp).toFixed(2)}%</td>
                  <td className={`px-4 py-3 text-right font-semibold ${colDestacada}`}>{money(r.moraDefMax)}</td>
                  <td className="px-4 py-3 text-right"><StatusCell value={r.moraDefActual} threshold={r.moraDefMax} /></td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{money(r.repagos)}</td>
                  <td className="px-4 py-3 text-right font-mono">{Number(r.pctMoraDef).toFixed(2)}%</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{money(r.carteraFin)}</td>
                  <td className="px-4 py-3 text-right font-mono">{Number(r.pctMoraCppCf).toFixed(2)}%</td>
                  <td className="px-4 py-3 text-right font-mono">{Number(r.pctMoraDefCf).toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border font-bold bg-muted/40">
                <td className="px-4 py-3 text-left">Total</td>
                <td className={`px-4 py-3 text-right ${t2_crecNeto < 0 ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--primary))]'}`}>
                  {t2_crecNeto >= 0 ? '+' : ''}{money(t2_crecNeto)}
                </td>
                <td className="px-4 py-3 text-right font-mono">{t2_tea.toFixed(2)}</td>
                <td className={`px-4 py-3 text-right font-mono ${colDestacada}`}>{t2_metaOp}</td>
                <td className="px-4 py-3 text-right font-mono">{t2_nroOp}</td>
                <td className="px-4 py-3 text-right font-mono text-[hsl(138_72%_35%)]">{t2_plazo.toFixed(2)}</td>
                <td className={`px-4 py-3 text-right font-mono ${colDestacada}`}>{number(t2_socInicio)}</td>
                <td className="px-4 py-3 text-right font-mono text-[hsl(138_72%_35%)]">{number(t2_socActual)}</td>
                <td className="px-4 py-3 text-right font-mono">{money(t2_colocacion)}</td>
                <td className="px-4 py-3 text-right font-mono">{money(t2_cartera)}</td>
                <td className={`px-4 py-3 text-right font-mono ${colDestacada}`}>{money(t2_moraCppMax)}</td>
                <td className="px-4 py-3 text-right font-mono"><StatusCell value={t2_moraCppAct} threshold={t2_moraCppMax} /></td>
                <td className="px-4 py-3 text-right font-mono">{t2_pctMoraCpp.toFixed(2)}%</td>
                <td className={`px-4 py-3 text-right font-mono ${colDestacada}`}>{money(t2_moraDefMax)}</td>
                <td className="px-4 py-3 text-right font-mono"><StatusCell value={t2_moraDefAct} threshold={t2_moraDefMax} /></td>
                <td className="px-4 py-3 text-right font-mono">{money(t2_repagos)}</td>
                <td className="px-4 py-3 text-right font-mono">{t2_pctMoraDef.toFixed(2)}%</td>
                <td className="px-4 py-3 text-right font-mono">{money(t2_carteraFin)}</td>
                <td className="px-4 py-3 text-right font-mono">{t2_pctMoraCppCf.toFixed(2)}%</td>
                <td className="px-4 py-3 text-right font-mono">{t2_pctMoraDefCf.toFixed(2)}%</td>
              </tr>
            </tfoot>
          </table>
        </TableShell>
      </Panel>

      {/* ========================================================= */}
      {/* 3. RECUPERADORES                                          */}
      {/* ========================================================= */}
      <SectionBand tone="coral">Agencias - Parte Recuperación</SectionBand>
      <Panel title="Recuperación por agencia" eyebrow="Cartera de inicio, mora deficiente y repagos">
        <TableShell minWidth="1200px">
          <table className="w-full text-[13px] whitespace-nowrap">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3.5 text-left font-bold text-muted-foreground">Agencia</th>
                <th className="px-4 py-3.5 text-left font-bold text-muted-foreground">Recuperador</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Crecimiento Neto 150</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Cartera de Inicio</th>
                <th className={`px-4 py-3.5 text-right font-bold text-muted-foreground ${colDestacada}`}>Mora CPP Máximo</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Mora CPP Actual</th>
                <th className={`px-4 py-3.5 text-right font-bold text-muted-foreground ${colDestacada}`}>Mora Deficiente Maximo</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Mora deficiente real</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Repagos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {dataRecuperacion.map((r: any) => (
                <tr key={`${r.agency}-${r.recuperador}`} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-bold text-left">{r.agency}</td>
                  <td className="px-4 py-3 text-left text-muted-foreground">{r.recuperador}</td>
                  <td className="px-4 py-3 text-right font-semibold text-[hsl(var(--destructive))]">
                    -{money(Math.abs(r.crecimientoNeto150))}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{money(r.carteraInicio)}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${colDestacada}`}>{money(r.moraCppMax)}</td>
                  <td className="px-4 py-3 text-right"><StatusCell value={r.moraCppActual} threshold={r.moraCppMax} /></td>
                  <td className={`px-4 py-3 text-right font-semibold ${colDestacada}`}>{money(r.moraDefMax)}</td>
                  <td className="px-4 py-3 text-right"><StatusCell value={r.moraDefActual} threshold={r.moraDefMax} /></td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{money(r.repagos)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border font-bold bg-muted/40">
                <td className="px-4 py-3 text-left font-mono" colSpan={2}>Total</td>
                <td className="px-4 py-3 text-right text-[hsl(var(--destructive))]">-{money(Math.abs(t3_crecNeto))}</td>
                <td className="px-4 py-3 text-right font-mono">{money(t3_cartInicio)}</td>
                <td className={`px-4 py-3 text-right font-mono ${colDestacada}`}>{money(t3_moraCppMax)}</td>
                <td className="px-4 py-3 text-right font-mono"><StatusCell value={t3_moraCppAct} threshold={t3_moraCppMax} /></td>
                <td className={`px-4 py-3 text-right font-mono ${colDestacada}`}>{money(t3_moraDefMax)}</td>
                <td className="px-4 py-3 text-right font-mono"><StatusCell value={t3_moraDefAct} threshold={t3_moraDefMax} /></td>
                <td className="px-4 py-3 text-right font-mono">{money(t3_repagos)}</td>
              </tr>
            </tfoot>
          </table>
        </TableShell>
      </Panel>
    </div>
  );
}

function AgenciaView({ filters }: { filters: Filters }) {
  const { data: agenciaBD, isLoading, error } = useQuery({
    queryKey: ['indicadores-agencia', filters.period],
    queryFn: async () => {
      if (!filters.period || filters.period === 'Cargando...') return null;
      const res = await fetch(`http://localhost:3000/api/agencia/${filters.period}`);
      if (!res.ok) throw new Error('Error al cargar agencia');
      return res.json();
    },
    enabled: !!filters.period && filters.period !== 'Cargando...'
  });

  if (isLoading || !agenciaBD) return <LoadingState />;
  if (error) return <div className="p-5 text-red-500 font-bold border border-red-200 bg-red-50 rounded-xl">Error de conexión al DWH.</div>;

  const agenciaNombre = filters.agency === 'Todas' ? 'TODA LA RED' : filters.agency.toUpperCase();

  // ==========================================
  // 1. APLICAR FILTROS (Agencia y Asesor)
  // ==========================================
  const filterByAgency = (arr: any[]) => filters.agency === 'Todas' ? arr : arr.filter((r: any) => r.agency === filters.agency);
  
  let dataComercial = filterByAgency(agenciaBD.comercial || []);
  let dataRecuperacion = filterByAgency(agenciaBD.recuperacion || []);
  const dataResumen = filterByAgency(agenciaBD.resumen || []);

  // MAGIA AQUÍ: Si hay un asesor seleccionado, filtramos las tablas para que solo quede él.
  if (filters.advisor !== 'Todos') {
    dataComercial = dataComercial.filter((r: any) => r.asesor === filters.advisor);
    dataRecuperacion = dataRecuperacion.filter((r: any) => r.recuperador === filters.advisor);
  }

  // ==========================================
  // 2. FUNCIONES MATEMÁTICAS
  // ==========================================
  const sum = (arr: any[], key: string) => arr.reduce((acc, row) => acc + Number(row[key] || 0), 0);
  const wAvg = (arr: any[], valKey: string, weightKey: string) => {
    const totalWeight = sum(arr, weightKey);
    if (totalWeight === 0) return 0;
    const sumProduct = arr.reduce((acc, row) => acc + (Number(row[valKey] || 0) * Number(row[weightKey] || 0)), 0);
    return sumProduct / totalWeight;
  };

  // TOTALES PARA KPIs y BARRAS (Cabecera)
  const totCrecNeto = sum(dataComercial, 'crecimientoNeto150');
  const totColocacion = sum(dataComercial, 'amountAchieved');
  const totCartera = sum(dataComercial, 'cartera');
  const totMoraCppAct = sum(dataComercial, 'moraCppActual');
  const totMoraCppMax = sum(dataComercial, 'moraCppMax');
  const totMoraDefMax = sum(dataComercial, 'moraDefMax');
  const totMoraDefAct = sum(dataComercial, 'moraDefActual');
  
  // TOTALES PARA DESEMPEÑO
  const totRepagos = sum(dataComercial, 'repagos');
  const totOpAchieved = sum(dataComercial, 'opAchieved');
  const totSociosAct = sum(dataComercial, 'sociosActual');
  const totSociosIni = sum(dataComercial, 'sociosInicio');
  const totOpTarget = sum(dataResumen, 'opTarget');

  // TOTALES PARA TABLA RECUPERACIÓN
  const totRecCrecNeto = sum(dataRecuperacion, 'crecimientoNeto150');
  const totRecRepagos = sum(dataRecuperacion, 'repagos');
  const totRecCartInicio = sum(dataRecuperacion, 'carteraInicio');
  const totRecMoraCppMax = sum(dataRecuperacion, 'moraCppMax');
  const totRecMoraCppAct = sum(dataRecuperacion, 'moraCppActual');
  const totRecMoraDefMax = sum(dataRecuperacion, 'moraDefMax');
  const totRecMoraDefAct = sum(dataRecuperacion, 'moraDefActual');

  const colDestacada = "bg-[hsl(35_80%_50%/.15)]";

  return (
    // Agregamos filters.advisor al KEY para que React reconstruya la vista sin errores visuales al cambiar de asesor
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200" key={`${filters.period}-${filters.agency}-${filters.advisor}`}>
      
      {/* 1. SECCIÓN KPIs COMERCIALES */}
      <SectionBand tone="blue">{agenciaNombre} · PARTE COMERCIAL {filters.advisor !== 'Todos' && `(${filters.advisor})`}</SectionBand>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Crecimiento neto 150" value={money(totCrecNeto)} note="Variación de cartera" icon={TrendingUp} delta={totCrecNeto >= 0 ? 'Positivo' : 'Negativo'} tone={totCrecNeto >= 0 ? 'teal' : 'red'} />
        <KpiCard label="Colocación" value={money(totColocacion)} note={`${number(totOpAchieved)} operaciones`} icon={BarChart3} tone="gold" />
        <KpiCard label="Cartera" value={money(totCartera)} note="Saldo vigente" icon={Building2} tone="blue" />
        <KpiCard label="Mora CPP Real" value={money(totMoraCppAct)} note={`Máximo ${money(totMoraCppMax)}`} icon={AlertTriangle} tone={totMoraCppAct > totMoraCppMax ? 'red' : 'teal'} />
      </div>

      <Panel title={filters.advisor === 'Todos' ? `Desempeño de ${agenciaNombre}` : `Desempeño de ${filters.advisor}`} eyebrow="Comercial · periodo seleccionado">
        <div className="grid gap-4 md:grid-cols-3">
          <MiniMetric label="Repagos" value={money(totRepagos)} />
          <MiniMetric label="Nro. operaciones" value={number(totOpAchieved)} />
          <MiniMetric label="Nro. socios" value={number(totSociosAct)} />
        </div>
        <div className="mt-6">
          {/* Si se elige a un asesor, la barra medirá sus operaciones contra la meta TOTAL de la agencia para ver su peso en ella */}
          <CompletionBar achieved={totOpAchieved} target={totOpTarget} label={filters.advisor === 'Todos' ? "Cumplimiento de operaciones frente a meta de agencia" : "Aporte de operaciones a la meta de la agencia"} />
        </div>
      </Panel>

      {/* 2. TABLA ASESORES COMERCIALES */}
      <Panel title="Indicadores por Asesor" eyebrow="Asesores comerciales asignados">
        <TableShell minWidth="1800px">
          <table className="w-full text-[13px] whitespace-nowrap">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3.5 text-left font-bold text-muted-foreground">Asesor</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Crecimiento Neto 150</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Colocación</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Repagos</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">TEA</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Nro Ope</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Plazo</th>
                <th className={`px-4 py-3.5 text-right font-bold text-muted-foreground ${colDestacada}`}>Nro Socios de Inicio</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Nro Socios</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Cartera</th>
                <th className={`px-4 py-3.5 text-right font-bold text-muted-foreground ${colDestacada}`}>Mora CPP Máximo</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Mora Piso Actual</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">% Mora Piso</th>
                <th className={`px-4 py-3.5 text-right font-bold text-muted-foreground ${colDestacada}`}>Mora Deficiente Máximo</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Mora Deficiente Actual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {dataComercial.map((r: any) => (
                <tr key={r.asesor} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-semibold text-left">{r.asesor}</td>
                  <td className={`px-4 py-3 text-right font-bold ${r.crecimientoNeto150 < 0 ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--primary))]'}`}>
                    {r.crecimientoNeto150 >= 0 ? '+' : ''}{money(r.crecimientoNeto150)}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{money(r.amountAchieved)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{money(r.repagos)}</td>
                  <td className="px-4 py-3 text-right font-mono">{Number(r.tea).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-mono text-[hsl(138_72%_35%)]">{r.opAchieved}</td>
                  <td className="px-4 py-3 text-right font-mono text-[hsl(138_72%_35%)]">{Number(r.plazo).toFixed(2)}</td>
                  <td className={`px-4 py-3 text-right font-mono ${colDestacada}`}>{number(r.sociosInicio)}</td>
                  <td className="px-4 py-3 text-right font-mono text-[hsl(138_72%_35%)]">{number(r.sociosActual)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{money(r.cartera)}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${colDestacada}`}>{money(r.moraCppMax)}</td>
                  <td className="px-4 py-3 text-right"><StatusCell value={r.moraCppActual} threshold={r.moraCppMax} /></td>
                  <td className="px-4 py-3 text-right font-mono">{Number(r.pctMoraCpp).toFixed(2)}%</td>
                  <td className={`px-4 py-3 text-right font-semibold ${colDestacada}`}>{money(r.moraDefMax)}</td>
                  <td className="px-4 py-3 text-right"><StatusCell value={r.moraDefActual} threshold={r.moraDefMax} /></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border font-bold bg-muted/40">
                <td className="px-4 py-3 text-left">Total</td>
                <td className={`px-4 py-3 text-right ${totCrecNeto < 0 ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--primary))]'}`}>
                  {totCrecNeto >= 0 ? '+' : ''}{money(totCrecNeto)}
                </td>
                <td className="px-4 py-3 text-right">{money(totColocacion)}</td>
                <td className="px-4 py-3 text-right">{money(totRepagos)}</td>
                <td className="px-4 py-3 text-right font-mono">{wAvg(dataComercial, 'tea', 'amountAchieved').toFixed(2)}</td>
                <td className="px-4 py-3 text-right font-mono text-[hsl(138_72%_35%)]">{totOpAchieved}</td>
                <td className="px-4 py-3 text-right font-mono text-[hsl(138_72%_35%)]">{wAvg(dataComercial, 'plazo', 'opAchieved').toFixed(2)}</td>
                <td className={`px-4 py-3 text-right font-mono ${colDestacada}`}>{number(totSociosIni)}</td>
                <td className="px-4 py-3 text-right font-mono text-[hsl(138_72%_35%)]">{number(totSociosAct)}</td>
                <td className="px-4 py-3 text-right">{money(totCartera)}</td>
                <td className={`px-4 py-3 text-right font-semibold ${colDestacada}`}>{money(totMoraCppMax)}</td>
                <td className="px-4 py-3 text-right"><StatusCell value={totMoraCppAct} threshold={totMoraCppMax} /></td>
                <td className="px-4 py-3 text-right font-mono">{(totCartera > 0 ? (totMoraCppAct / totCartera) * 100 : 0).toFixed(2)}%</td>
                <td className={`px-4 py-3 text-right font-semibold ${colDestacada}`}>{money(totMoraDefMax)}</td>
                <td className="px-4 py-3 text-right"><StatusCell value={totMoraDefAct} threshold={totMoraDefMax} /></td>
              </tr>
            </tfoot>
          </table>
        </TableShell>
      </Panel>

      {/* 3. SECCIÓN RECUPERACIÓN */}
      <SectionBand tone="coral">{agenciaNombre} · PARTE RECUPERACIÓN</SectionBand>
      <Panel title="Recuperación por asesor" eyebrow="Cartera de inicio, mora deficiente y repagos">
        <TableShell minWidth="1200px">
          <table className="w-full text-[13px] whitespace-nowrap">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3.5 text-left font-bold text-muted-foreground">Recuperador</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Crecimiento Neto 150</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Repagos</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Cartera de Inicio</th>
                <th className={`px-4 py-3.5 text-right font-bold text-muted-foreground ${colDestacada}`}>Mora CPP Máximo</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Mora CPP Actual</th>
                <th className={`px-4 py-3.5 text-right font-bold text-muted-foreground ${colDestacada}`}>Mora Deficiente Máximo</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Mora Deficiente Actual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {dataRecuperacion.map((r: any) => (
                <tr key={r.recuperador} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-semibold text-left">{r.recuperador}</td>
                  <td className="px-4 py-3 text-right font-semibold text-[hsl(var(--destructive))]">
                    -{money(Math.abs(r.crecimientoNeto150))}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{money(r.repagos)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{money(r.carteraInicio)}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${colDestacada}`}>{money(r.moraCppMax)}</td>
                  <td className="px-4 py-3 text-right"><StatusCell value={r.moraCppActual} threshold={r.moraCppMax} /></td>
                  <td className={`px-4 py-3 text-right font-semibold ${colDestacada}`}>{money(r.moraDefMax)}</td>
                  <td className="px-4 py-3 text-right"><StatusCell value={r.moraDefActual} threshold={r.moraDefMax} /></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border font-bold bg-muted/40">
                <td className="px-4 py-3 text-left">Total</td>
                <td className="px-4 py-3 text-right text-[hsl(var(--destructive))]">-{money(Math.abs(totRecCrecNeto))}</td>
                <td className="px-4 py-3 text-right">{money(totRecRepagos)}</td>
                <td className="px-4 py-3 text-right">{money(totRecCartInicio)}</td>
                <td className={`px-4 py-3 text-right font-semibold ${colDestacada}`}>{money(totRecMoraCppMax)}</td>
                <td className="px-4 py-3 text-right"><StatusCell value={totRecMoraCppAct} threshold={totRecMoraCppMax} /></td>
                <td className={`px-4 py-3 text-right font-semibold ${colDestacada}`}>{money(totRecMoraDefMax)}</td>
                <td className="px-4 py-3 text-right"><StatusCell value={totRecMoraDefAct} threshold={totRecMoraDefMax} /></td>
              </tr>
            </tfoot>
          </table>
        </TableShell>
      </Panel>
    </div>
  );
}

function AsesoresView({ filters }: { filters: Filters }) {
  // 1. OBTENEMOS LOS DATOS DE LOS ASESORES
  const { data: asesoresBD, isLoading: loadAsesores, error: errAsesores } = useQuery({
    queryKey: ['indicadores-asesores', filters.period],
    queryFn: async () => {
      if (!filters.period || filters.period === 'Cargando...') return null;
      const res = await fetch(`http://localhost:3000/api/asesores/${filters.period}`);
      if (!res.ok) throw new Error('Error al cargar asesores');
      return res.json();
    },
    enabled: !!filters.period && filters.period !== 'Cargando...'
  });

  // 2. OBTENEMOS LOS DÍAS LABORALES PARA LA PROYECCIÓN
  const { data: diasBD, isLoading: loadDias } = useQuery({
    queryKey: ['dias-laborales', filters.period],
    queryFn: async () => {
      if (!filters.period || filters.period === 'Cargando...') return null;
      const res = await fetch(`http://localhost:3000/api/dias-laborales/${filters.period}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!filters.period && filters.period !== 'Cargando...'
  });

  // REVISA AQUÍ: Debe decir "if" y "return", ¡no "si" y "devolver"!
  if (loadAsesores || loadDias || !asesoresBD) return <LoadingState />;
  if (errAsesores) return <div className="p-5 text-red-500 font-bold border border-red-200 bg-red-50 rounded-xl">Error de conexión al DWH.</div>;

  const dataDias = Array.isArray(diasBD) ? diasBD[0] : (diasBD || {});

  // BÚSQUEDA DINÁMICA: Encuentra la columna sin importar si tiene espacios, mayúsculas o guiones
  const keyTranscurridos = Object.keys(dataDias).find(k => k.toLowerCase().includes('trans')) || 'transcurridos';
  const keyRestantes = Object.keys(dataDias).find(k => k.toLowerCase().includes('restant')) || 'restantes';

  // Extraemos los valores.
  const transcurridos = Math.max(1, Number(dataDias[keyTranscurridos]) || 12);
  const restantes = Number(dataDias[keyRestantes]) || 13;

  // 🚨 LA VACUNA AVERAGEX: Sincronizamos la productividad con DAX
  const horaPeru = new Date().toLocaleString("en-US", { timeZone: "America/Lima" });
  const horaActual = new Date(horaPeru).getHours();
  const diasProductividadDAX = horaActual < 19 ? transcurridos + 1 : transcurridos;

  // Filtramos la data según agencia y asesor
  let datosFiltrados = filters.agency === 'Todas' ? asesoresBD : asesoresBD.filter((r: any) => r.agency === filters.agency);
  if (filters.advisor !== 'Todos') {
    datosFiltrados = datosFiltrados.filter((r: any) => r.asesor === filters.advisor);
  }

  // ==============================================================
  // 3. APLICAMOS LA FÓRMULA DAX DE PROYECCIÓN EN MEMORIA
  // ==============================================================
  const datosProyectados = datosFiltrados.map((row: any) => {
    const logrado = Number(row.opAchieved || 0);
    
    // Productividad Diaria = Logrado / Días Transcurridos con regla DAX
    const productividad = diasProductividadDAX > 0 ? (logrado / diasProductividadDAX) : 0;
    
    // Proyección de lo que falta = Productividad * Días Restantes (redondeado)
    const proyeccionRestante = Math.round(productividad * restantes);
    
    // Proyección Total a fin de mes
    const opProjection = logrado + proyeccionRestante;

    return { ...row, opProjection };
  });

  // ==============================================================
  // FUNCIONES DE REGLAS DE COLORES (El "Semáforo" de Power BI)
  // ==============================================================
  const cGreen = "bg-[#7cb361] text-white font-bold border-b border-white/20";
  const cYellow = "bg-[#f0cb69] text-[hsl(35_80%_20%)] font-bold border-b border-white/20";
  const cRed = "bg-[#e06c61] text-white font-bold border-b border-white/20";
  const cNeutral = "text-muted-foreground border-b border-border/60";

  const getCrecNetoColor = (val: number) => val >= 20000 ? cGreen : val >= 0 ? cYellow : cRed;
  const getFaltanteColor = (val: number) => val <= 0 ? cGreen : val <= 20000 ? cYellow : cRed;
  
  // 🚨 ACTUALIZADO: Verde (>=27), Amarillo (>=20), Rojo (<20) idéntico a Power BI
  const getOperacionesColor = (val: number) => val >= 27 ? cGreen : val >= 20 ? cYellow : cRed;
  
  const getDuracionColor = (val: number) => val >= 6 ? cGreen : cRed;
  const getSociosColor = (val: number) => val > 0 ? cGreen : cRed;
  const getExcedenteColor = (val: number) => val <= 0 ? cGreen : cRed;
  const getCarteraColor = (val: number) => val >= 200000 ? cGreen : val >= 100000 ? cYellow : cRed;

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200" key={`${filters.period}-${filters.agency}-${filters.advisor}`}>
      
      {/* 1. BARRA DE TIEMPO */}
      <WorkdayStrip periodo={filters.period} />

      {/* 2. TABLA PRINCIPAL: CARTERA Y CRECIMIENTO */}
      <SectionBand tone="green">CARTERA COMERCIAL</SectionBand>
      <Panel title="Todos los Indicadores de Bonificación" eyebrow="Cartera y Crecimiento Neto 150">
        <TableShell minWidth="1080px">
          <table className="w-full text-[13px] whitespace-nowrap text-center">
            <thead>
              <tr className="bg-[hsl(202_76%_31%/.15)]">
                <th colSpan={9} className="py-2 text-[15px] font-bold text-[hsl(202_76%_25%)]">Todos los Indicadores de Bonificación</th>
              </tr>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-3 py-2.5 text-left font-bold text-muted-foreground">Asesor</th>
                <th className="px-3 py-2.5 font-bold text-muted-foreground">Cartera</th>
                <th className="px-3 py-2.5 font-bold text-muted-foreground">Desembolsos</th>
                <th className="px-3 py-2.5 font-bold text-muted-foreground">Repagos</th>
                <th className="px-3 py-2.5 font-bold text-muted-foreground">Crecimiento</th>
                <th className="px-3 py-2.5 font-bold text-muted-foreground">Mora 150</th>
                <th className="px-3 py-2.5 font-bold text-muted-foreground">% Mora150</th>
                <th className="px-3 py-2.5 font-bold text-muted-foreground">Crecimiento Neto 150</th>
                <th className="px-3 py-2.5 font-bold text-muted-foreground">Faltante a S/20K</th>
              </tr>
            </thead>
            <tbody>
              {datosProyectados.map((row: any) => (
                <tr key={row.asesor} className="hover:bg-muted/10 transition-colors">
                  <td className="px-3 py-2 text-left font-semibold border-b border-border/60">{row.asesor}</td>
                  <td className={`px-3 py-2 ${cNeutral}`}>{money(row.cartera)}</td>
                  <td className={`px-3 py-2 ${cNeutral}`}>{money(row.desembolsos)}</td>
                  <td className={`px-3 py-2 ${cNeutral}`}>{money(row.repagos)}</td>
                  <td className={`px-3 py-2 ${cNeutral}`}>{money(row.crecimientoBruto)}</td>
                  <td className={`px-3 py-2 ${cNeutral}`}>{money(row.mora150)}</td>
                  <td className={`px-3 py-2 ${cNeutral}`}>{Number(row.pctMora150).toFixed(2)}%</td>
                  <td className={`px-3 py-2 ${getCrecNetoColor(row.crecimientoNeto150)}`}>{money(row.crecimientoNeto150)}</td>
                  <td className={`px-3 py-2 ${getFaltanteColor(row.faltante20k)}`}>{money(row.faltante20k)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      </Panel>

      {/* 3. GRILLA DE 3 TABLITAS: OPERACIONES, DURACIÓN, SOCIOS */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* OPERACIONES */}
        <div className="rounded-xl border border-border bg-card shadow-[var(--shadow-soft)] overflow-hidden">
          <div className="bg-muted/70 py-2.5 text-center font-bold text-muted-foreground border-b border-border">Operaciones</div>
          <div className="max-h-[350px] overflow-y-auto mobile-scroll">
            <table className="w-full text-[13px] text-center">
              <thead className="sticky top-0 bg-card border-b border-border shadow-sm">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Asesor</th>
                  <th className="px-3 py-2 font-semibold">A la Fecha</th>
                  <th className="px-3 py-2 font-semibold">Proyección</th>
                </tr>
              </thead>
              <tbody>
                {datosProyectados.map((row: any) => (
                  <tr key={`op-${row.asesor}`}>
                    <td className="px-3 py-1.5 text-left border-b border-border/60 text-[11px] font-semibold">{row.asesor}</td>
                    <td className={`px-3 py-1.5 font-mono ${getOperacionesColor(row.opAchieved)}`}>{row.opAchieved}</td>
                    <td className={`px-3 py-1.5 font-mono ${getOperacionesColor(row.opProjection)}`}>{row.opProjection}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* DURACIÓN */}
        <div className="rounded-xl border border-border bg-card shadow-[var(--shadow-soft)] overflow-hidden">
          <div className="bg-muted/70 py-2.5 text-center font-bold text-muted-foreground border-b border-border">Duración</div>
          <div className="max-h-[350px] overflow-y-auto mobile-scroll">
            <table className="w-full text-[13px] text-center">
              <thead className="sticky top-0 bg-card border-b border-border shadow-sm">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Asesor</th>
                  <th className="px-3 py-2 font-semibold">Duracion</th>
                </tr>
              </thead>
              <tbody>
                {datosProyectados.map((row: any) => (
                  <tr key={`dur-${row.asesor}`}>
                    <td className="px-3 py-1.5 text-left border-b border-border/60 text-[11px] font-semibold">{row.asesor}</td>
                    <td className={`px-3 py-1.5 font-mono ${getDuracionColor(row.duracion)}`}>{Number(row.duracion).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SOCIOS */}
        <div className="rounded-xl border border-border bg-card shadow-[var(--shadow-soft)] overflow-hidden">
          <div className="bg-muted/70 py-2.5 text-center font-bold text-muted-foreground border-b border-border">Número de Socios</div>
          <div className="max-h-[350px] overflow-y-auto mobile-scroll">
            <table className="w-full text-[13px] text-center">
              <thead className="sticky top-0 bg-card border-b border-border shadow-sm">
                <tr>
                  <th className="px-2 py-2 text-left font-semibold">Asesor</th>
                  <th className="px-2 py-2 font-semibold">Inicio Mes</th>
                  <th className="px-2 py-2 font-semibold">A la Fecha</th>
                  <th className="px-2 py-2 font-semibold">Nuevos</th>
                </tr>
              </thead>
              <tbody>
                {datosProyectados.map((row: any) => (
                  <tr key={`soc-${row.asesor}`}>
                    <td className="px-2 py-1.5 text-left border-b border-border/60 text-[11px] font-semibold truncate max-w-[90px]" title={row.asesor}>{row.asesor}</td>
                    <td className={`px-2 py-1.5 font-mono ${cNeutral}`}>{row.sociosInicio}</td>
                    <td className={`px-2 py-1.5 font-mono ${cNeutral}`}>{row.sociosActual}</td>
                    <td className={`px-2 py-1.5 font-mono ${getSociosColor(row.sociosNuevos)}`}>{row.sociosNuevos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 4. TABLAS DE RIESGO: MORA CPP Y MORA VENCIDA */}
      <div className="grid gap-5 xl:grid-cols-2">
        {/* MORA CPP */}
        <div className="rounded-xl border border-border bg-card shadow-[var(--shadow-soft)] overflow-hidden">
          <div className="bg-muted/70 py-2.5 text-center font-bold text-muted-foreground border-b border-border">Mora CPP</div>
          <TableShell minWidth="600px">
            <table className="w-full text-[13px] text-center whitespace-nowrap">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left font-semibold">Asesor</th>
                  <th className="px-3 py-2 font-semibold">Cartera Inicio</th>
                  <th className="px-3 py-2 font-semibold">Mora S/</th>
                  <th className="px-3 py-2 font-semibold">Mora %</th>
                  <th className="px-3 py-2 font-semibold">Meta %</th>
                  <th className="px-3 py-2 font-semibold">Excedente %</th>
                  <th className="px-3 py-2 font-semibold">Excedente S/</th>
                </tr>
              </thead>
              <tbody>
                {datosProyectados.map((row: any) => (
                  <tr key={`cpp-${row.asesor}`}>
                    <td className="px-3 py-1.5 text-left border-b border-border/60">{row.asesor}</td>
                    <td className={`px-3 py-1.5 ${cNeutral}`}>{money(row.carteraInicio)}</td>
                    <td className={`px-3 py-1.5 ${cNeutral}`}>{money(row.moraCppActual)}</td>
                    <td className={`px-3 py-1.5 font-mono ${cNeutral}`}>{Number(row.pctMoraCpp).toFixed(2)}%</td>
                    <td className={`px-3 py-1.5 font-mono ${cNeutral}`}>{Number(row.metaMoraCpp).toFixed(2)}%</td>
                    <td className={`px-3 py-1.5 font-mono ${getExcedenteColor(row.excedentePctCpp)}`}>{Number(row.excedentePctCpp).toFixed(2)}%</td>
                    <td className={`px-3 py-1.5 ${getExcedenteColor(row.excedenteSolesCpp)}`}>{money(row.excedenteSolesCpp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
        </div>

        {/* MORA VENCIDA */}
        <div className="rounded-xl border border-border bg-card shadow-[var(--shadow-soft)] overflow-hidden">
          <div className="bg-muted/70 py-2.5 text-center font-bold text-muted-foreground border-b border-border">Mora Vencida</div>
          <TableShell minWidth="600px">
            <table className="w-full text-[13px] text-center whitespace-nowrap">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left font-semibold">Asesor</th>
                  <th className="px-3 py-2 font-semibold">Cartera Inicio</th>
                  <th className="px-3 py-2 font-semibold">Mora S/</th>
                  <th className="px-3 py-2 font-semibold">Mora %</th>
                  <th className="px-3 py-2 font-semibold">Meta %</th>
                  <th className="px-3 py-2 font-semibold">Excedente %</th>
                  <th className="px-3 py-2 font-semibold">Excedente S/</th>
                </tr>
              </thead>
              <tbody>
                {datosProyectados.map((row: any) => (
                  <tr key={`venc-${row.asesor}`}>
                    <td className="px-3 py-1.5 text-left border-b border-border/60">{row.asesor}</td>
                    <td className={`px-3 py-1.5 ${cNeutral}`}>{money(row.carteraInicio)}</td>
                    <td className={`px-3 py-1.5 ${cNeutral}`}>{money(row.moraDefActual)}</td>
                    <td className={`px-3 py-1.5 font-mono ${cNeutral}`}>{Number(row.pctMoraDef).toFixed(2)}%</td>
                    <td className={`px-3 py-1.5 font-mono ${cNeutral}`}>{Number(row.metaMoraDef).toFixed(2)}%</td>
                    <td className={`px-3 py-1.5 font-mono ${getExcedenteColor(row.excedentePctDef)}`}>{Number(row.excedentePctDef).toFixed(2)}%</td>
                    <td className={`px-3 py-1.5 ${getExcedenteColor(row.excedenteSolesDef)}`}>{money(row.excedenteSolesDef)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
        </div>
      </div>

      {/* 5. TABLA FINAL: RESUMEN DE BONIFICACIÓN */}
      <Panel title="Resumen. Indicadores de Bonificación" eyebrow="Bonos condicionados a Candado y Multiplicadores">
        <TableShell minWidth="1200px">
          <table className="w-full text-[13px] text-center whitespace-nowrap">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-3 py-2.5 text-left font-bold text-muted-foreground">Asesor</th>
                <th className="px-3 py-2.5 font-bold text-muted-foreground">Duracion<br/>(Candado)</th>
                <th className="px-3 py-2.5 font-bold text-muted-foreground">Cartera<br/>(Cond. Adicional)</th>
                <th className="px-3 py-2.5 font-bold text-muted-foreground">Nro Oper<br/>(Bono Base)</th>
                <th className="px-3 py-2.5 font-bold text-muted-foreground">Nro Oper<br/>Proyeccion</th>
                <th className="px-3 py-2.5 font-bold text-muted-foreground">Crecimiento Neto 150<br/>(Mult.)</th>
                <th className="px-3 py-2.5 font-bold text-muted-foreground">Socios Nuevos<br/>(Mult.)</th>
                <th className="px-3 py-2.5 font-bold text-muted-foreground">Excedente Mora CPP<br/>(Mult.)</th>
                <th className="px-3 py-2.5 font-bold text-muted-foreground">Excedente Mora Vencida<br/>(Mult.)</th>
              </tr>
            </thead>
            <tbody>
              {datosProyectados.map((row: any) => (
                <tr key={`res-${row.asesor}`} className="hover:bg-muted/10 transition-colors">
                  <td className="px-3 py-2 text-left font-semibold border-b border-border/60">{row.asesor}</td>
                  <td className={`px-3 py-2 font-mono ${getDuracionColor(row.duracion)}`}>{Number(row.duracion).toFixed(2)}</td>
                  <td className={`px-3 py-2 ${getCarteraColor(row.cartera)}`}>{money(row.cartera)}</td>
                  <td className={`px-3 py-2 font-mono ${getOperacionesColor(row.opAchieved)}`}>{row.opAchieved}</td>
                  <td className={`px-3 py-2 font-mono ${getOperacionesColor(row.opProjection)}`}>{row.opProjection}</td>
                  <td className={`px-3 py-2 ${getCrecNetoColor(row.crecimientoNeto150)}`}>{money(row.crecimientoNeto150)}</td>
                  <td className={`px-3 py-2 font-mono ${getSociosColor(row.sociosNuevos)}`}>{row.sociosNuevos}</td>
                  <td className={`px-3 py-2 ${getExcedenteColor(row.excedenteSolesCpp)}`}>{money(row.excedenteSolesCpp)}</td>
                  <td className={`px-3 py-2 ${getExcedenteColor(row.excedenteSolesDef)}`}>{money(row.excedenteSolesDef)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
        
        {/* LEYENDA INFERIOR ACTUALIZADA */}
        <div className="mt-6 rounded-lg bg-[hsl(var(--accent)/.1)] p-4 text-[11px] leading-5 text-muted-foreground">
          <strong className="text-foreground underline underline-offset-2">Criterios de colores:</strong>
          <ul className="mt-2 list-inside list-disc space-y-1 marker:text-foreground/40">
            <li><strong>Duración (CANDADO):</strong> verde (&gt;= 6) | rojo (&lt; 6)</li>
            <li><strong>Cartera (CONDICION ADICIONAL):</strong> verde (&gt;= S/200,000) aplica multiplicadores | amarillo (S/100,000 a S/200,000) aplica multiplicador automático de 50% | rojo (&lt; S/100,000) aplica multiplicador automático de 30%</li>
            <li><strong>Crecimiento Neto 150:</strong> verde (&gt;= S/20,000) | amarillo (entre S/0 y S/20,000) | rojo (&lt; S/0)</li>
            <li><strong>Nro Operaciones:</strong> verde (&gt;= 27) | amarillo (&gt;= 20) | rojo (&lt; 20)</li>
            <li><strong>Mora CPP:</strong> según meta particular por asesor</li>
            <li><strong>Mora Deficiente:</strong> según meta particular por asesor</li>
          </ul>
        </div>
      </Panel>
    </div>
  );
}
  // 1. OBTENEMOS LOS DATOS DE LOS ASESORES
  const { data: asesoresBD, isLoading: loadAsesores, error: errAsesores } = useQuery({
    queryKey: ['indicadores-asesores', filters.period],
    queryFn: async () => {
      if (!filters.period || filters.period === 'Cargando...') return null;
      const res = await fetch(`http://localhost:3000/api/asesores/${filters.period}`);
      if (!res.ok) throw new Error('Error al cargar asesores');
      return res.json();
    },
    enabled: !!filters.period && filters.period !== 'Cargando...'
  });

// 2. OBTENEMOS LOS DÍAS LABORALES PARA LA PROYECCIÓN
  const { data: diasBD, isLoading: loadDias } = useQuery({
    queryKey: ['dias-laborales', filters.period],
    queryFn: async () => {
      if (!filters.period || filters.period === 'Cargando...') return null;
      const res = await fetch(`http://localhost:3000/api/dias-laborales/${filters.period}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!filters.period && filters.period !== 'Cargando...'
  });

  if (loadAsesores || loadDias || !asesoresBD) return <LoadingState />;
  if (errAsesores) return <div className="p-5 text-red-500 font-bold border border-red-200 bg-red-50 rounded-xl">Error de conexión al DWH.</div>;

  const dataDias = Array.isArray(diasBD) ? diasBD[0] : (diasBD || {});

  // BÚSQUEDA DINÁMICA: Encuentra la columna sin importar si tiene espacios, mayúsculas o guiones
  const keyTranscurridos = Object.keys(dataDias).find(k => k.toLowerCase().includes('trans')) || 'transcurridos';
  const keyRestantes = Object.keys(dataDias).find(k => k.toLowerCase().includes('restant')) || 'restantes';

  // Extraemos los valores. Si falla la red, ponemos 12 y 13 como estimación de tu captura.
  const transcurridos = Math.max(1, Number(dataDias[keyTranscurridos]) || 12);
  const restantes = Number(dataDias[keyRestantes]) || 13;

  // Filtramos la data según agencia y asesor
  let datosFiltrados = filters.agency === 'Todas' ? asesoresBD : asesoresBD.filter((r: any) => r.agency === filters.agency);
  if (filters.advisor !== 'Todos') {
    datosFiltrados = datosFiltrados.filter((r: any) => r.asesor === filters.advisor);
  }

// ==============================================================
  // 3. APLICAMOS LA FÓRMULA DAX DE PROYECCIÓN EN MEMORIA
  // ==============================================================
  const datosProyectados = datosFiltrados.map((row: any) => {
    // 🚨 FORZAMOS a que el Logrado sea un Número matemático, no un texto
    const logrado = Number(row.opAchieved || 0);
    
    // Productividad Diaria = Logrado / Días Transcurridos reales
    const productividad = logrado / transcurridos;
    
    // Proyección de lo que falta = Productividad * Días Restantes (redondeado)
    const proyeccionRestante = Math.round(productividad * restantes);
    
    // Proyección Total a fin de mes (¡Ahora sí sumará 22 + 20 = 42!)
    const opProjection = logrado + proyeccionRestante;

    return { ...row, opProjection };
  });

  // ==============================================================
  // FUNCIONES DE REGLAS DE COLORES (El "Semáforo" de Power BI)
  // ==============================================================
  const cGreen = "bg-[#7cb361] text-white font-bold border-b border-white/20";
  const cYellow = "bg-[#f0cb69] text-[hsl(35_80%_20%)] font-bold border-b border-white/20";
  const cRed = "bg-[#e06c61] text-white font-bold border-b border-white/20";
  const cNeutral = "text-muted-foreground border-b border-border/60";

  const getCrecNetoColor = (val: number) => val >= 20000 ? cGreen : val >= 0 ? cYellow : cRed;
  const getFaltanteColor = (val: number) => val <= 0 ? cGreen : val <= 20000 ? cYellow : cRed;
  
  // 🚨 ACTUALIZADO: Verde (>=25), Amarillo (>=20), Rojo (<20) idéntico a Power BI
  const getOperacionesColor = (val: number) => val >= 25 ? cGreen : val >= 20 ? cYellow : cRed;
  
  const getDuracionColor = (val: number) => val >= 6 ? cGreen : cRed;
  const getSociosColor = (val: number) => val > 0 ? cGreen : cRed;
  const getExcedenteColor = (val: number) => val <= 0 ? cGreen : cRed;
  const getCarteraColor = (val: number) => val >= 200000 ? cGreen : val >= 100000 ? cYellow : cRed;

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200" key={`${filters.period}-${filters.agency}-${filters.advisor}`}>
      
      {/* 1. BARRA DE TIEMPO */}
      <WorkdayStrip periodo={filters.period} />

      {/* 2. TABLA PRINCIPAL: CARTERA Y CRECIMIENTO */}
      <SectionBand tone="green">CARTERA COMERCIAL</SectionBand>
      <Panel title="Todos los Indicadores de Bonificación" eyebrow="Cartera y Crecimiento Neto 150">
        <TableShell minWidth="1080px">
          <table className="w-full text-[13px] whitespace-nowrap text-center">
            <thead>
              <tr className="bg-[hsl(202_76%_31%/.15)]">
                <th colSpan={9} className="py-2 text-[15px] font-bold text-[hsl(202_76%_25%)]">Todos los Indicadores de Bonificación</th>
              </tr>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-3 py-2.5 text-left font-bold text-muted-foreground">Asesor</th>
                <th className="px-3 py-2.5 font-bold text-muted-foreground">Cartera</th>
                <th className="px-3 py-2.5 font-bold text-muted-foreground">Desembolsos</th>
                <th className="px-3 py-2.5 font-bold text-muted-foreground">Repagos</th>
                <th className="px-3 py-2.5 font-bold text-muted-foreground">Crecimiento</th>
                <th className="px-3 py-2.5 font-bold text-muted-foreground">Mora 150</th>
                <th className="px-3 py-2.5 font-bold text-muted-foreground">% Mora150</th>
                <th className="px-3 py-2.5 font-bold text-muted-foreground">Crecimiento Neto 150</th>
                <th className="px-3 py-2.5 font-bold text-muted-foreground">Faltante a S/20K</th>
              </tr>
            </thead>
            <tbody>
              {datosProyectados.map((row: any) => (
                <tr key={row.asesor} className="hover:bg-muted/10 transition-colors">
                  <td className="px-3 py-2 text-left font-semibold border-b border-border/60">{row.asesor}</td>
                  <td className={`px-3 py-2 ${cNeutral}`}>{money(row.cartera)}</td>
                  <td className={`px-3 py-2 ${cNeutral}`}>{money(row.desembolsos)}</td>
                  <td className={`px-3 py-2 ${cNeutral}`}>{money(row.repagos)}</td>
                  <td className={`px-3 py-2 ${cNeutral}`}>{money(row.crecimientoBruto)}</td>
                  <td className={`px-3 py-2 ${cNeutral}`}>{money(row.mora150)}</td>
                  <td className={`px-3 py-2 ${cNeutral}`}>{Number(row.pctMora150).toFixed(2)}%</td>
                  <td className={`px-3 py-2 ${getCrecNetoColor(row.crecimientoNeto150)}`}>{money(row.crecimientoNeto150)}</td>
                  <td className={`px-3 py-2 ${getFaltanteColor(row.faltante20k)}`}>{money(row.faltante20k)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      </Panel>

      {/* 3. GRILLA DE 3 TABLITAS: OPERACIONES, DURACIÓN, SOCIOS */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* OPERACIONES */}
        <div className="rounded-xl border border-border bg-card shadow-[var(--shadow-soft)] overflow-hidden">
          <div className="bg-muted/70 py-2.5 text-center font-bold text-muted-foreground border-b border-border">Operaciones</div>
          <div className="max-h-[350px] overflow-y-auto mobile-scroll">
            <table className="w-full text-[13px] text-center">
              <thead className="sticky top-0 bg-card border-b border-border shadow-sm">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Asesor</th>
                  <th className="px-3 py-2 font-semibold">A la Fecha</th>
                  <th className="px-3 py-2 font-semibold">Proyección</th>
                </tr>
              </thead>
              <tbody>
                {datosProyectados.map((row: any) => (
                  <tr key={row.asesor}>
                    <td className="px-3 py-1.5 text-left border-b border-border/60">{row.asesor}</td>
                    <td className={`px-3 py-1.5 font-mono ${getOperacionesColor(row.opAchieved)}`}>{row.opAchieved}</td>
                    <td className={`px-3 py-1.5 font-mono ${getOperacionesColor(row.opProjection)}`}>{row.opProjection}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* DURACIÓN */}
        <div className="rounded-xl border border-border bg-card shadow-[var(--shadow-soft)] overflow-hidden">
          <div className="bg-muted/70 py-2.5 text-center font-bold text-muted-foreground border-b border-border">Duración</div>
          <div className="max-h-[350px] overflow-y-auto mobile-scroll">
            <table className="w-full text-[13px] text-center">
              <thead className="sticky top-0 bg-card border-b border-border shadow-sm">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Asesor</th>
                  <th className="px-3 py-2 font-semibold">Duracion</th>
                </tr>
              </thead>
              <tbody>
                {datosProyectados.map((row: any) => (
                  <tr key={row.asesor}>
                    <td className="px-3 py-1.5 text-left border-b border-border/60">{row.asesor}</td>
                    <td className={`px-3 py-1.5 font-mono ${getDuracionColor(row.duracion)}`}>{Number(row.duracion).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SOCIOS */}
        <div className="rounded-xl border border-border bg-card shadow-[var(--shadow-soft)] overflow-hidden">
          <div className="bg-muted/70 py-2.5 text-center font-bold text-muted-foreground border-b border-border">Número de Socios</div>
          <div className="max-h-[350px] overflow-y-auto mobile-scroll">
            <table className="w-full text-[13px] text-center">
              <thead className="sticky top-0 bg-card border-b border-border shadow-sm">
                <tr>
                  <th className="px-2 py-2 text-left font-semibold">Asesor</th>
                  <th className="px-2 py-2 font-semibold">Inicio Mes</th>
                  <th className="px-2 py-2 font-semibold">A la Fecha</th>
                  <th className="px-2 py-2 font-semibold">Nuevos</th>
                </tr>
              </thead>
              <tbody>
                {datosProyectados.map((row: any) => (
                  <tr key={row.asesor}>
                    <td className="px-2 py-1.5 text-left border-b border-border/60 text-xs truncate max-w-[90px]" title={row.asesor}>{row.asesor}</td>
                    <td className={`px-2 py-1.5 font-mono ${cNeutral}`}>{row.sociosInicio}</td>
                    <td className={`px-2 py-1.5 font-mono ${cNeutral}`}>{row.sociosActual}</td>
                    <td className={`px-2 py-1.5 font-mono ${getSociosColor(row.sociosNuevos)}`}>{row.sociosNuevos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 4. TABLAS DE RIESGO: MORA CPP Y MORA VENCIDA */}
      <div className="grid gap-5 xl:grid-cols-2">
        {/* MORA CPP */}
        <div className="rounded-xl border border-border bg-card shadow-[var(--shadow-soft)] overflow-hidden">
          <div className="bg-muted/70 py-2.5 text-center font-bold text-muted-foreground border-b border-border">Mora CPP</div>
          <TableShell minWidth="600px">
            <table className="w-full text-[13px] text-center whitespace-nowrap">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left font-semibold">Asesor</th>
                  <th className="px-3 py-2 font-semibold">Cartera Inicio</th>
                  <th className="px-3 py-2 font-semibold">Mora S/</th>
                  <th className="px-3 py-2 font-semibold">Mora %</th>
                  <th className="px-3 py-2 font-semibold">Meta %</th>
                  <th className="px-3 py-2 font-semibold">Excedente %</th>
                  <th className="px-3 py-2 font-semibold">Excedente S/</th>
                </tr>
              </thead>
              <tbody>
                {datosProyectados.map((row: any) => (
                  <tr key={row.asesor}>
                    <td className="px-3 py-1.5 text-left border-b border-border/60">{row.asesor}</td>
                    <td className={`px-3 py-1.5 ${cNeutral}`}>{money(row.carteraInicio)}</td>
                    <td className={`px-3 py-1.5 ${cNeutral}`}>{money(row.moraCppActual)}</td>
                    <td className={`px-3 py-1.5 font-mono ${cNeutral}`}>{Number(row.pctMoraCpp).toFixed(2)}%</td>
                    <td className={`px-3 py-1.5 font-mono ${cNeutral}`}>{Number(row.metaMoraCpp).toFixed(2)}%</td>
                    <td className={`px-3 py-1.5 font-mono ${getExcedenteColor(row.excedentePctCpp)}`}>{Number(row.excedentePctCpp).toFixed(2)}%</td>
                    <td className={`px-3 py-1.5 ${getExcedenteColor(row.excedenteSolesCpp)}`}>{money(row.excedenteSolesCpp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
        </div>

        {/* MORA VENCIDA */}
        <div className="rounded-xl border border-border bg-card shadow-[var(--shadow-soft)] overflow-hidden">
          <div className="bg-muted/70 py-2.5 text-center font-bold text-muted-foreground border-b border-border">Mora Vencida</div>
          <TableShell minWidth="600px">
            <table className="w-full text-[13px] text-center whitespace-nowrap">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left font-semibold">Asesor</th>
                  <th className="px-3 py-2 font-semibold">Cartera Inicio</th>
                  <th className="px-3 py-2 font-semibold">Mora S/</th>
                  <th className="px-3 py-2 font-semibold">Mora %</th>
                  <th className="px-3 py-2 font-semibold">Meta %</th>
                  <th className="px-3 py-2 font-semibold">Excedente %</th>
                  <th className="px-3 py-2 font-semibold">Excedente S/</th>
                </tr>
              </thead>
              <tbody>
                {datosProyectados.map((row: any) => (
                  <tr key={row.asesor}>
                    <td className="px-3 py-1.5 text-left border-b border-border/60">{row.asesor}</td>
                    <td className={`px-3 py-1.5 ${cNeutral}`}>{money(row.carteraInicio)}</td>
                    <td className={`px-3 py-1.5 ${cNeutral}`}>{money(row.moraDefActual)}</td>
                    <td className={`px-3 py-1.5 font-mono ${cNeutral}`}>{Number(row.pctMoraDef).toFixed(2)}%</td>
                    <td className={`px-3 py-1.5 font-mono ${cNeutral}`}>{Number(row.metaMoraDef).toFixed(2)}%</td>
                    <td className={`px-3 py-1.5 font-mono ${getExcedenteColor(row.excedentePctDef)}`}>{Number(row.excedentePctDef).toFixed(2)}%</td>
                    <td className={`px-3 py-1.5 ${getExcedenteColor(row.excedenteSolesDef)}`}>{money(row.excedenteSolesDef)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
        </div>
      </div>

      {/* 5. TABLA FINAL: RESUMEN DE BONIFICACIÓN */}
      <Panel title="Resumen. Indicadores de Bonificación" eyebrow="Bonos condicionados a Candado y Multiplicadores">
        <TableShell minWidth="1200px">
          <table className="w-full text-[13px] text-center whitespace-nowrap">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-3 py-2.5 text-left font-bold text-muted-foreground">Asesor</th>
                <th className="px-3 py-2.5 font-bold text-muted-foreground">Duracion<br/>(Candado)</th>
                <th className="px-3 py-2.5 font-bold text-muted-foreground">Cartera<br/>(Cond. Adicional)</th>
                <th className="px-3 py-2.5 font-bold text-muted-foreground">Nro Oper<br/>(Bono Base)</th>
                <th className="px-3 py-2.5 font-bold text-muted-foreground">Nro Oper<br/>Proyeccion</th>
                <th className="px-3 py-2.5 font-bold text-muted-foreground">Crecimiento Neto 150<br/>(Mult.)</th>
                <th className="px-3 py-2.5 font-bold text-muted-foreground">Socios Nuevos<br/>(Mult.)</th>
                <th className="px-3 py-2.5 font-bold text-muted-foreground">Excedente Mora CPP<br/>(Mult.)</th>
                <th className="px-3 py-2.5 font-bold text-muted-foreground">Excedente Mora Vencida<br/>(Mult.)</th>
              </tr>
            </thead>
            <tbody>
              {datosProyectados.map((row: any) => (
                <tr key={row.asesor} className="hover:bg-muted/10 transition-colors">
                  <td className="px-3 py-2 text-left font-semibold border-b border-border/60">{row.asesor}</td>
                  <td className={`px-3 py-2 font-mono ${getDuracionColor(row.duracion)}`}>{Number(row.duracion).toFixed(2)}</td>
                  <td className={`px-3 py-2 ${getCarteraColor(row.cartera)}`}>{money(row.cartera)}</td>
                  <td className={`px-3 py-2 font-mono ${getOperacionesColor(row.opAchieved)}`}>{row.opAchieved}</td>
                  <td className={`px-3 py-2 font-mono ${getOperacionesColor(row.opProjection)}`}>{row.opProjection}</td>
                  <td className={`px-3 py-2 ${getCrecNetoColor(row.crecimientoNeto150)}`}>{money(row.crecimientoNeto150)}</td>
                  <td className={`px-3 py-2 font-mono ${getSociosColor(row.sociosNuevos)}`}>{row.sociosNuevos}</td>
                  <td className={`px-3 py-2 ${getExcedenteColor(row.excedenteSolesCpp)}`}>{money(row.excedenteSolesCpp)}</td>
                  <td className={`px-3 py-2 ${getExcedenteColor(row.excedenteSolesDef)}`}>{money(row.excedenteSolesDef)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
        
        {/* LEYENDA INFERIOR IDÉNTICA A POWER BI */}
        <div className="mt-6 rounded-lg bg-[hsl(var(--accent)/.1)] p-4 text-[11px] leading-5 text-muted-foreground">
          <strong className="text-foreground underline underline-offset-2">Criterios de colores:</strong>
          <ul className="mt-2 list-inside list-disc space-y-1 marker:text-foreground/40">
            <li><strong>Duración (CANDADO):</strong> verde (&gt;= 6) | rojo (&lt; 6)</li>
            <li><strong>Cartera (CONDICION ADICIONAL):</strong> verde (&gt;= S/200,000) aplica multiplicadores | amarillo (S/100,000 a S/200,000) aplica multiplicador automático de 50% | rojo (&lt; S/100,000) aplica multiplicador automático de 30%</li>
            <li><strong>Crecimiento Neto 150:</strong> verde (&gt;= S/20,000) | amarillo (entre S/0 y S/20,000) | rojo (&lt; S/0)</li>
            <li><strong>Nro Operaciones:</strong> verde (&gt;= 25) | rojo (&lt; 25)</li>
            <li><strong>Mora CPP:</strong> según meta particular por asesor</li>
            <li><strong>Mora Deficiente:</strong> según meta particular por asesor</li>
          </ul>
        </div>
      </Panel>
    </div>
  );
}

function AdvisorMiniTable({ title, rows }: { title: string; rows: { name: string; value: number | string; extra: number | string }[] }) {
  return <Panel title={title} eyebrow="Indicadores por asesor"><div className="space-y-2">{rows.map((row) => <div key={row.name} className="grid grid-cols-[1fr_62px_62px] items-center border-b border-border/60 pb-2 text-[11px] last:border-0"><span>{row.name}</span><span className="text-right font-mono">{row.value}</span><span className="text-right font-mono text-muted-foreground">{row.extra}</span></div>)}</div></Panel>;
}

function MoraBlock({ title, rows }: { title: string; rows: AdvisorRow[] }) {
  return <div className="rounded-xl border border-border p-4"><div className="mb-3 font-display text-sm font-bold">{title}</div><div className="space-y-2">{rows.map((row) => <div key={row.advisor} className="grid grid-cols-[1fr_70px_58px] items-center text-[11px]"><span>{row.advisor}</span><span className="text-right font-mono">{percent(row.moraPct)}</span><span className={`text-right font-mono ${row.moraPct > 10 ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--primary))]'}`}>{row.moraPct > 10 ? 'Excede' : 'OK'}</span></div>)}</div></div>;
}

// 1. COMPONENTE VELOCÍMETRO (Protegido contra traductores automáticos)
function GaugeChart({ pct, color }: { pct: number, color: string }) {
  const radius = 85;
  const strokeWidth = 24;
  const circ = Math.PI * radius; 
  const strokePct = circ * ((100 - Math.min(pct, 100)) / 100);
  
  return (
    <div className="flex flex-col items-center relative w-[240px]">
      <svg width="240" height="120" className="overflow-visible">
        <path d={`M 35 115 A ${radius} ${radius} 0 0 1 205 115`} fill="none" className="stroke-muted" strokeWidth={strokeWidth} strokeLinecap="butt" />
        <path d={`M 35 115 A ${radius} ${radius} 0 0 1 205 115`} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={circ} strokeDashoffset={strokePct} strokeLinecap="butt" className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute bottom-2 left-0 right-0 flex justify-center">
        {/* ARREGLO AQUÍ: Agregamos translate="no" y la clase notranslate */}
        <span translate="no" className="notranslate text-4xl font-bold tracking-tight text-foreground">
          {pct.toFixed(0)}%
        </span>
      </div>
      <div className="w-full flex justify-between px-8 absolute -bottom-4 text-[10px] font-bold text-muted-foreground/60">
        <span>0%</span>
        <span>100%</span>
      </div>
    </div>
  );
}

// 2. VISTA PRINCIPAL (ColocacionesView)
function ColocacionesView({ filters }: { filters: Filters }) {
  const { data: agenciaBD, isLoading: loadAgencia } = useQuery({
    queryKey: ['indicadores-agencia', filters.period],
    queryFn: async () => {
      if (!filters.period || filters.period === 'Cargando...') return null;
      const res = await fetch(`http://localhost:3000/api/agencia/${filters.period}`);
      if (!res.ok) throw new Error('Error al cargar agencia');
      return res.json();
    },
    enabled: !!filters.period && filters.period !== 'Cargando...'
  });

  const { data: diasBD, isLoading: loadDias } = useQuery({
    queryKey: ['dias-laborales', filters.period],
    queryFn: async () => {
      if (!filters.period || filters.period === 'Cargando...') return null;
      const res = await fetch(`http://localhost:3000/api/dias-laborales/${filters.period}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!filters.period && filters.period !== 'Cargando...'
  });

  if (loadAgencia || loadDias || !agenciaBD) return <LoadingState />;

  // EXTRACCIÓN DE DÍAS
  const dataDias = Array.isArray(diasBD) ? diasBD[0] : (diasBD || {});
  const transcurridos = Number(dataDias?.transcurridos || dataDias?.DiasTranscurridos || 14); 
  const restantes = Number(dataDias?.restantes || dataDias?.DiasRestantes || 11);
  const totales = transcurridos + restantes;

  // 🚨 LA SOLUCIÓN EXACTA PARA IGUALAR A AVERAGEX DE DAX 🚨
  const horaPeru = new Date().toLocaleString("en-US", { timeZone: "America/Lima" });
  const horaActual = new Date(horaPeru).getHours();
  const diasProductividadDAX = horaActual < 19 ? transcurridos + 1 : transcurridos;

  // FILTRADO POR AGENCIA
  const filterByAgency = (arr: any[]) => filters.agency === 'Todas' ? arr : arr.filter((r: any) => r.agency === filters.agency);
  let dataComercial = filterByAgency(agenciaBD?.comercial || []);
  const dataResumen = filterByAgency(agenciaBD?.resumen || []);
  
  if (filters.advisor !== 'Todos') {
    dataComercial = dataComercial.filter((r: any) => r.asesor === filters.advisor);
  }

  // 🔥 VARIABLE RECUPERADA 🔥
  const metaGlobalReferencia = 30; 
  const prodIdeal = totales > 0 ? (metaGlobalReferencia / totales).toFixed(2) : "0.00";

  // CÁLCULOS MATEMÁTICOS DE ASESORES (Idéntico a Power BI)
  const dataAsesores = dataComercial.map((row: any) => {
    const logrado = Number(row.opAchieved || 0);
    const metaIndividual = Number(row.metaAsesor || 30);
    
    // 1. PRODUCTIVIDAD: Dividimos entre 15 (diasProductividadDAX)
    const productividad = diasProductividadDAX > 0 ? (logrado / diasProductividadDAX) : 0;
    
    // 2. PROYECCIÓN: Multiplicamos por 11 (restantes) y sumamos el logrado
    const proyeccion = logrado + Math.round(productividad * restantes);
    
    // 3. FALTANTES
    const faltante = Math.max(0, metaIndividual - logrado);
    const faltanteExigente = restantes > 0 ? (faltante / restantes).toFixed(2) : '0.00';

    const pctCumplimiento = metaIndividual > 0 ? (proyeccion / metaIndividual) * 100 : 0;

    let clasificacion = ""; let colorClass = "";
    if (pctCumplimiento >= 120) { clasificacion = "Muy Autosuficiente"; colorClass = "bg-[#43a047]/90 text-white"; }
    else if (pctCumplimiento >= 110) { clasificacion = "Autosuficiente"; colorClass = "bg-[#81c784]/90 text-black"; }
    else if (pctCumplimiento >= 100) { clasificacion = "Necesita Mantenerse Así"; colorClass = "bg-[#c8e6c9]/90 text-black"; }
    else if (pctCumplimiento >= 90) { clasificacion = "Necesita Motivación"; colorClass = "bg-[#fff59d]/90 text-black"; }
    else if (pctCumplimiento >= 80) { clasificacion = "Necesita Exigencia"; colorClass = "bg-[#ffb74d]/90 text-black"; }
    else { clasificacion = "Necesita Llamada De Atención"; colorClass = "bg-[#e53935]/90 text-white"; }

    return { 
      asesor: row.asesor, 
      logrado, 
      productividad: productividad.toFixed(2), 
      proyeccion, 
      faltante, 
      faltanteExigente, 
      clasificacion, 
      colorClass, 
      metaAsesor: metaIndividual 
    };
  }).sort((a, b) => b.logrado - a.logrado);

  // CÁLCULOS MATEMÁTICOS DE AGENCIA
  const sum = (arr: any[], key: string) => arr.reduce((acc, row) => acc + Number(row[key] || 0), 0);
  
  const logradoAgencia = sum(dataComercial, 'opAchieved');
  const metaAgencia = sum(dataResumen, 'opTarget');
  const faltanteAgencia = Math.max(0, metaAgencia - logradoAgencia);
  const pctLogrado = metaAgencia > 0 ? (logradoAgencia / metaAgencia) * 100 : 0;

  const proyeccionAgencia = sum(dataAsesores, 'proyeccion');
  const faltanteProyectado = Math.max(0, metaAgencia - proyeccionAgencia);
  const pctProyeccion = metaAgencia > 0 ? (proyeccionAgencia / metaAgencia) * 100 : 0;

  const ritmoHastaFecha = transcurridos > 0 ? Math.round(logradoAgencia / transcurridos) : 0;
  const ritmoDesdeHoy = restantes > 0 ? Math.round(faltanteAgencia / restantes) : 0;
  const ritmoReferencia = totales > 0 ? Math.round(metaAgencia / totales) : 0;

  const maxProyeccion = Math.max(...dataAsesores.map(a => Math.max(a.proyeccion, a.metaAsesor)), 1);

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200" key={`${filters.period}-${filters.agency}-${filters.advisor}`}>
      
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">El objetivo del mes se vuelve alcanzable.</h2>
        <p className="text-muted-foreground mt-1 text-[13px]">Monitorea meta, logro y proyección para anticiparte al cierre de la agencia.</p>
      </div>

      <SectionBand tone="coral">A NIVEL DE AGENCIA</SectionBand>
      
      <div className="grid gap-6 xl:grid-cols-2">
        
        {/* TARJETA 1: HASTA HOY */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-6 flex flex-col items-center text-center">
          <h3 className="font-bold text-xl text-foreground mb-1">Hasta Hoy, ¿Cómo Va mi Agencia?</h3>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-8">Cumplimiento de la Meta Mensual</p>
          
          {/* CORRECCIÓN DE COLOR AQUÍ: */}
          <GaugeChart pct={pctLogrado} color="#159a43" />
          
          <div className="grid grid-cols-3 gap-4 w-full mt-10 divide-x divide-border/60">
             <div>
               <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Logrado</div>
               <div className="text-3xl font-light text-[hsl(142_71%_35%)]">{number(logradoAgencia)}</div>
             </div>
             <div>
               <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Faltante</div>
               <div className="text-3xl font-light text-[hsl(348_83%_55%)]">{number(faltanteAgencia)}</div>
             </div>
             <div>
               <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Meta</div>
               <div className="text-3xl font-light text-foreground">{number(metaAgencia)}</div>
             </div>
          </div>
        </div>

        {/* TARJETA 2: PROYECCIÓN */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-6 flex flex-col items-center text-center">
          <h3 className="font-bold text-xl text-foreground mb-1">Al cierre de Mes, ¿Cómo Iría mi Agencia?</h3>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-8">Proyección de la Meta Mensual</p>
          
          {/* CORRECCIÓN DE COLOR AQUÍ: */}
          <GaugeChart pct={pctProyeccion} color="#159a43" />
          
          <div className="grid grid-cols-3 gap-4 w-full mt-10 divide-x divide-border/60">
             <div>
               <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Proyección</div>
               <div className="text-3xl font-light text-[hsl(142_71%_35%)]">{number(proyeccionAgencia)}</div>
             </div>
             <div>
               <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Faltante</div>
               <div className="text-3xl font-light text-[hsl(348_83%_55%)]">{number(faltanteProyectado)}</div>
             </div>
             <div>
               <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Meta</div>
               <div className="text-3xl font-light text-foreground">{number(metaAgencia)}</div>
             </div>
          </div>
        </div>
      </div>

      {/* TARJETA 3: RITMO DIARIO */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-muted/20 pointer-events-none"></div>
        
        <h3 className="text-center font-bold text-xl text-foreground mb-8 relative z-10">En términos de días laborales:</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center max-w-5xl mx-auto relative z-10 divide-y md:divide-y-0 md:divide-x divide-border/60">
          
          {/* Ritmo 1: Transcurrido */}
          <div className="flex flex-col items-center px-4 pt-4 md:pt-0">
            <div className="text-5xl font-light text-[hsl(142_71%_35%)] mb-3">{ritmoHastaFecha}</div>
            <p className="text-xs text-muted-foreground max-w-[200px] leading-relaxed">
              Hasta la fecha, es como si hubiese colocado ... créditos por día laboral
            </p>
          </div>

          {/* Ritmo 2: Restante (Etiqueta elegante en lugar de globo roto) */}
          <div className="flex flex-col items-center px-4 pt-4 md:pt-0">
            <div className="text-5xl font-bold text-[hsl(348_83%_55%)] mb-2">{ritmoDesdeHoy}</div>
            
            {/* ETIQUETA MODERNA "MI META DE HOY" */}
            <span className="mb-3 inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-red-700 ring-1 ring-inset ring-red-600/20 dark:bg-red-900/30 dark:text-red-400">
              Mi meta de hoy
            </span>

            <p className="text-xs text-muted-foreground max-w-[220px] leading-relaxed">
              Cada uno de estos días restantes, tengo que colocar ... créditos para llegar a mi meta
            </p>
          </div>

          {/* Ritmo 3: Histórico/Total */}
          <div className="flex flex-col items-center px-4 pt-4 md:pt-0">
            <div className="text-5xl font-light text-foreground/80 mb-3">{ritmoReferencia}</div>
            <p className="text-xs text-muted-foreground max-w-[220px] leading-relaxed">
              Como referencia, si durante el mes coloco ... créditos por día laboral llego a mi meta
            </p>
          </div>

        </div>
      </div>

      {/* BLOQUE ASESORES */}
      <SectionBand tone="green">A NIVEL DE ASESORES</SectionBand>

      <div className="bg-card rounded-xl border border-border shadow-[var(--shadow-soft)] p-6">
        <h3 className="font-bold text-lg text-foreground mb-1">¿Qué tan productivos son mis asesores?</h3>
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-6">Productividad Ideal · Colocaciones por Día</p>
        
        <div className="flex gap-4 mb-8">
           <div className="bg-muted/30 p-3 px-5 rounded-xl border border-border/50">
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">Productividad Ideal</div>
              <div className="text-2xl font-bold">{prodIdeal}</div>
            </div>
            <div className="bg-muted/30 p-3 px-5 rounded-xl border border-border/50">
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">Créditos por día laboral</div>
              <div className="text-2xl font-bold">{prodIdeal}</div>
            </div>
        </div>

        <div className="grid gap-8 xl:grid-cols-2 items-start">
          {/* TABLA DE CLASIFICACIÓN CON SCROLL INTERNO */}
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="max-h-[500px] overflow-y-auto mobile-scroll">
              <table className="w-full text-[13px] whitespace-nowrap">
                <thead className="sticky top-0 bg-card shadow-sm z-10">
                  <tr className="border-b border-border bg-muted/20">
                    <th className="px-3 py-3 text-left font-bold">Asesor</th>
                    <th className="px-3 py-3 text-right font-bold">Logrado</th>
                    <th className="px-3 py-3 text-right font-bold">Productividad</th>
                    <th className="px-3 py-3 text-right font-bold">Proyección</th>
                    <th className="px-3 py-3 text-right font-bold">Faltante por<br/>Día Restante</th>
                    <th className="px-3 py-3 text-right font-bold">Faltante Exigente<br/>por Día Restante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {dataAsesores.map((a: any) => (
                    <tr key={a.asesor} className="hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2.5 text-left font-semibold">{a.asesor}</td>
                      <td className="px-3 py-2.5 text-right font-mono">{a.logrado}</td>
                      <td className="px-3 py-2.5 text-right font-mono">{a.productividad}</td>
                      <td className="px-3 py-2.5 text-right font-mono">{a.proyeccion}</td>
                      <td className="px-3 py-2.5 text-right font-mono">{a.faltanteExigente}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-[hsl(35_80%_40%)] font-bold">{Math.ceil(Number(a.faltanteExigente))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* BARRAS DE PROYECCIÓN VS LOGRADO CON SCROLL INTERNO */}
          <div className="border border-border rounded-lg p-4 bg-muted/5">
            <h4 className="font-bold text-sm mb-4">Cumplimiento de la Meta por Analista</h4>
            <div className="space-y-4 max-h-[440px] overflow-y-auto mobile-scroll pr-8">
              {dataAsesores.map((a: any) => (
                <div key={`bar-${a.asesor}`} className="grid grid-cols-[120px_1fr] items-center gap-4">
                  <div className="text-[11px] font-semibold text-right truncate cursor-default" title={a.asesor}>{a.asesor}</div>
                  <div className="relative h-5 w-full bg-muted rounded-r-md">
                    <div 
                      className="absolute top-0 left-0 h-full bg-border rounded-r-md transition-all duration-700" 
                      style={{ width: `${(a.proyeccion / maxProyeccion) * 100}%` }}
                    >
                       <span className="absolute -right-5 top-0.5 text-[10px] font-bold text-muted-foreground">{a.proyeccion}</span>
                    </div>
                    <div 
                      className="absolute top-0 left-0 h-full bg-[hsl(202_76%_41%)] rounded-r-md transition-all duration-700 z-10" 
                      style={{ width: `${(a.logrado / maxProyeccion) * 100}%` }}
                    >
                      <span className="absolute -right-4 top-0.5 text-[10px] font-bold text-[hsl(202_76%_25%)] drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">{a.logrado}</span>
                    </div>
                    {/* Línea de Meta Roja Dinámica por Asesor */}
                    <div 
                      className="absolute top-[-4px] bottom-[-4px] border-l-2 border-red-500 z-20"
                      style={{ left: `${(a.metaAsesor / maxProyeccion) * 100}%` }}
                      title={`Meta: ${a.metaAsesor}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
        </div>
      </div>

    </div>
  );
}

function Gauge({ value, label, valueText }: { value: number; label: string; valueText: string }) {
  return <div className="text-center"><div className="relative mx-auto h-32 w-32 overflow-hidden"><div className="absolute inset-0 rounded-full border-[15px] border-muted" /><div className="absolute inset-0 rounded-full border-[15px] border-[hsl(138_72%_32%)]" style={{ clipPath: `polygon(0 0, ${value}% 0, ${value}% 100%, 0 100%)` }} /><div className="absolute inset-7 flex items-center justify-center rounded-full bg-card"><span className="font-display text-2xl font-bold">{value}%</span></div></div><div className="mt-2 text-[11px] text-muted-foreground">{label}</div><div className="mt-1 font-mono text-lg font-bold">{valueText}</div></div>;
}

function KpiLine({ label, value, note, tone = 'normal' }: { label: string; value: string; note: string; tone?: 'normal' | 'warn' | 'good' }) {
  const color = tone === 'good' ? 'text-[hsl(var(--primary))]' : tone === 'warn' ? 'text-[hsl(35_70%_35%)]' : 'text-foreground';
  return <div className="flex items-center justify-between rounded-xl bg-muted/60 p-3"><div><div className="text-xs font-semibold">{label}</div><div className="mt-1 text-[11px] text-muted-foreground">{note}</div></div><div className={`font-display text-2xl font-bold ${color}`}>{value}</div></div>;
}

function ProductividadDiariaView() {
  const countData = dailyRows.map((row) => ({ agency: row.agency, value: Math.round((row.achievedCount / row.targetCount) * 100) }));
  const amountData = dailyRows.map((row) => ({ agency: row.agency, value: Math.round((row.achievedAmount / row.targetAmount) * 100) }));
  return <div className="space-y-5"><SectionBand tone="blue">Productividad diaria</SectionBand><div className="grid gap-5 xl:grid-cols-2"><DailyTable title="Respecto a la cantidad de colocaciones" mode="count" /><DailyTable title="Respecto al monto de colocaciones" mode="amount" /></div><div className="grid gap-5 xl:grid-cols-2"><ComplianceChart title="Cumplimiento porcentual de la meta · cantidad" data={countData} /><ComplianceChart title="Cumplimiento porcentual de la meta · monto" data={amountData} /></div><Panel title="Cantidad y monto de colocaciones por asesor" eyebrow="Detalle de la fecha seleccionada"><TableShell minWidth="520px"><table className="data-table"><thead><tr><th>Asesor</th><th>Operaciones</th><th>Desembolsos</th></tr></thead><tbody>{advisors.slice(0, 13).map((row, index) => <tr key={row.advisor}><td>{row.advisor}</td><td>{index % 3}</td><td>{money(index % 3 ? row.disbursements / 8 : 0)}</td></tr>)}</tbody><tfoot><tr><td>Total</td><td>24</td><td>{money(63592)}</td></tr></tfoot></table></TableShell></Panel></div>;
}

function DailyTable({ title, mode }: { title: string; mode: 'count' | 'amount' }) {
  return <Panel title={title} eyebrow="Metas, proyecciones y colocaciones logradas"><TableShell minWidth="760px"><table className="data-table"><thead><tr><th>Agencia</th><th>{mode === 'count' ? '# Meta' : 'S/ Meta'}</th><th>{mode === 'count' ? '# Proyección' : 'S/ Proyección'}</th><th>{mode === 'count' ? '# Logrado' : 'S/ Logrado'}</th><th>Faltante a proyección</th><th>Faltante a meta</th></tr></thead><tbody>{dailyRows.map((row) => { const target = mode === 'count' ? row.targetCount : row.targetAmount; const projection = mode === 'count' ? row.projectionCount : row.projectionAmount; const achieved = mode === 'count' ? row.achievedCount : row.achievedAmount; return <tr key={row.agency}><td className="font-semibold">{row.agency}</td><td className="bg-[hsl(var(--accent)/.22)]">{mode === 'count' ? target : money(target)}</td><td>{mode === 'count' ? projection : money(projection)}</td><td className="text-[hsl(var(--primary))]">{mode === 'count' ? achieved : money(achieved)}</td><td className="text-[hsl(var(--destructive))]">-{mode === 'count' ? number(projection - achieved) : money(projection - achieved)}</td><td className="text-[hsl(var(--destructive))]">-{mode === 'count' ? number(target - achieved) : money(target - achieved)}</td></tr>; })}</tbody><tfoot><tr><td>Total</td><td>{mode === 'count' ? 157 : money(333426)}</td><td>{mode === 'count' ? 140 : money(353000)}</td><td>{mode === 'count' ? 24 : money(63592)}</td><td>{mode === 'count' ? '-116' : `-${money(259908)}`}</td><td>{mode === 'count' ? '-133' : `-${money(269834)}`}</td></tr></tfoot></table></TableShell></Panel>;
}

function ComplianceChart({ title, data }: { title: string; data: { agency: string; value: number }[] }) {
  return <Panel title={title} eyebrow="% avanzado · % faltante"><div className="h-[340px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.slice().sort((a, b) => a.value - b.value)} layout="vertical" margin={{ left: 22, right: 10 }}><CartesianGrid horizontal={false} stroke="#e7e0d4" /><XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fontSize: 10, fill: '#8b8a84' }} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="agency" width={96} tick={{ fontSize: 10, fill: '#5b5f66' }} axisLine={false} tickLine={false} /><Tooltip formatter={(value: number) => `${value}%`} /><Bar dataKey="value" name="Avanzado" fill="#0f5b9a" radius={[0, 4, 4, 0]} barSize={17}>{data.map((item) => <Cell key={item.agency} fill={item.value >= 75 ? '#087f73' : item.value >= 30 ? '#0f5b9a' : '#f29a76'} />)}</Bar></BarChart></ResponsiveContainer></div></Panel>;
}

function PreventivaView({ filters }: { filters: Filters }) {
  // Consumimos la API real de nuestro backend
  const { data: creditos, isLoading, error } = useQuery({
    queryKey: ['gestion-preventiva'],
    queryFn: async () => {
      // Ajusta este puerto si tu backend corre en otro
      const res = await fetch('http://localhost:3000/api/gestion-preventiva');
      if (!res.ok) throw new Error('Error de red');
      return res.json();
    }
  });

  if (isLoading) return <LoadingState />;
  if (error) return <div className="p-4 text-red-500">Error al cargar datos del DWH. Verifica la conexión a SQL Server.</div>;

  // Filtrado dinámico por agencia en el frontend
  const datosFiltrados = filters.agency === 'Todas' 
    ? creditos 
    : creditos.filter((c: any) => c.agencia === filters.agency);

  return (
    <div className="space-y-5">
      <SectionBand tone="coral">Próximos a Vencer (5 Días)</SectionBand>
      <Panel title="Gestión Preventiva" eyebrow="Cartera en riesgo inminente">
        <TableShell minWidth="1000px">
          <table className="data-table">
            <thead>
              <tr>
                <th>Agencia</th>
                <th>Socio</th>
                <th>Teléfono</th>
                <th>Producto</th>
                <th>Analista</th>
                <th>Vencimiento</th>
                <th>Días Faltantes</th>
                <th>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {datosFiltrados?.map((row: any, i: number) => (
                <tr key={i}>
                  <td className="font-semibold">{row.agencia}</td>
                  <td className="truncate max-w-[200px]" title={row.socio}>{row.socio}</td>
                  <td className="font-mono text-xs">{row.telefono}</td>
                  <td className="text-xs text-muted-foreground">{row.producto}</td>
                  <td>{row.analista}</td>
                  <td className="font-mono">{row.fecha_vencimiento}</td>
                  <td className="text-center">
                    <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                      row.dias_para_vencimiento === 0 ? 'bg-red-100 text-red-700' :
                      row.dias_para_vencimiento <= 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {row.dias_para_vencimiento === 0 ? 'HOY' : `${row.dias_para_vencimiento} días`}
                    </span>
                  </td>
                  <td className="text-right font-mono font-semibold">S/ {row.saldo_formateado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      </Panel>
    </div>
  );
}

export default App;