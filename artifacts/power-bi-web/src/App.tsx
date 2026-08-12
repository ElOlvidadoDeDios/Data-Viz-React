import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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

const agencyNames = ['Todas', ...agencies.map((item) => item.agency)];
const advisorNames = ['Todos', ...advisors.map((item) => item.advisor)];

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
  const [filters, setFilters] = useState<Filters>({ period: '202608', agency: 'Todas', advisor: 'Todos', day: 'Hoy' });
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
  const resetFilters = () => { setFilters({ period: '202608', agency: 'Todas', advisor: 'Todos', day: 'Hoy' }); toast.success('Filtros restablecidos'); };

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
          <FilterBar filters={filters} setFilters={setFilters} showFilters={showFilters} setShowFilters={setShowFilters} resetFilters={resetFilters} />
          <div className="mb-6 flex items-center justify-between text-[11px] text-muted-foreground"><span>Actualizado {lastUpdated} · Fuente: modelo local preparado para conectar</span><button data-testid="button-data-definition" onClick={() => toast.info('Meta, proyección y faltante se calculan con los días laborales y el avance del periodo')} className="flex items-center gap-1.5 hover:text-foreground"><CircleHelp size={13} />¿Cómo se calcula?</button></div>
          {isRefreshing ? <LoadingState /> : <DashboardView activeView={activeView} filters={filters} navigate={navigate} />}
        </div>
      </main>
    </div>
  );
}

function FilterBar({ filters, setFilters, showFilters, setShowFilters, resetFilters }: { filters: Filters; setFilters: React.Dispatch<React.SetStateAction<Filters>>; showFilters: boolean; setShowFilters: (value: boolean) => void; resetFilters: () => void }) {
  const options: { key: keyof Filters; label: string; values: string[] }[] = [
    { key: 'period', label: 'Periodo', values: ['202608', '202607', '202606', '202605'] },
    { key: 'agency', label: 'Agencia', values: agencyNames },
    { key: 'advisor', label: 'Asesor', values: advisorNames },
    { key: 'day', label: 'Fecha', values: ['Hoy', 'Ayer', 'Últimos 7 días'] },
  ];
  return <section className="mb-4 rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-soft)]"><div className="flex flex-wrap items-center gap-2"><button data-testid="button-toggle-filters" onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${showFilters ? 'bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]' : 'text-muted-foreground hover:bg-muted'}`}><Filter size={14} />Filtros</button>{showFilters && options.map(({ key, label, values }) => <label key={key} className="relative flex items-center gap-2 rounded-xl border border-border bg-[hsl(var(--background)/.65)] px-3 py-2 text-xs"><span className="text-muted-foreground">{label}</span><select data-testid={`select-filter-${key}`} value={filters[key]} onChange={(e) => setFilters((current) => ({ ...current, [key]: e.target.value }))} className="max-w-[155px] cursor-pointer appearance-none bg-transparent pr-4 font-semibold outline-none"><option>{values[0]}</option>{values.slice(1).map((value) => <option key={value}>{value}</option>)}</select><ChevronDown size={12} className="pointer-events-none absolute right-2.5 text-muted-foreground" /></label>)}<div className="ml-auto flex items-center gap-2"><button data-testid="button-reset-filters" onClick={resetFilters} className="rounded-lg px-2.5 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground">Limpiar</button><span className="hidden items-center gap-1.5 border-l border-border pl-3 text-[10px] text-muted-foreground md:flex"><span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))]" />Sincronizado</span></div></div></section>;
}

function DashboardView({ activeView, filters, navigate }: { activeView: View; filters: Filters; navigate: (view: View) => void }) {
  if (activeView === 'supervision') return <SupervisionAgenciasView navigate={navigate} />;
  if (activeView === 'agencia') return <AgenciaView filters={filters} />;
  if (activeView === 'asesores') return <AsesoresView />;
  if (activeView === 'colocaciones') return <ColocacionesView />;
  if (activeView === 'diaria') return <ProductividadDiariaView />;
  return <GerenciaView navigate={navigate} />;
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

function WorkdayStrip() {
  return <div className="grid gap-3 sm:grid-cols-3"><KpiCard label="Días laborales totales" value="25" note="Periodo 202608" icon={CalendarDays} tone="blue" /><KpiCard label="Días transcurridos" value="7" note="28% del periodo" icon={Clock3} tone="teal" /><KpiCard label="Días restantes" value="18" note="72% para cerrar la meta" icon={Target} tone="red" /></div>;
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
  return <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[10px] font-semibold ${good ? 'bg-[hsl(138_72%_32%/.11)] text-[hsl(138_72%_25%)]' : 'bg-[hsl(var(--destructive)/.11)] text-[hsl(var(--destructive))]'}`}>{good ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}{money(value)}</span>;
}

function GerenciaView({ navigate }: { navigate: (view: View) => void }) {
  const topAgencies = agencies.slice().sort((a, b) => b.growth - a.growth).slice(0, 7);
  return <div className="space-y-5">
    <WorkdayStrip />
    <SectionBand>Indicadores · Avances</SectionBand>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><KpiCard label="Colocación acumulada" value={money(743)} note="Logrado a la fecha · demo" icon={TrendingUp} delta="+21%" /><KpiCard label="Meta mensual" value={number(3581)} note="Operaciones objetivo" icon={Target} tone="gold" /><KpiCard label="Proyección" value={number(2415)} note="Cierre proyectado del mes" icon={BarChart3} tone="blue" /><KpiCard label="Faltante a meta" value={number(2838)} note="Operaciones por colocar" icon={AlertTriangle} tone="red" delta="-79%" /></div>
    <div className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
      <Panel title="Avance de colocaciones" eyebrow="Meta, logrado y proyección · operaciones" action={<button onClick={() => navigate('colocaciones')} className="text-xs font-semibold text-[hsl(var(--primary))] hover:underline">Ver colocaciones →</button>}><div className="h-[280px]"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={trendData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}><CartesianGrid vertical={false} stroke="#e7e0d4" strokeDasharray="3 3" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#8b8a84', fontSize: 10 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#8b8a84', fontSize: 10 }} /><Tooltip /><Area type="monotone" dataKey="achieved" name="Logrado" stroke="#087f73" fill="#087f73" fillOpacity=".14" strokeWidth={3} /><Line type="monotone" dataKey="target" name="Meta" stroke="#f4a72c" strokeDasharray="5 5" dot={false} strokeWidth={2} /></ComposedChart></ResponsiveContainer></div></Panel>
      <Panel title="Lectura ejecutiva" eyebrow="Señales para hoy"><div className="space-y-3"><Signal icon={TrendingUp} title="Crecimiento neto positivo" text="Wanchaq, Quillabamba y Pucallpa lideran el avance." tone="good" /><Signal icon={AlertTriangle} title="Mora deficiente requiere atención" text="Tica Tica supera el máximo permitido del periodo." tone="bad" /><Signal icon={Clock3} title="18 días laborales restantes" text="La productividad diaria debe acelerar para cubrir el faltante." tone="warn" /></div></Panel>
    </div>
    <div className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]"><Panel title="Agencias con mayor crecimiento" eyebrow="Crecimiento neto 150 · orden descendente"><div className="space-y-3">{topAgencies.map((item) => <div key={item.agency} className="grid grid-cols-[1.2fr_1fr_88px] items-center gap-3 text-xs"><span className="font-semibold">{item.agency}</span><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-[hsl(var(--primary))]" style={{ width: `${Math.min(100, Math.max(8, item.growth / 4000))}%` }} /></div><span className={`text-right font-mono ${item.growth < 0 ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--primary))]'}`}>{item.growth >= 0 ? '+' : ''}{money(item.growth)}</span></div>)}</div></Panel><Panel title="Cumplimiento del periodo" eyebrow="A nivel de agencia"><CompletionBar achieved={743} target={3581} /><div className="mt-6 grid grid-cols-2 gap-3"><MiniMetric label="Cartera" value={money(31497983)} /><MiniMetric label="Repagos" value={money(5427401)} /></div></Panel></div>
  </div>;
}

function Signal({ icon: Icon, title, text, tone }: { icon: typeof TrendingUp; title: string; text: string; tone: 'good' | 'bad' | 'warn' }) {
  const classes = { good: 'bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]', bad: 'bg-[hsl(var(--destructive)/.1)] text-[hsl(var(--destructive))]', warn: 'bg-[hsl(var(--accent)/.17)] text-[hsl(35_70%_35%)]' }[tone];
  return <div className="flex items-start gap-3 rounded-xl p-2.5 transition hover:bg-muted"><div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${classes}`}><Icon size={15} /></div><div><div className="text-xs font-semibold">{title}</div><div className="mt-0.5 text-[11px] leading-5 text-muted-foreground">{text}</div></div></div>;
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-muted/70 p-3"><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div><div className="mt-2 font-display text-lg font-bold">{value}</div></div>;
}

function SupervisionAgenciasView({ navigate }: { navigate: (view: View) => void }) {
  return <div className="space-y-5"><SectionBand tone="blue">Agencia completa · Comercial + Recuperadores</SectionBand><Panel title="Indicadores por agencia" eyebrow="Crecimiento neto 150 · cartera y mora" action={<button onClick={() => navigate('agencia')} className="text-xs font-semibold text-[hsl(var(--primary))] hover:underline">Abrir detalle →</button>}><TableShell minWidth="1120px"><table className="data-table"><thead><tr><th>Agencia</th><th>Crecimiento neto</th><th>Meta ope.</th><th>Nro. ope.</th><th>Plazo</th><th>Nro. socios</th><th>Colocación</th><th>Cartera</th><th>Mora CPP máx.</th><th>Mora CPP actual</th><th>Mora def. actual</th><th>Repagos</th></tr></thead><tbody>{agencies.map((row) => <tr key={row.agency} onClick={() => navigate('agencia')} className="cursor-pointer"><td className="font-semibold">{row.agency}</td><td className={row.growth < 0 ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--primary))]'}>{row.growth >= 0 ? '+' : ''}{money(row.growth)}</td><td className="bg-[hsl(var(--accent)/.25)] font-mono">{Math.round(row.operations * 1.15)}</td><td className="font-mono">{row.operations}</td><td className="font-mono">{(5.7 + (row.operations % 10) / 10).toFixed(2)}</td><td className="font-mono">{number(row.operations * 4 + 92)}</td><td>{money(row.disbursements)}</td><td>{money(row.portfolio)}</td><td className="bg-[hsl(var(--accent)/.25)]">{money(row.cppMax)}</td><td><StatusCell value={row.cppActual} threshold={row.cppMax} /></td><td><StatusCell value={row.deficientActual} threshold={row.deficientMax} /></td><td>{money(row.repayments)}</td></tr>)}</tbody><tfoot><tr><td>Total</td><td>+{money(2142580)}</td><td>2719</td><td>2846</td><td>6.34</td><td>8591</td><td>{money(7806365)}</td><td>{money(31147983)}</td><td>{money(3114798)}</td><td className="text-[hsl(var(--destructive))]">{money(4034282)}</td><td>{money(1903846)}</td><td>{money(5427401)}</td></tr></tfoot></table></TableShell></Panel><SectionBand tone="coral">Agencias · Parte Recuperación</SectionBand><Panel title="Recuperación por agencia" eyebrow="Cartera de inicio, mora deficiente y repagos"><TableShell minWidth="780px"><table className="data-table"><thead><tr><th>Agencia</th><th>Recuperador</th><th>Crecimiento neto</th><th>Cartera de inicio</th><th>Mora CPP máx.</th><th>Mora CPP actual</th><th>Mora def. máx.</th><th>Mora def. actual</th><th>Repagos</th></tr></thead><tbody>{['Tica Tica', 'Lima Los Olivos', 'Juliaca', 'Molino', 'Sicuani', 'San Jerónimo', 'Wanchaq'].map((agency, index) => <tr key={agency}><td className="font-semibold">{agency}</td><td>{['Jhack AE', 'Jesus CR', 'Diego HC', 'Michael PC', 'Wilmer JH', 'Estefane HR', 'Dos R'][index]}</td><td className="text-[hsl(var(--destructive))]">-{money(42106 - index * 3710)}</td><td>{money(519520 + index * 18200)}</td><td className="bg-[hsl(var(--accent)/.25)]">{money(51952 + index * 7906)}</td><td className="text-[hsl(var(--destructive))]">{money(269064 - index * 15300)}</td><td className="bg-[hsl(var(--accent)/.25)]">{money(10390 + index * 1581)}</td><td className="text-[hsl(var(--destructive))]">{money(197217 - index * 15300)}</td><td>{money(1124 + index * 7107)}</td></tr>)}</tbody></table></TableShell></Panel></div>;
}

function AgenciaView({ filters }: { filters: Filters }) {
  const selected = filters.agency === 'Todas' ? agencies[12] : agencies.find((item) => item.agency === filters.agency) ?? agencies[12];
  const detailAdvisors = advisors.slice(0, 8);
  return <div className="space-y-5"><SectionBand tone="blue">{selected.agency} · Parte Comercial</SectionBand><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><KpiCard label="Crecimiento neto 150" value={money(selected.growth)} note="Variación de cartera" icon={TrendingUp} delta={selected.growth >= 0 ? '+12%' : '-8%'} /><KpiCard label="Colocación" value={money(selected.disbursements)} note={`${selected.operations} operaciones`} icon={BarChart3} tone="gold" /><KpiCard label="Cartera" value={money(selected.portfolio)} note="Saldo vigente" icon={Building2} tone="blue" /><KpiCard label="Mora CPP actual" value={money(selected.cppActual)} note={`Máximo ${money(selected.cppMax)}`} icon={AlertTriangle} tone="red" /></div><Panel title={`Desempeño de ${selected.agency}`} eyebrow="Comercial · periodo seleccionado"><div className="grid gap-4 md:grid-cols-3"><MiniMetric label="Repagos" value={money(selected.repayments)} /><MiniMetric label="Nro. operaciones" value={number(selected.operations)} /><MiniMetric label="Nro. socios" value={number(selected.operations * 4 + 92)} /></div><div className="mt-6"><CompletionBar achieved={selected.operations} target={Math.round(selected.operations * 1.15)} label="Cumplimiento de operaciones frente a meta" /></div></Panel><SectionBand tone="coral">Agencia · Parte Recuperación</SectionBand><Panel title="Indicadores por asesor" eyebrow="Asesores asignados a la agencia"><TableShell minWidth="960px"><table className="data-table"><thead><tr><th>Asesor</th><th>Crecimiento neto</th><th>Colocación</th><th>Repagos</th><th>TEA</th><th>Operaciones</th><th>Plazo</th><th>Socios</th><th>Cartera</th><th>Mora CPP actual</th><th>Mora def. actual</th></tr></thead><tbody>{detailAdvisors.map((row, index) => <tr key={row.advisor}><td className="font-semibold">{row.advisor}</td><td className="text-[hsl(var(--primary))]">+{money(row.netGrowth)}</td><td>{money(row.disbursements)}</td><td>{money(row.repayments)}</td><td>{(90 + index * 1.27).toFixed(2)}</td><td>{index + 5}</td><td>{(6.4 + index / 2).toFixed(2)}</td><td className="bg-[hsl(var(--accent)/.25)]">{57 + index * 8}</td><td>{money(row.portfolio)}</td><td className={row.moraPct > 10 ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--primary))]'}>{money(row.mora)}</td><td className={row.moraPct > 10 ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--primary))]'}>{money(row.mora * 0.4)}</td></tr>)}</tbody></table></TableShell></Panel></div>;
}

function AsesoresView() {
  return <div className="space-y-5"><WorkdayStrip /><SectionBand>Indicadores de asesores</SectionBand><Panel title="Todos los indicadores de bonificación" eyebrow="Cartera y crecimiento neto 150 · meta individual S/ 20K"><TableShell minWidth="1080px"><table className="data-table"><thead><tr><th>Asesor</th><th>Cartera</th><th>Desembolsos</th><th>Repagos</th><th>Crecimiento neto</th><th>Mora 150</th><th>% Mora 150</th><th>Faltante a S/ 20K</th></tr></thead><tbody>{advisors.map((row, index) => <tr key={row.advisor}><td className="font-semibold">{row.advisor}</td><td>{money(row.portfolio)}</td><td>{money(row.disbursements)}</td><td>{money(row.repayments)}</td><td className={row.netGrowth < 0 ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--primary))]'}>{row.netGrowth >= 0 ? '+' : ''}{money(row.netGrowth)}</td><td className={row.moraPct > 10 ? 'bg-[hsl(var(--destructive)/.12)] text-[hsl(var(--destructive))]' : 'text-[hsl(var(--primary))]'}>{money(row.mora)}</td><td className={row.moraPct > 10 ? 'bg-[hsl(var(--destructive)/.12)] text-[hsl(var(--destructive))]' : 'text-[hsl(var(--primary))]'}>{percent(row.moraPct)}</td><td className="bg-[hsl(var(--accent)/.25)]">{money(row.missing)}</td></tr>)}</tbody><tfoot><tr><td>Total</td><td>{money(2938646)}</td><td>{money(273910)}</td><td>{money(164717)}</td><td>{money(109193)}</td><td>{money(527610)}</td><td>19.24%</td><td>{money(750747)}</td></tr></tfoot></table></TableShell></Panel><div className="grid gap-5 lg:grid-cols-3"><AdvisorMiniTable title="Operaciones" rows={advisors.slice(0, 6).map((row, index) => ({ name: row.advisor, value: index + 1, extra: index % 2 ? 2 : 0 }))} /><AdvisorMiniTable title="Duración" rows={advisors.slice(0, 6).map((row, index) => ({ name: row.advisor, value: (6.2 + index / 3).toFixed(2), extra: '' }))} /><AdvisorMiniTable title="Número de socios" rows={advisors.slice(0, 6).map((row, index) => ({ name: row.advisor, value: 45 + index * 9, extra: 69 + index * 4 }))} /></div><Panel title="Mora CPP y mora vencida" eyebrow="Excedentes frente a máximos"><div className="grid gap-4 md:grid-cols-2"><MoraBlock title="Mora CPP" rows={advisors.slice(0, 6)} /><MoraBlock title="Mora vencida" rows={advisors.slice(2, 8)} /></div></Panel></div>;
}

function AdvisorMiniTable({ title, rows }: { title: string; rows: { name: string; value: number | string; extra: number | string }[] }) {
  return <Panel title={title} eyebrow="Indicadores por asesor"><div className="space-y-2">{rows.map((row) => <div key={row.name} className="grid grid-cols-[1fr_62px_62px] items-center border-b border-border/60 pb-2 text-[11px] last:border-0"><span>{row.name}</span><span className="text-right font-mono">{row.value}</span><span className="text-right font-mono text-muted-foreground">{row.extra}</span></div>)}</div></Panel>;
}

function MoraBlock({ title, rows }: { title: string; rows: AdvisorRow[] }) {
  return <div className="rounded-xl border border-border p-4"><div className="mb-3 font-display text-sm font-bold">{title}</div><div className="space-y-2">{rows.map((row) => <div key={row.advisor} className="grid grid-cols-[1fr_70px_58px] items-center text-[11px]"><span>{row.advisor}</span><span className="text-right font-mono">{percent(row.moraPct)}</span><span className={`text-right font-mono ${row.moraPct > 10 ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--primary))]'}`}>{row.moraPct > 10 ? 'Excede' : 'OK'}</span></div>)}</div></div>;
}

function ColocacionesView() {
  const productivity = advisors.slice(0, 10).map((row, index) => ({ ...row, achieved: index < 3 ? 1 : index < 7 ? 2 : 0, projection: index < 3 ? 0.13 : 1.61, missing: index < 3 ? 3 : 7 }));
  return <div className="space-y-5"><WorkdayStrip /><SectionBand tone="coral">A nivel de agencia</SectionBand><div className="grid gap-5 md:grid-cols-2"><Panel title="Hasta hoy, ¿cómo va mi agencia?" eyebrow="Cumplimiento porcentual de la meta mensual"><div className="grid gap-5 sm:grid-cols-2"><Gauge value={21} label="Logrado a la fecha" valueText="743" /><Gauge value={67} label="Proyección del mes" valueText="2,415" /></div><div className="mt-5 grid grid-cols-3 gap-3"><MiniMetric label="Logrado" value="743" /><MiniMetric label="Faltante" value="2,838" /><MiniMetric label="Meta" value="3,581" /></div></Panel><Panel title="Ritmo en días laborales" eyebrow="Cuánto falta para llegar a la meta"><div className="space-y-4"><KpiLine label="Hasta la fecha" value="106" note="colocaciones requeridas" /><KpiLine label="Desde hoy" value="158" note="por día restante" tone="warn" /><KpiLine label="Referencia" value="143" note="promedio de los últimos 30 días" tone="good" /></div><div className="mt-5 rounded-xl bg-[hsl(var(--accent)/.13)] p-3 text-xs text-muted-foreground"><strong className="text-foreground">Mi hoy:</strong> acelerar la productividad de asesores bajo 75% de meta.</div></Panel></div><SectionBand>A nivel de asesores</SectionBand><Panel title="¿Qué tan productivos son mis asesores?" eyebrow="Productividad ideal · colocaciones por día"><div className="mb-5 grid gap-4 md:grid-cols-3"><MiniMetric label="Productividad ideal" value="1.20" /><MiniMetric label="Créditos por día laboral" value="1.20" /><MiniMetric label="Días restantes" value="18" /></div><TableShell minWidth="780px"><table className="data-table"><thead><tr><th>Asesor</th><th>Logrado</th><th>Productividad</th><th>Faltante</th><th>Faltante exigente / día</th><th>Clasificación</th></tr></thead><tbody>{productivity.map((row) => <tr key={row.advisor}><td className="font-semibold">{row.advisor}</td><td>{row.achieved}</td><td className="font-mono">{row.projection.toFixed(2)}</td><td>{row.missing}</td><td className="bg-[hsl(var(--accent)/.25)]">1.67</td><td><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${row.projection >= 1.2 ? 'bg-[hsl(138_72%_32%/.11)] text-[hsl(138_72%_25%)]' : 'bg-[hsl(var(--accent)/.2)] text-[hsl(35_70%_35%)]'}`}>{row.projection >= 1.2 ? 'Autosuficiente' : 'Necesita asistencia'}</span></td></tr>)}</tbody></table></TableShell></Panel><Panel title="Cantidad de días buenos, regulares y malos" eyebrow="Distribución diaria de colocaciones"><div className="h-[280px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11'].map((day, index) => ({ day, buenos: 8 + index % 4, regulares: 2 + index % 2, malos: index % 3 }))} margin={{ left: -15, right: 5 }}><CartesianGrid vertical={false} stroke="#e7e0d4" /><XAxis dataKey="day" tick={{ fontSize: 10, fill: '#8b8a84' }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 10, fill: '#8b8a84' }} axisLine={false} tickLine={false} /><Tooltip /><Bar dataKey="buenos" stackId="a" fill="#087f73" name="Buenos" /><Bar dataKey="regulares" stackId="a" fill="#448eae" name="Regulares" /><Bar dataKey="malos" stackId="a" fill="#f29a76" name="Malos" /></BarChart></ResponsiveContainer></div></Panel></div>;
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

export default App;