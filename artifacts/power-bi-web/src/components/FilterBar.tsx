import { ChevronDown, Filter } from 'lucide-react';
import { Filters, catalogoAgencias, nombresAgencias } from '../utils/constants';

export function FilterBar({ filters, setFilters, showFilters, setShowFilters, resetFilters, dbFilters }: any) {
  const periodos = dbFilters?.periodos || ['Cargando...'];
  const asesoresBd = dbFilters?.asesores || [];

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
            <select data-testid={`select-filter-${key}`} value={filters[key]} onChange={(e) => setFilters((current: any) => ({ ...current, [key]: e.target.value }))} className="max-w-[155px] cursor-pointer appearance-none bg-transparent pr-4 font-semibold outline-none">
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