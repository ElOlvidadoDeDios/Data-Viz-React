import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster, toast } from 'sonner';
import { useLocation } from 'wouter';
import {
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  CircleHelp,
  Download,
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

// ==========================================
// 1. IMPORTACIONES DE COMPONENTES MODULARES
// ==========================================
import { FilterBar } from './components/FilterBar';
import { LoadingState } from './components/ui/LoadingState';

// ==========================================
// 2. IMPORTACIONES DE VISTAS
// ==========================================
import { GerenciaView } from './views/GerenciaView';
import { SupervisionAgenciasView } from './views/SupervisionAgenciasView';
import { AgenciaView } from './views/AgenciaView';
import { AsesoresView } from './views/AsesoresView';
import { ColocacionesView } from './views/ColocacionesView';
// Asegúrate de que dentro de este archivo la función se exporte como "ProductividadDiaria"
import { ProductividadDiaria } from './views/ProductividadDiaria';

const queryClient = new QueryClient();

export type View = 'gerencia' | 'supervision' | 'agencia' | 'asesores' | 'colocaciones' | 'diaria';
export type Filters = { period: string; agency: string; advisor: string; day: string };

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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Dashboard />
        <Toaster position="bottom-right" richColors />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function Dashboard() {
  const [location, setLocation] = useLocation();
  const pathView = location.slice(1) as View;
  const activeView: View = viewMeta[pathView] ? pathView : 'gerencia';
  
  // Llamamos a la base de datos para obtener los filtros
  const { data: dbFilters } = useQuery({
    queryKey: ['filtros-bd'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3000/api/filtros');
      if (!res.ok) throw new Error('Error al obtener filtros');
      return res.json();
    }
  });

  const [filters, setFilters] = useState<Filters>({ period: 'Cargando...', agency: 'Todas', advisor: 'Todos', day: 'Hoy' });

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

  const navigate = (view: View) => { 
    setLocation(view === 'gerencia' ? '/' : `/${view}`); 
    setMobileNav(false); 
  };
  
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
          <button data-testid="button-help" onClick={() => toast.info('Meta, proyección, faltante, CPP, mora deficiente, TEA y productividad están calculadas dinámicamente')} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[12px] text-[hsl(var(--sidebar-foreground)/.62)] hover:bg-[hsl(var(--sidebar-accent)/.7)]"><CircleHelp size={16} /><span>Ayuda y definiciones</span></button>
        </div>
        <div className="m-4 rounded-2xl border border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-accent)/.55)] p-4">
          <div className="mb-3 flex items-center justify-between"><span className="font-mono text-[9px] uppercase tracking-[.13em] text-[hsl(var(--sidebar-foreground)/.5)]">Modelo de datos</span><span className="flex items-center gap-1 text-[10px] text-[hsl(var(--sidebar-primary))]"><span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--sidebar-primary))] animate-pulse-soft" />DWH SQL Server</span></div>
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
          
          <FilterBar filters={filters} setFilters={setFilters} showFilters={showFilters} setShowFilters={setShowFilters} resetFilters={resetFilters} dbFilters={dbFilters} />
          
          <div className="mb-6 flex items-center justify-between text-[11px] text-muted-foreground"><span>Actualizado {lastUpdated} · Fuente: DWH SQL Server</span><button data-testid="button-data-definition" onClick={() => toast.info('Sincronizado con DAX y base de datos')} className="flex items-center gap-1.5 hover:text-foreground"><CircleHelp size={13} />¿Cómo se calcula?</button></div>
          
          <div className={isRefreshing ? "opacity-40 pointer-events-none transition-opacity duration-300" : "transition-opacity duration-300"}>
            <DashboardView activeView={activeView} filters={filters} navigate={navigate} />
          </div>
          
        </div>
      </main>
    </div>
  );
}

// 3. ORQUESTADOR DE RUTAS
function DashboardView({ activeView, filters, navigate }: { activeView: View; filters: Filters; navigate: (view: View) => void }) {
  if (activeView === 'supervision') return <SupervisionAgenciasView navigate={navigate} filters={filters} />;
  if (activeView === 'agencia') return <AgenciaView filters={filters} />;
  if (activeView === 'asesores') return <AsesoresView filters={filters} />;
  if (activeView === 'colocaciones') return <ColocacionesView filters={filters} />;
  if (activeView === 'diaria') return <ProductividadDiaria filters={filters} />;
  
  return <GerenciaView navigate={navigate} filters={filters} />; 
}