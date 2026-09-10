import { Dispatch, SetStateAction, useMemo } from 'react';
import { CalendarDays, Building2, Users, Calendar, Filter, X, RefreshCcw } from 'lucide-react';
import { useLocation } from 'wouter';

type Filters = { period: string; agency: string; advisor: string; day: string };

interface FilterBarProps {
  filters: Filters;
  setFilters: Dispatch<SetStateAction<Filters>>;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  resetFilters: () => void;
  dbFilters: any;
}

const agencyCodeMap: Record<string, string> = {
  'Wanchaq': '01', 'San Jerónimo': '02', 'Quillabamba': '03', 'Sicuani': '04',
  'Molino': '05', 'Juliaca': '06', 'Lima Los Olivos': '07', 'Tica Tica': '08',
  'Magisterio': '09', 'Lima SJL': '10', 'Chiclayo': '11', 'Arequipa': '12', 'Pucallpa': '13'
};

export function FilterBar({ filters, setFilters, showFilters, setShowFilters, resetFilters, dbFilters }: FilterBarProps) {
  // ==========================================
  // ZONA 1: TODOS LOS HOOKS (Incondicionales)
  // ==========================================
  const [location] = useLocation();
  const pathView = location.slice(1);
  
  const asesoresDisponibles = useMemo(() => {
    if (!dbFilters?.asesores) return [];
    let arr = dbFilters.asesores;
    if (filters.period && filters.period !== 'Cargando...') {
      arr = arr.filter((a: any) => String(a.Periodo) === String(filters.period));
    }
    if (filters.agency !== 'Todas') {
      const targetCode = agencyCodeMap[filters.agency];
      arr = arr.filter((a: any) => String(a.IdSAgencia).trim() === targetCode);
    }
    const uniqueNames = new Map<string, string>(); 
    arr.forEach((a: any) => {
      const shortName = String(a.Asesor || '').trim();
      const fullName = String(a.AsesorNombresApellidos || shortName).trim(); 
      if (shortName !== '') {
        uniqueNames.set(fullName, shortName);
      }
    });
    return Array.from(uniqueNames.entries())
      .map(([valorFiltro, textoVista]) => ({ valorFiltro, textoVista }))
      .sort((a, b) => a.textoVista.localeCompare(b.textoVista));
  }, [dbFilters?.asesores, filters.agency, filters.period]);

  const fechasDisponibles = useMemo(() => {
    if (!dbFilters?.fechas) return [];
    let arr = dbFilters.fechas;
    if (filters.period && filters.period !== 'Cargando...') {
      arr = arr.filter((f: any) => String(f.Periodo) === String(filters.period));
    }
    return arr;
  }, [dbFilters?.fechas, filters.period]);

  // ==========================================
  // ZONA 2: LÓGICA Y FUNCIONES
  // ==========================================
  const isGerenciaOrSupervision = pathView === '' || pathView === 'gerencia' || pathView === 'supervision';
  const showDateFilter = !['', 'gerencia', 'supervision', 'agencia', 'asesores'].includes(pathView);
  const showAdvisorFilter = !isGerenciaOrSupervision && dbFilters?.asesores?.length > 0;

  // ==========================================
  // ZONA 3: RETORNOS ANTICIPADOS
  // ==========================================
  // 🚀 REGLA DE ORO: Ocultar esta barra si estamos en las vistas exclusivas (MOVIDO AQUÍ ABAJO)
  if (['evolucion', 'cancelados', 'avance', 'ranking'].includes(pathView)) return null;

  if (!showFilters) {
    return (
      <div className="mb-6 flex justify-end">
        <button onClick={() => setShowFilters(true)} className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary)/.1)] px-4 py-2 text-xs font-semibold text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/.15)] transition-colors">
          <Filter size={14} /> Mostrar Filtros
        </button>
      </div>
    );
  }

  // ==========================================
  // ZONA 4: RENDERIZADO PRINCIPAL
  // ==========================================
  return (
    <div className="mb-8 rounded-2xl border border-border bg-card p-2 shadow-sm transition-all animate-in fade-in slide-in-from-top-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 border-r border-border px-4 py-2">
          <Filter size={16} className="text-[hsl(var(--primary))]" />
          <span className="text-xs font-semibold text-[hsl(var(--primary))]">Filtros</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5">
          <label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"><CalendarDays size={13} />Periodo</label>
          <select value={filters.period} onChange={e => setFilters({ ...filters, period: e.target.value, advisor: 'Todos', day: 'Hoy' })} className="rounded-lg border-0 bg-muted/50 px-3 py-1.5 text-xs font-semibold hover:bg-muted focus:ring-1 focus:ring-[hsl(var(--primary))] transition-colors">
            {dbFilters?.periodos?.map((p: string) => (<option key={p} value={p}>{p}</option>)) || <option>Cargando...</option>}
          </select>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5">
          <label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"><Building2 size={13} />Agencia</label>
          <select value={filters.agency} onChange={e => setFilters({ ...filters, agency: e.target.value, advisor: 'Todos' })} className="rounded-lg border-0 bg-muted/50 px-3 py-1.5 text-xs font-semibold hover:bg-muted focus:ring-1 focus:ring-[hsl(var(--primary))] transition-colors">
            <option value="Todas">Todas</option>
            {['Wanchaq', 'San Jerónimo', 'Quillabamba', 'Sicuani', 'Molino', 'Juliaca', 'Lima Los Olivos', 'Tica Tica', 'Magisterio', 'Lima SJL', 'Chiclayo', 'Arequipa', 'Pucallpa'].map((a: string) => (<option key={a} value={a}>{a}</option>))}
          </select>
        </div>
        {showAdvisorFilter && (
          <div className="flex items-center gap-2 px-3 py-1.5 animate-in fade-in slide-in-from-left-2">
            <label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"><Users size={13} />Asesor</label>
            <select value={filters.advisor} onChange={e => setFilters({ ...filters, advisor: e.target.value })} className="max-w-[200px] truncate rounded-lg border-0 bg-muted/50 px-3 py-1.5 text-xs font-semibold hover:bg-muted focus:ring-1 focus:ring-[hsl(var(--primary))] transition-colors">
              <option value="Todos">Todos</option>
              {asesoresDisponibles.map((a: any, idx: number) => (<option key={idx} value={a.valorFiltro}>{a.textoVista}</option>))}
            </select>
          </div>
        )}
        {showDateFilter && (
          <div className="flex items-center gap-2 px-3 py-1.5 animate-in fade-in slide-in-from-left-2">
            <label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"><Calendar size={13} />Fecha</label>
            <select value={filters.day} onChange={e => setFilters({ ...filters, day: e.target.value })} className="rounded-lg border-0 bg-muted/50 px-3 py-1.5 text-xs font-semibold hover:bg-muted focus:ring-1 focus:ring-[hsl(var(--primary))] transition-colors">
              <option value="Hoy">Hoy</option>
              <option value="Ayer">Ayer</option>
              <optgroup label="Fechas del Periodo">
                {fechasDisponibles.map((f: any, idx: number) => (<option key={idx} value={f.FechaValor}>{f.FechaVista}</option>))}
              </optgroup>
            </select>
          </div>
        )}
        <div className="ml-auto flex items-center gap-1 pr-2">
          <button onClick={resetFilters} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" title="Restablecer filtros"><RefreshCcw size={12} /> Limpiar</button>
          <div className="mx-2 h-4 w-px bg-border" />
          <button onClick={() => setShowFilters(false)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" title="Ocultar filtros"><X size={14} /></button>
        </div>
      </div>
    </div>
  );
}