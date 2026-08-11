import { useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster, toast } from 'sonner';
import { ArrowDownRight, ArrowUpRight, BarChart3, Bell, Building2, ChevronDown, CircleHelp, Download, ExternalLink, Filter, LayoutDashboard, Menu, MoreHorizontal, RefreshCw, Search, Share2, Sparkles, Target, TrendingUp, Users, X } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useLocation } from 'wouter';

const queryClient = new QueryClient();

type View = 'resumen' | 'ventas' | 'clientes' | 'regiones';
type Filters = { period: string; region: string; category: string; channel: string };

const months = [
  { month: 'Ene', revenue: 1.18, target: 1.1, orders: 312 },
  { month: 'Feb', revenue: 1.32, target: 1.22, orders: 348 },
  { month: 'Mar', revenue: 1.42, target: 1.34, orders: 385 },
  { month: 'Abr', revenue: 1.57, target: 1.48, orders: 426 },
  { month: 'May', revenue: 1.49, target: 1.55, orders: 402 },
  { month: 'Jun', revenue: 1.76, target: 1.61, orders: 471 },
  { month: 'Jul', revenue: 1.88, target: 1.74, orders: 506 },
  { month: 'Ago', revenue: 1.96, target: 1.84, orders: 533 },
  { month: 'Sep', revenue: 2.08, target: 1.96, orders: 561 },
  { month: 'Oct', revenue: 2.21, target: 2.08, orders: 597 },
  { month: 'Nov', revenue: 2.38, target: 2.2, orders: 642 },
  { month: 'Dic', revenue: 2.51, target: 2.3, orders: 681 },
];
const categories = [
  { category: 'Tecnología', revenue: 7.14, margin: 31.8, share: 30, color: '#087f73' },
  { category: 'Servicios', revenue: 5.38, margin: 42.6, share: 23, color: '#f4a72c' },
  { category: 'Equipamiento', revenue: 4.21, margin: 26.4, share: 18, color: '#448eae' },
  { category: 'Consultoría', revenue: 3.64, margin: 47.2, share: 16, color: '#9672ac' },
  { category: 'Otros', revenue: 2.01, margin: 21.3, share: 13, color: '#d5c5aa' },
];
const regions = [
  { region: 'Norte', revenue: 5.82, growth: 18.4, orders: 1392, coverage: 84 },
  { region: 'Centro', revenue: 7.31, growth: 24.7, orders: 1854, coverage: 96 },
  { region: 'Occidente', revenue: 4.62, growth: 11.2, orders: 1107, coverage: 72 },
  { region: 'Sur', revenue: 3.94, growth: 8.6, orders: 988, coverage: 63 },
  { region: 'Exportación', revenue: 2.69, growth: 31.5, orders: 634, coverage: 41 },
];
const segments = [
  { segment: 'Cuentas clave', customers: 48, revenue: 9.24, retention: 94.8, color: '#087f73' },
  { segment: 'Crecimiento', customers: 126, revenue: 6.88, retention: 82.4, color: '#f4a72c' },
  { segment: 'Recurrentes', customers: 284, revenue: 5.16, retention: 76.2, color: '#448eae' },
  { segment: 'Nuevos', customers: 167, revenue: 3.1, retention: 48.6, color: '#9672ac' },
];
const topCustomers = [
  { name: 'Grupo Altavia', segment: 'Cuenta clave', revenue: 1.28, growth: 32.4, status: 'En expansión' },
  { name: 'Industrias Marea', segment: 'Cuenta clave', revenue: 1.12, growth: 18.7, status: 'Saludable' },
  { name: 'Nova Retail', segment: 'Crecimiento', revenue: 0.94, growth: 27.3, status: 'En expansión' },
  { name: 'Aurea Logística', segment: 'Recurrente', revenue: 0.81, growth: -4.2, status: 'Revisar' },
  { name: 'Metrópoli Salud', segment: 'Crecimiento', revenue: 0.76, growth: 14.1, status: 'Saludable' },
];

const viewMeta: Record<View, { label: string; eyebrow: string; title: string; subtitle: string }> = {
  resumen: { label: 'Resumen ejecutivo', eyebrow: 'Lectura general del negocio', title: 'El negocio está tomando impulso.', subtitle: 'Una vista de 30 segundos para saber dónde poner la atención hoy.' },
  ventas: { label: 'Ventas', eyebrow: 'Ritmo comercial', title: 'La curva comercial se mantiene por encima del plan.', subtitle: 'Evolución, mezcla y productividad para decidir el siguiente movimiento.' },
  clientes: { label: 'Clientes', eyebrow: 'Valor de cartera', title: 'Las cuentas clave están sosteniendo el crecimiento.', subtitle: 'Retención y concentración de clientes para proteger el ingreso futuro.' },
  regiones: { label: 'Regiones', eyebrow: 'Cobertura de mercado', title: 'Centro acelera; Exportación abre una nueva frontera.', subtitle: 'Compara mercados, descubre oportunidades y asigna cobertura con criterio.' },
};

function formatMoney(value: number, decimals = 2) {
  return new Intl.NumberFormat('es-MX', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
}
function money(value: number) { return `$${formatMoney(value)} M`; }

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><Dashboard /><Toaster position="bottom-right" richColors /></TooltipProvider></QueryClientProvider>;
}

function Dashboard() {
  const [location, setLocation] = useLocation();
  const pathView = location.slice(1) as View;
  const activeView: View = viewMeta[pathView] ? pathView : 'resumen';
  const [filters, setFilters] = useState<Filters>({ period: 'Últimos 12 meses', region: 'Todas las regiones', category: 'Todas las categorías', channel: 'Todos los canales' });
  const [mobileNav, setMobileNav] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('hace 8 min');
  const meta = viewMeta[activeView];
  const filterActive = Object.values(filters).some((x) => !x.startsWith('Todas') && !x.startsWith('Todos') && x !== 'Últimos 12 meses');

  const navigate = (view: View) => { setLocation(view === 'resumen' ? '/' : `/${view}`); setMobileNav(false); };
  const resetFilters = () => { setFilters({ period: 'Últimos 12 meses', region: 'Todas las regiones', category: 'Todas las categorías', channel: 'Todos los canales' }); toast.success('Filtros restablecidos'); };
  const refresh = () => { setIsRefreshing(true); setTimeout(() => { setIsRefreshing(false); setLastUpdated('justo ahora'); toast.success('Datos demostrativos actualizados'); }, 650); };

  return (
    <div className="dashboard-noise min-h-[100dvh] bg-background">
      <aside className={`fixed inset-y-0 left-0 z-30 flex w-[256px] flex-col bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))] transition-transform duration-300 md:translate-x-0 ${mobileNav ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-[88px] items-center gap-3 border-b border-[hsl(var(--sidebar-border))] px-7">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))]"><BarChart3 size={22} strokeWidth={2.5} /></div>
          <div><div className="font-display text-[19px] font-bold tracking-[-.04em]">Pulso<span className="text-[hsl(var(--sidebar-primary))]">.</span></div><div className="font-mono text-[9px] uppercase tracking-[.19em] text-[hsl(var(--sidebar-foreground)/.55)]">Business intelligence</div></div>
          <button data-testid="button-close-navigation" className="ml-auto rounded-lg p-1 text-[hsl(var(--sidebar-foreground)/.65)] md:hidden" onClick={() => setMobileNav(false)}><X size={18} /></button>
        </div>
        <div className="flex-1 px-4 py-7">
          <div className="mb-3 px-3 font-mono text-[10px] uppercase tracking-[.16em] text-[hsl(var(--sidebar-foreground)/.42)]">Espacio de trabajo</div>
          <nav className="space-y-1">
            {([['resumen', 'Resumen ejecutivo', LayoutDashboard], ['ventas', 'Ventas', TrendingUp], ['clientes', 'Clientes', Users], ['regiones', 'Regiones', Building2] ] as const).map(([view, label, Icon]) => (
              <button key={view} data-testid={`button-nav-${view}`} onClick={() => navigate(view)} className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-semibold transition-all ${activeView === view ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))] shadow-[inset_3px_0_0_hsl(var(--sidebar-primary))]' : 'text-[hsl(var(--sidebar-foreground)/.64)] hover:bg-[hsl(var(--sidebar-accent)/.7)] hover:text-[hsl(var(--sidebar-foreground))]'}`}><Icon size={17} strokeWidth={activeView === view ? 2.4 : 1.8} /><span>{label}</span>{activeView === view && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[hsl(var(--sidebar-primary))]" />}</button>
            ))}
          </nav>
          <div className="mt-10 mb-3 px-3 font-mono text-[10px] uppercase tracking-[.16em] text-[hsl(var(--sidebar-foreground)/.42)]">Atajos</div>
          <div className="space-y-1">
            <button data-testid="button-create-view" onClick={() => toast.info('Los espacios personalizados estarán disponibles al conectar tus datos')} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] text-[hsl(var(--sidebar-foreground)/.62)] hover:bg-[hsl(var(--sidebar-accent)/.7)]"><Sparkles size={17} /><span>Crear vista</span><span className="ml-auto font-mono text-[10px] text-[hsl(var(--sidebar-foreground)/.4)]">⌘K</span></button>
            <button data-testid="button-help" onClick={() => toast.info('Centro de ayuda: revisa las definiciones del modelo y las medidas clave')} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] text-[hsl(var(--sidebar-foreground)/.62)] hover:bg-[hsl(var(--sidebar-accent)/.7)]"><CircleHelp size={17} /><span>Ayuda y definiciones</span></button>
          </div>
        </div>
        <div className="m-4 rounded-2xl border border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-accent)/.55)] p-4">
          <div className="mb-3 flex items-center justify-between"><span className="font-mono text-[9px] uppercase tracking-[.13em] text-[hsl(var(--sidebar-foreground)/.5)]">Modelo de datos</span><span className="flex items-center gap-1 text-[10px] text-[hsl(var(--sidebar-primary))]"><span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--sidebar-primary))] animate-pulse-soft" />Demo local</span></div>
          <div className="text-[12px] leading-5 text-[hsl(var(--sidebar-foreground)/.7)]">Listo para conectar<br />ventas · clientes · regiones</div>
        </div>
        <div className="flex items-center gap-3 border-t border-[hsl(var(--sidebar-border))] px-6 py-5"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--accent))] font-display text-xs font-bold text-[hsl(var(--accent-foreground))]">MR</div><div className="min-w-0"><div className="truncate text-xs font-semibold">Mariana Ríos</div><div className="truncate text-[10px] text-[hsl(var(--sidebar-foreground)/.48)]">Dirección comercial</div></div><MoreHorizontal size={17} className="ml-auto text-[hsl(var(--sidebar-foreground)/.5)]" /></div>
      </aside>
      {mobileNav && <button data-testid="button-overlay-navigation" aria-label="Cerrar navegación" className="fixed inset-0 z-20 bg-[hsl(var(--foreground)/.32)] md:hidden" onClick={() => setMobileNav(false)} />}
      <main className="min-h-[100dvh] md:pl-[256px]">
        <header className="sticky top-0 z-10 border-b border-border/70 bg-[hsl(var(--background)/.86)] px-5 py-4 backdrop-blur-xl sm:px-8 lg:px-11">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3"><button data-testid="button-open-navigation" className="rounded-xl border border-border bg-card p-2 md:hidden" onClick={() => setMobileNav(true)}><Menu size={19} /></button><div><div className="font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">{meta.eyebrow}</div><div className="mt-1 text-xs text-muted-foreground">Miércoles, 18 de diciembre de 2024</div></div></div>
            <div className="flex items-center gap-2"><button data-testid="button-search" onClick={() => toast.info('Búsqueda global disponible en la siguiente versión')} className="hidden rounded-xl border border-border bg-card p-2.5 text-muted-foreground transition-colors hover:text-foreground sm:block"><Search size={17} /></button><button data-testid="button-notifications" onClick={() => toast.info('No hay alertas nuevas')} className="relative rounded-xl border border-border bg-card p-2.5 text-muted-foreground transition-colors hover:text-foreground"><Bell size={17} /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]" /></button><div className="mx-1 hidden h-7 w-px bg-border sm:block" /><button data-testid="button-profile" onClick={() => toast.info('Perfil de Mariana Ríos')} className="flex items-center gap-2 rounded-xl px-1.5 py-1 text-left hover:bg-[hsl(var(--muted)/.5)]"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-[11px] font-bold text-[hsl(var(--primary-foreground))]">MR</span><span className="hidden text-xs font-semibold sm:block">Mariana Ríos</span><ChevronDown size={14} className="hidden text-muted-foreground sm:block" /></button></div>
          </div>
        </header>
        <div className="px-5 py-7 sm:px-8 lg:px-11 lg:py-9">
          <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div className="animate-rise"><div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[hsl(var(--primary))]"><span className="h-2 w-2 rounded-full bg-[hsl(var(--primary))]" />Reporte operativo · Demo local</div><h1 data-testid="text-page-title" className="font-display max-w-2xl text-[30px] font-bold leading-[1.08] tracking-[-.045em] sm:text-[39px]">{meta.title}</h1><p className="mt-3 max-w-xl text-[14px] leading-6 text-muted-foreground">{meta.subtitle}</p></div>
            <div className="flex flex-wrap items-center gap-2"><button data-testid="button-refresh" onClick={refresh} className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs font-semibold text-muted-foreground shadow-sm transition hover:text-foreground"><RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />Actualizar</button><button data-testid="button-export" onClick={() => toast.success('Vista preparada para exportar', { description: 'La descarga estará disponible al conectar el modelo real.' })} className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs font-semibold text-muted-foreground shadow-sm transition hover:text-foreground"><Download size={14} />Exportar</button><button data-testid="button-share" onClick={() => { navigator.clipboard?.writeText(window.location.href); toast.success('Enlace copiado'); }} className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-3.5 py-2.5 text-xs font-semibold text-[hsl(var(--primary-foreground))] shadow-sm transition hover:brightness-110"><Share2 size={14} />Compartir</button></div>
          </div>
          <FilterBar filters={filters} setFilters={setFilters} showFilters={showFilters} setShowFilters={setShowFilters} filterActive={filterActive} resetFilters={resetFilters} />
          <div className="mb-6 flex items-center justify-between text-[11px] text-muted-foreground"><span>Actualizado {lastUpdated} · Fuente: modelo demostrativo</span><button data-testid="button-data-definition" onClick={() => toast.info('Las medidas están expresadas en millones de pesos mexicanos')} className="flex items-center gap-1.5 hover:text-foreground"><CircleHelp size={13} />¿Cómo se calcula?</button></div>
          <DashboardView activeView={activeView} filters={filters} isRefreshing={isRefreshing} navigate={navigate} />
        </div>
      </main>
    </div>
  );
}

function FilterBar({ filters, setFilters, showFilters, setShowFilters, filterActive, resetFilters }: { filters: Filters; setFilters: React.Dispatch<React.SetStateAction<Filters>>; showFilters: boolean; setShowFilters: (value: boolean) => void; filterActive: boolean; resetFilters: () => void }) {
  const options: { key: keyof Filters; label: string; values: string[] }[] = [
    { key: 'period', label: 'Periodo', values: ['Últimos 12 meses', 'Últimos 6 meses', 'Este año', 'Trimestre actual'] },
    { key: 'region', label: 'Región', values: ['Todas las regiones', 'Norte', 'Centro', 'Occidente', 'Sur', 'Exportación'] },
    { key: 'category', label: 'Categoría', values: ['Todas las categorías', 'Tecnología', 'Servicios', 'Equipamiento', 'Consultoría'] },
    { key: 'channel', label: 'Canal', values: ['Todos los canales', 'Directo', 'Partners', 'Digital'] },
  ];
  return <section className="mb-4 rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-soft)]">
    <div className="flex flex-wrap items-center gap-2"><button data-testid="button-toggle-filters" onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${showFilters ? 'bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]' : 'text-muted-foreground hover:bg-muted'}`}><Filter size={14} />Filtros{filterActive && <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[hsl(var(--accent))] px-1 font-mono text-[9px] text-[hsl(var(--accent-foreground))]">!</span>}</button>{showFilters && options.map(({ key, label, values }) => <label key={key} className="relative flex items-center gap-2 rounded-xl border border-border bg-[hsl(var(--background)/.65)] px-3 py-2 text-xs"><span className="text-muted-foreground">{label}</span><select data-testid={`select-filter-${key}`} value={filters[key]} onChange={(e) => setFilters((current) => ({ ...current, [key]: e.target.value }))} className="max-w-[145px] cursor-pointer appearance-none bg-transparent pr-4 font-semibold outline-none"><option>{values[0]}</option>{values.slice(1).map((value) => <option key={value}>{value}</option>)}</select><ChevronDown size={12} className="pointer-events-none absolute right-2.5 text-muted-foreground" /></label>)}<div className="ml-auto flex items-center gap-2">{filterActive && <button data-testid="button-reset-filters" onClick={resetFilters} className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"><RefreshCw size={13} />Limpiar</button>}<span className="hidden items-center gap-1.5 border-l border-border pl-3 text-[10px] text-muted-foreground md:flex"><span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))]" />Sincronizado</span></div></div>
  </section>;
}

function DashboardView({ activeView, filters, isRefreshing, navigate }: { activeView: View; filters: Filters; isRefreshing: boolean; navigate: (view: View) => void }) {
  if (isRefreshing) return <LoadingState />;
  if (activeView === 'ventas') return <SalesView filters={filters} />;
  if (activeView === 'clientes') return <CustomersView />;
  if (activeView === 'regiones') return <RegionsView />;
  return <ExecutiveView navigate={navigate} />;
}

function LoadingState() {
  return <div className="animate-pulse space-y-5"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((i) => <div key={i} className="h-36 rounded-2xl bg-muted" />)}</div><div className="grid gap-5 lg:grid-cols-[1.55fr_1fr]"><div className="h-[370px] rounded-2xl bg-muted" /><div className="h-[370px] rounded-2xl bg-muted" /></div></div>;
}

function KpiCard({ label, value, delta, note, icon: Icon, tone = 'teal' }: { label: string; value: string; delta: string; note: string; icon: typeof TrendingUp; tone?: 'teal' | 'gold' | 'blue' | 'plum' }) {
  const toneClass = { teal: 'bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]', gold: 'bg-[hsl(var(--accent)/.17)] text-[hsl(35_70%_35%)]', blue: 'bg-[hsl(202_62%_45%/.12)] text-[hsl(202_62%_35%)]', plum: 'bg-[hsl(273_43%_56%/.13)] text-[hsl(273_43%_45%)]' }[tone];
  return <article data-testid={`card-kpi-${label.toLowerCase().replaceAll(' ', '-')}`} className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] transition duration-300 hover:-translate-y-1 hover:shadow-lg"><div className="flex items-start justify-between"><div className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneClass}`}><Icon size={17} /></div><span className={`flex items-center gap-1 rounded-full px-2 py-1 font-mono text-[10px] font-bold ${delta.startsWith('-') ? 'bg-[hsl(var(--destructive)/.1)] text-[hsl(var(--destructive))]' : 'bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]'}`}>{delta.startsWith('-') ? <ArrowDownRight size={11} /> : <ArrowUpRight size={11} />}{delta}</span></div><div className="mt-5 font-mono text-[11px] uppercase tracking-[.12em] text-muted-foreground">{label}</div><div className="metric-number mt-1 text-[29px] font-bold text-foreground">{value}</div><div className="mt-2 text-[11px] text-muted-foreground">{note}</div><div className="absolute -bottom-6 -right-5 h-24 w-24 rounded-full border-[12px] border-[hsl(var(--primary)/.035)]" /></article>;
}

function ExecutiveView({ navigate }: { navigate: (view: View) => void }) {
  const total = months.reduce((sum, item) => sum + item.revenue, 0);
  return <div className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><KpiCard label="Ingresos netos" value={money(total)} delta="+18.6%" note="vs. periodo anterior" icon={TrendingUp} tone="teal" /><KpiCard label="Pedidos" value="6,268" delta="+12.4%" note="525 pedidos promedio / mes" icon={Target} tone="gold" /><KpiCard label="Clientes activos" value="625" delta="+8.9%" note="47 cuentas nuevas" icon={Users} tone="blue" /><KpiCard label="Margen bruto" value="34.8%" delta="+2.1 pp" note="por encima del objetivo (32%)" icon={BarChart3} tone="plum" /></div>
    <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
      <Panel title="Ritmo de ingresos" eyebrow="Ingresos vs. objetivo · millones MXN" action={<button data-testid="button-view-sales" onClick={() => navigate('ventas')} className="flex items-center gap-1 text-xs font-semibold text-[hsl(var(--primary))] hover:underline">Ver detalle <ExternalLink size={12} /></button>}><RevenueChart /></Panel>
      <Panel title="Mezcla de categorías" eyebrow="Participación de ingresos"><CategoryChart /></Panel>
    </div>
    <div className="grid gap-5 lg:grid-cols-[1fr_1.35fr]">
      <Panel title="Señales para hoy" eyebrow="Lectura asistida"><SignalList /></Panel>
      <Panel title="Desempeño regional" eyebrow="Ingresos y crecimiento" action={<button data-testid="button-view-regions" onClick={() => navigate('regiones')} className="flex items-center gap-1 text-xs font-semibold text-[hsl(var(--primary))] hover:underline">Explorar regiones <ExternalLink size={12} /></button>}><RegionBars /></Panel>
    </div>
  </div>;
}

function Panel({ title, eyebrow, children, action }: { title: string; eyebrow: string; children: React.ReactNode; action?: React.ReactNode }) {
  return <section className="overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6"><div className="mb-5 flex items-start justify-between gap-3"><div><h2 className="font-display text-[17px] font-bold tracking-[-.025em]">{title}</h2><p className="mt-1 font-mono text-[9px] uppercase tracking-[.13em] text-muted-foreground">{eyebrow}</p></div>{action}</div>{children}</section>;
}

function RevenueChart() {
  return <div className="h-[280px] w-full"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={months} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}><defs><linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#087f73" stopOpacity=".26" /><stop offset="100%" stopColor="#087f73" stopOpacity=".02" /></linearGradient></defs><CartesianGrid vertical={false} stroke="#e7e0d4" strokeDasharray="3 3" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#8b8a84', fontSize: 10 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#8b8a84', fontSize: 10 }} tickFormatter={(value) => `$${value}M`} /><Tooltip content={<ChartTooltip />} /><Area type="monotone" dataKey="revenue" stroke="#087f73" fill="url(#revenueFill)" strokeWidth={3} activeDot={{ r: 5, fill: '#f4a72c', strokeWidth: 0 }} /><Line type="monotone" dataKey="target" stroke="#c9bda9" strokeDasharray="5 5" strokeWidth={1.5} dot={false} /></ComposedChart></ResponsiveContainer></div>;
}
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return <div className="rounded-xl border border-border bg-card px-3 py-2.5 shadow-xl"><div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>{payload.map((entry) => <div key={entry.name} className="flex items-center justify-between gap-4 text-xs"><span className="flex items-center gap-1.5 text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: entry.color }} />{entry.name === 'revenue' ? 'Ingresos' : entry.name === 'target' ? 'Objetivo' : entry.name}</span><strong className="font-mono">{typeof entry.value === 'number' && entry.name !== 'orders' ? `$${entry.value.toFixed(2)}M` : entry.value}</strong></div>)}</div>;
}
function CategoryChart() {
  return <div className="flex h-[280px] items-center gap-4"><div className="h-full w-[52%]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categories} dataKey="revenue" nameKey="category" innerRadius={62} outerRadius={94} paddingAngle={3} strokeWidth={0}>{categories.map((entry) => <Cell key={entry.category} fill={entry.color} />)}</Pie><Tooltip formatter={(value: number) => money(value)} /></PieChart></ResponsiveContainer></div><div className="flex-1 space-y-3">{categories.map((item) => <div key={item.category} className="flex items-center justify-between gap-2 text-xs"><span className="flex items-center gap-2 text-muted-foreground"><span className="h-2 w-2 rounded-full" style={{ background: item.color }} />{item.category}</span><span className="font-mono font-bold">{item.share}%</span></div>)}</div></div>;
}
function SignalList() {
  const signals = [{ icon: TrendingUp, title: 'Centro lidera el crecimiento', text: '+24.7% vs. periodo anterior', color: 'text-[hsl(var(--primary))]', bg: 'bg-[hsl(var(--primary)/.1)]' }, { icon: Target, title: 'Objetivo superado por 4.3%', text: 'La racha positiva lleva 7 meses', color: 'text-[hsl(35_70%_35%)]', bg: 'bg-[hsl(var(--accent)/.17)]' }, { icon: Users, title: '48 cuentas requieren atención', text: 'Renovaciones en los próximos 30 días', color: 'text-[hsl(var(--destructive))]', bg: 'bg-[hsl(var(--destructive)/.1)]' }];
  return <div className="space-y-2">{signals.map(({ icon: Icon, title, text, color, bg }) => <div key={title} className="flex items-center gap-3 rounded-xl p-2.5 transition hover:bg-muted"><div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${bg} ${color}`}><Icon size={15} /></div><div className="min-w-0"><div className="truncate text-xs font-semibold">{title}</div><div className="mt-0.5 text-[11px] text-muted-foreground">{text}</div></div><ChevronDown size={14} className="ml-auto -rotate-90 text-muted-foreground" /></div>)}</div>;
}
function RegionBars() {
  return <div className="space-y-4 pt-1">{regions.map((item, index) => <div key={item.region} data-testid={`row-region-${index}`}><div className="mb-1.5 flex justify-between text-xs"><span className="font-semibold">{item.region}</span><span className="font-mono text-muted-foreground">{money(item.revenue)} <span className="ml-2 text-[hsl(var(--primary))]">+{item.growth}%</span></span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-[hsl(var(--primary))] transition-all" style={{ width: `${item.revenue / 7.31 * 100}%`, opacity: 1 - index * .1 }} /></div></div>)}</div>;
}

function SalesView({ filters }: { filters: Filters }) {
  const [metric, setMetric] = useState<'revenue' | 'orders'>('revenue');
  const filteredCategories = filters.category === 'Todas las categorías' ? categories : categories.filter((item) => item.category === filters.category);
  return <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-3"><KpiCard label="Ingresos del periodo" value="$22.8 M" delta="+18.6%" note="7 meses sobre objetivo" icon={TrendingUp} /><KpiCard label="Ticket promedio" value="$3,640" delta="+5.8%" note="vs. $3,441 anterior" icon={Target} tone="gold" /><KpiCard label="Conversión" value="8.7%" delta="+1.4 pp" note="tráfico calificado" icon={Sparkles} tone="blue" /></div><Panel title="Evolución comercial" eyebrow="Comparativo mensual · millones MXN" action={<div className="flex rounded-lg bg-muted p-1"><button data-testid="button-metric-revenue" onClick={() => setMetric('revenue')} className={`rounded-md px-2.5 py-1.5 text-[10px] font-bold ${metric === 'revenue' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>Ingresos</button><button data-testid="button-metric-orders" onClick={() => setMetric('orders')} className={`rounded-md px-2.5 py-1.5 text-[10px] font-bold ${metric === 'orders' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>Pedidos</button></div>}><div className="h-[330px]"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={months} margin={{ top: 10, right: 0, left: -18, bottom: 0 }}><CartesianGrid vertical={false} stroke="#e7e0d4" strokeDasharray="3 3" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#8b8a84', fontSize: 10 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#8b8a84', fontSize: 10 }} tickFormatter={(v) => metric === 'revenue' ? `$${v}M` : v} /><Tooltip content={<ChartTooltip />} />{metric === 'revenue' ? <><Area type="monotone" dataKey="revenue" name="revenue" stroke="#087f73" fill="#087f73" fillOpacity=".12" strokeWidth={3} /><Line type="monotone" dataKey="target" name="target" stroke="#c9bda9" strokeDasharray="5 5" dot={false} /></> : <Bar dataKey="orders" name="orders" fill="#f4a72c" radius={[5, 5, 0, 0]} barSize={24} />}</ComposedChart></ResponsiveContainer></div></Panel><div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><Panel title="Categorías" eyebrow={`Desempeño por mezcla · ${filters.category}`}><div className="mobile-scroll"><div className="min-w-[540px] space-y-4">{filteredCategories.map((item) => <div key={item.category} className="grid grid-cols-[1fr_110px_100px_80px] items-center gap-4 text-xs"><span className="font-semibold">{item.category}</span><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${item.share * 2.8}%`, background: item.color }} /></div><span className="text-right font-mono">{money(item.revenue)}</span><span className="text-right font-mono text-[hsl(var(--primary))]">{item.margin}% margen</span></div>)}</div></div></Panel><Panel title="Lectura comercial" eyebrow="Puntos de atención"><div className="space-y-3 text-xs leading-5 text-muted-foreground"><p className="rounded-xl bg-[hsl(var(--primary)/.07)] p-3"><strong className="text-foreground">Tecnología</strong> concentra 30% del ingreso y mantiene un margen sano de 31.8%.</p><p className="rounded-xl bg-[hsl(var(--accent)/.13)] p-3"><strong className="text-foreground">Servicios</strong> tiene el mayor margen: oportunidad para elevar su participación.</p></div></Panel></div></div>;
}

function CustomersView() {
  return <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-3"><KpiCard label="Clientes activos" value="625" delta="+8.9%" note="47 altas en el periodo" icon={Users} tone="blue" /><KpiCard label="Retención neta" value="83.4%" delta="+3.6 pp" note="objetivo: 80%" icon={RefreshCw} tone="teal" /><KpiCard label="Valor de cartera" value="$24.4 M" delta="+21.2%" note="ingreso anualizado" icon={TrendingUp} tone="gold" /></div><div className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]"><Panel title="Segmentos de clientes" eyebrow="Valor y permanencia"><div className="space-y-4">{segments.map((item) => <div key={item.segment} className="rounded-xl border border-border p-3"><div className="mb-2 flex items-center justify-between"><div className="flex items-center gap-2 text-xs font-semibold"><span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />{item.segment}</div><span className="font-mono text-xs">{item.retention}%</span></div><div className="flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${item.retention}%`, background: item.color }} /></div><span className="w-20 text-right text-[11px] text-muted-foreground">{item.customers} clientes</span></div><div className="mt-2 text-[11px] text-muted-foreground">Aporta <strong className="font-mono text-foreground">{money(item.revenue)}</strong> al ingreso</div></div>)}</div></Panel><Panel title="Concentración de cartera" eyebrow="Ingresos por segmento"><div className="h-[320px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={segments} layout="vertical" margin={{ left: 15, right: 15 }}><CartesianGrid horizontal={false} stroke="#e7e0d4" /><XAxis type="number" axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}M`} tick={{ fontSize: 10, fill: '#8b8a84' }} /><YAxis type="category" dataKey="segment" axisLine={false} tickLine={false} width={94} tick={{ fontSize: 10, fill: '#8b8a84' }} /><Tooltip formatter={(value: number) => money(value)} /><Bar dataKey="revenue" fill="#087f73" radius={[0, 5, 5, 0]} barSize={27}>{segments.map((item) => <Cell key={item.segment} fill={item.color} />)}</Bar></BarChart></ResponsiveContainer></div></Panel></div><Panel title="Principales cuentas" eyebrow="Ordenadas por ingreso acumulado"><div className="mobile-scroll"><div className="min-w-[610px]"><div className="grid grid-cols-[1.5fr_1fr_90px_80px_100px] border-b border-border px-3 pb-3 font-mono text-[9px] uppercase tracking-wider text-muted-foreground"><span>Cuenta</span><span>Segmento</span><span className="text-right">Ingreso</span><span className="text-right">Crec.</span><span className="text-right">Estado</span></div>{topCustomers.map((item, index) => <div key={item.name} data-testid={`row-customer-${index}`} className="grid grid-cols-[1.5fr_1fr_90px_80px_100px] items-center border-b border-border/60 px-3 py-3.5 text-xs last:border-0"><span className="font-semibold">{item.name}</span><span className="text-muted-foreground">{item.segment}</span><span className="text-right font-mono">{money(item.revenue)}</span><span className={`text-right font-mono ${item.growth < 0 ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--primary))]'}`}>{item.growth > 0 ? '+' : ''}{item.growth}%</span><span className={`justify-self-end rounded-full px-2 py-1 text-[10px] font-semibold ${item.status === 'Revisar' ? 'bg-[hsl(var(--destructive)/.1)] text-[hsl(var(--destructive))]' : item.status === 'En expansión' ? 'bg-[hsl(var(--accent)/.17)] text-[hsl(35_70%_35%)]' : 'bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]'}`}>{item.status}</span></div>)}</div></div></Panel></div>;
}

function RegionsView() {
  const [selected, setSelected] = useState('Centro');
  const active = regions.find((r) => r.region === selected) ?? regions[1];
  return <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-3"><KpiCard label="Cobertura total" value="78.2%" delta="+6.4 pp" note="vs. año anterior" icon={Building2} tone="blue" /><KpiCard label="Región líder" value="Centro" delta="+24.7%" note="$7.31 M en ingresos" icon={TrendingUp} tone="teal" /><KpiCard label="Oportunidad" value="Sur" delta="63%" note="cobertura actual" icon={Target} tone="gold" /></div><div className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]"><Panel title="Comparativo regional" eyebrow="Ingresos, crecimiento y cobertura"><div className="mobile-scroll"><div className="min-w-[580px]"><div className="grid grid-cols-[1.2fr_1fr_90px_90px] border-b border-border px-3 pb-3 font-mono text-[9px] uppercase tracking-wider text-muted-foreground"><span>Región</span><span>Ingresos</span><span className="text-right">Crecimiento</span><span className="text-right">Cobertura</span></div>{regions.map((item, index) => <button key={item.region} data-testid={`button-region-${index}`} onClick={() => setSelected(item.region)} className={`grid w-full grid-cols-[1.2fr_1fr_90px_90px] items-center rounded-lg border-b border-border/60 px-3 py-4 text-left text-xs transition last:border-0 ${selected === item.region ? 'bg-[hsl(var(--primary)/.07)]' : 'hover:bg-muted/60'}`}><span className="flex items-center gap-2 font-semibold"><span className={`h-2 w-2 rounded-full ${selected === item.region ? 'bg-[hsl(var(--primary))]' : 'bg-muted-foreground/30'}`} />{item.region}</span><span className="font-mono">{money(item.revenue)}</span><span className="text-right font-mono text-[hsl(var(--primary))]">+{item.growth}%</span><span className="text-right font-mono">{item.coverage}%</span></button>)}</div></div></Panel><Panel title={active.region} eyebrow="Detalle de mercado"><div className="mb-5 flex items-start justify-between"><div><div className="metric-number text-4xl font-bold">{money(active.revenue)}</div><div className="mt-1 text-xs text-muted-foreground">ingresos acumulados</div></div><span className="rounded-full bg-[hsl(var(--primary)/.1)] px-2.5 py-1 font-mono text-[11px] font-bold text-[hsl(var(--primary))]">+{active.growth}%</span></div><div className="space-y-5"><div><div className="mb-2 flex justify-between text-xs"><span className="text-muted-foreground">Cobertura de mercado</span><strong>{active.coverage}%</strong></div><div className="h-3 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-[hsl(var(--primary))]" style={{ width: `${active.coverage}%` }} /></div></div><div className="grid grid-cols-2 gap-3"><div className="rounded-xl bg-muted/70 p-3"><div className="font-mono text-[10px] text-muted-foreground">PEDIDOS</div><div className="mt-2 font-display text-xl font-bold">{active.orders.toLocaleString('es-MX')}</div></div><div className="rounded-xl bg-muted/70 p-3"><div className="font-mono text-[10px] text-muted-foreground">TICKET MEDIO</div><div className="mt-2 font-display text-xl font-bold">${Math.round(active.revenue * 1000000 / active.orders).toLocaleString('es-MX')}</div></div></div></div></Panel></div><Panel title="Mapa de oportunidad" eyebrow="Lectura de cobertura"><div className="grid gap-3 md:grid-cols-3"><div className="rounded-xl border border-[hsl(var(--primary)/.2)] bg-[hsl(var(--primary)/.06)] p-4"><div className="mb-2 flex items-center gap-2 text-xs font-bold text-[hsl(var(--primary))]"><ArrowUpRight size={15} />Acelerar</div><p className="text-xs leading-5 text-muted-foreground">Centro y Exportación justifican mayor capacidad comercial: crecen arriba del 24%.</p></div><div className="rounded-xl border border-[hsl(var(--accent)/.35)] bg-[hsl(var(--accent)/.1)] p-4"><div className="mb-2 flex items-center gap-2 text-xs font-bold text-[hsl(35_70%_35%)]"><Target size={15} />Proteger</div><p className="text-xs leading-5 text-muted-foreground">Norte concentra cuentas maduras; prioriza renovación y expansión de servicios.</p></div><div className="rounded-xl border border-border bg-muted/50 p-4"><div className="mb-2 flex items-center gap-2 text-xs font-bold"><MoreHorizontal size={15} />Explorar</div><p className="text-xs leading-5 text-muted-foreground">Sur tiene espacio para desarrollar cobertura antes de ampliar inversión.</p></div></div></Panel></div>;
}

export default App;