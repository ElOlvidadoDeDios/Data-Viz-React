import { Dispatch, SetStateAction } from 'react';
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

export function FilterBar({ filters, setFilters, showFilters, setShowFilters, resetFilters, dbFilters }: FilterBarProps) {
  const [location] = useLocation();
  const pathView = location.slice(1);
  
  // La vista principal (Gerencia) es la ruta raíz '/'
  const isGerencia = pathView === '' || pathView === 'gerencia';

  // Ocultamos los selectores si no hay datos o la vista no los necesita
  const showAdvisorFilter = !isGerencia && dbFilters?.asesores?.length > 0;
  const showDateFilter = !isGerencia;

  if (!showFilters) {
    return (
      <div className="mb-6 flex justify-end">
        <button onClick={() => setShowFilters(true)} className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary)/.1)] px-4 py-2 text-xs font-semibold text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/.15)] transition-colors">
          <Filter size={14} /> Mostrar Filtros
        </button>
      </div>
    );
  }

  return (
    <div className="mb-8 rounded-2xl border border-border bg-card p-2 shadow-sm transition-all animate-in fade-in slide-in-from-top-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 border-r border-border px-4 py-2">
          <Filter size={16} className="text-[hsl(var(--primary))]" />
          <span className="text-xs font-semibold text-[hsl(var(--primary))]">Filtros</span>
        </div>

        {/* PERIODO - Se muestra siempre */}
        <div className="flex items-center gap-2 px-3 py-1.5">
          <label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"><CalendarDays size={13} />Periodo</label>
          <select 
            value={filters.period} 
            onChange={e => setFilters({ ...filters, period: e.target.value })}
            className="rounded-lg border-0 bg-muted/50 px-3 py-1.5 text-xs font-semibold hover:bg-muted focus:ring-1 focus:ring-[hsl(var(--primary))] transition-colors"
          >
            {dbFilters?.periodos?.map((p: string) => (
              <option key={p} value={p}>{p}</option>
            )) || <option>Cargando...</option>}
          </select>
        </div>

        {/* AGENCIA - Se muestra siempre */}
        <div className="flex items-center gap-2 px-3 py-1.5">
          <label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"><Building2 size={13} />Agencia</label>
          <select 
            value={filters.agency} 
            onChange={e => setFilters({ ...filters, agency: e.target.value })}
            className="rounded-lg border-0 bg-muted/50 px-3 py-1.5 text-xs font-semibold hover:bg-muted focus:ring-1 focus:ring-[hsl(var(--primary))] transition-colors"
          >
            <option value="Todas">Todas</option>
            {/* Usamos la lista de agencias directamente */}
            {[
              'Wanchaq', 'San Jerónimo', 'Quillabamba', 'Sicuani', 'Molino', 
              'Juliaca', 'Lima Los Olivos', 'Tica Tica', 'Magisterio', 
              'Lima SJL', 'Chiclayo', 'Arequipa', 'Pucallpa'
            ].map((a: string) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        {/* ASESOR - Se oculta en Gerencia */}
        {showAdvisorFilter && (
          <div className="flex items-center gap-2 px-3 py-1.5 animate-in fade-in slide-in-from-left-2">
            <label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"><Users size={13} />Asesor</label>
            <select 
              value={filters.advisor} 
              onChange={e => setFilters({ ...filters, advisor: e.target.value })}
              className="max-w-[200px] truncate rounded-lg border-0 bg-muted/50 px-3 py-1.5 text-xs font-semibold hover:bg-muted focus:ring-1 focus:ring-[hsl(var(--primary))] transition-colors"
            >
              <option value="Todos">Todos</option>
              {dbFilters.asesores.map((a: string) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        )}

        {/* FECHA - Se oculta en Gerencia */}
        {showDateFilter && (
          <div className="flex items-center gap-2 px-3 py-1.5 animate-in fade-in slide-in-from-left-2">
            <label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"><Calendar size={13} />Fecha</label>
            <select 
              value={filters.day} 
              onChange={e => setFilters({ ...filters, day: e.target.value })}
              className="rounded-lg border-0 bg-muted/50 px-3 py-1.5 text-xs font-semibold hover:bg-muted focus:ring-1 focus:ring-[hsl(var(--primary))] transition-colors"
            >
              <option value="Hoy">Hoy</option>
              <option value="Ayer">Ayer</option>
              <option value="Últimos 7 días">Últimos 7 días</option>
            </select>
          </div>
        )}

        <div className="ml-auto flex items-center gap-1 pr-2">
          <button onClick={resetFilters} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" title="Restablecer filtros">
            <RefreshCcw size={12} /> Limpiar
          </button>
          <div className="mx-2 h-4 w-px bg-border" />
          <button onClick={() => setShowFilters(false)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" title="Ocultar filtros">
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}