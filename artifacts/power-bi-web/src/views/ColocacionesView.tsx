import { useQuery } from '@tanstack/react-query';
import { Panel } from '../components/ui/Panel';
import { WorkdayStrip } from '../components/WorkdayStrip';
import { Users, TrendingUp } from 'lucide-react';

export function ColocacionesView({ filters }: { filters: any }) {
  // 1. Obtenemos datos de la agencia
  const { data: agenciaData, isLoading: loadAgencia, isError: errorAgencia } = useQuery({
    queryKey: ['agencia', filters.period],
    queryFn: async () => {
      const params = new URLSearchParams({ periodo: filters.period !== 'Cargando...' ? filters.period : '' });
      const res = await fetch(`http://localhost:3000/api/agencia?${params}`);
      if (!res.ok) throw new Error('Error al cargar agencia');
      return res.json();
    },
    enabled: filters.period !== 'Cargando...',
  });

  // 2. Obtenemos los días laborales
  const { data: calData, isLoading: loadCal } = useQuery({
    queryKey: ['calendario', filters.period],
    queryFn: async () => {
      const params = new URLSearchParams({ periodo: filters.period !== 'Cargando...' ? filters.period : '' });
      const res = await fetch(`http://localhost:3000/api/calendario?${params}`);
      if (!res.ok) throw new Error('Error al cargar calendario');
      return res.json();
    },
    enabled: filters.period !== 'Cargando...',
  });

  if (loadAgencia || loadCal) {
    return <div className="h-96 animate-pulse rounded-xl bg-muted/50"></div>;
  }

  if (errorAgencia) {
    return <div className="text-destructive font-semibold">Error de conexión. Revisa que el backend esté corriendo.</div>;
  }

  // --- DÍAS LABORALES ---
  const dTotales = calData?.totales || 25;
  const dTranscurridos = calData?.transcurridos || 16;
  const dRestantes = dTotales - dTranscurridos;

  // --- LÓGICA COMERCIAL Y FILTROS LOCALES ---
  let comercial = agenciaData?.comercial || [];
  if (filters.agency !== 'Todas') {
    comercial = comercial.filter((c: any) => c.agency === filters.agency);
  }
  if (filters.advisor !== 'Todos') {
    comercial = comercial.filter((c: any) => c.asesor === filters.advisor);
  }

  // Cálculos agregados a nivel de Agencia
  const logrado = comercial.reduce((acc: number, curr: any) => acc + Number(curr.opAchieved || 0), 0);
  const meta = comercial.reduce((acc: number, curr: any) => acc + Number(curr.metaAsesor || 30), 0);
  
  const faltante = Math.max(0, meta - logrado);
  const cumplimiento = meta > 0 ? (logrado / meta) * 100 : 0;

  const proyeccion = dTranscurridos > 0 ? Math.round((logrado / dTranscurridos) * dTotales) : 0;
  const proyFaltante = Math.max(0, meta - proyeccion);
  const proyCumplimiento = meta > 0 ? (proyeccion / meta) * 100 : 0;

  // Días Laborales KPIs
  const credPorDiaHastaFecha = dTranscurridos > 0 ? Math.round(logrado / dTranscurridos) : 0;
  const credPorDiaRestantes = dRestantes > 0 ? Math.round(faltante / dRestantes) : 0;
  const credPorDiaReferencia = dTotales > 0 ? Math.round(meta / dTotales) : 0;
  const prodIdeal = dTotales > 0 ? (30 / dTotales).toFixed(2) : '1.20';

  // Armar la tabla de asesores calculando su categoría de color
  const tableData = comercial.map((c: any) => {
    const log = Number(c.opAchieved || 0);
    const met = Number(c.metaAsesor || 30);
    const prod = dTranscurridos > 0 ? (log / dTranscurridos) : 0;
    const proy = Math.round(prod * dTotales);
    const falt = Math.max(0, met - log);
    const faltDia = dRestantes > 0 ? (falt / dRestantes) : 0;
    const faltExigente = Math.ceil(faltDia);
    
    const pct = met > 0 ? (proy / met) * 100 : 0;
    let badgeClass = "bg-rose-500/10 text-rose-700 font-semibold"; 
    if (pct >= 120) badgeClass = "bg-emerald-500/20 text-emerald-700 font-bold";
    else if (pct >= 110) badgeClass = "bg-emerald-400/20 text-emerald-800 font-semibold";
    else if (pct >= 100) badgeClass = "bg-lime-400/20 text-lime-900 font-semibold";
    else if (pct >= 90) badgeClass = "bg-amber-300/20 text-amber-900 font-semibold";
    else if (pct >= 80) badgeClass = "bg-orange-400/20 text-orange-900 font-semibold";

    return { asesor: c.asesor, log, met, prod, proy, falt, faltDia, faltExigente, badgeClass };
  }).sort((a: any, b: any) => a.log - b.log);

  // Totales de la tabla
  const t_log = tableData.reduce((acc, curr) => acc + curr.log, 0);
  const t_met = tableData.reduce((acc, curr) => acc + curr.met, 0);
  const t_proy = tableData.reduce((acc, curr) => acc + curr.proy, 0);
  const t_prod = tableData.length > 0 ? tableData.reduce((acc, curr) => acc + curr.prod, 0) / tableData.length : 0;
  const t_faltDia = dRestantes > 0 ? Math.max(0, t_met - t_log) / dRestantes : 0;

  // Componente de Semi Donut SVG
  const SemiDonut = ({ pct }: { pct: number }) => {
    const radius = 60;
    const circum = Math.PI * radius;
    const dashoffset = circum - (Math.min(100, pct) / 100) * circum;
    return (
      <div className="relative flex flex-col items-center pt-2">
        <svg width="150" height="85" viewBox="0 0 150 85" className="overflow-visible">
          <path d="M 15 75 A 60 60 0 0 1 135 75" fill="none" stroke="hsl(var(--muted))" strokeWidth="16" strokeLinecap="round" />
          <path d="M 15 75 A 60 60 0 0 1 135 75" fill="none" stroke="#16a34a" strokeWidth="16" strokeLinecap="round" 
                strokeDasharray={circum} strokeDashoffset={dashoffset} className="transition-all duration-1000 ease-out" />
        </svg>
        <div className="absolute bottom-1 text-3xl font-bold tracking-tight">{Math.round(pct)}%</div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500" key={`${filters.period}-${filters.agency}-${filters.advisor}`}>
      
      {/* 1. FRANJA COMPACTA DE DÍAS LABORALES */}
      <WorkdayStrip periodo={filters.period} />

      {/* 2. NIVEL DE AGENCIA (TARJETAS DE CUMPLIMIENTO) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Panel title="Hasta Hoy, ¿Cómo Va mi Agencia?" icon={TrendingUp}>
          <div className="flex flex-col items-center p-2">
            <div className="text-[11px] text-muted-foreground font-semibold mb-2">Cumplimiento Porcentual de la Meta Mensual</div>
            <SemiDonut pct={cumplimiento} />
            <div className="grid grid-cols-3 w-full text-center mt-4 pt-4 border-t border-border/60">
              <div>
                <div className="text-[10px] font-semibold text-muted-foreground">Logrado</div>
                <div className="text-2xl font-bold text-emerald-600 font-mono">{logrado}</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold text-muted-foreground">Faltante</div>
                <div className="text-2xl font-bold text-rose-600 font-mono">{faltante}</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold text-muted-foreground">Meta</div>
                <div className="text-2xl font-bold font-mono">{meta}</div>
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Al cierre de Mes, ¿Cómo Iría mi Agencia?" icon={TrendingUp}>
          <div className="flex flex-col items-center p-2">
            <div className="text-[11px] text-muted-foreground font-semibold mb-2">Proyección del Cumplimiento Porcentual</div>
            <SemiDonut pct={proyCumplimiento} />
            <div className="grid grid-cols-3 w-full text-center mt-4 pt-4 border-t border-border/60">
              <div>
                <div className="text-[10px] font-semibold text-muted-foreground">Proyección</div>
                <div className="text-2xl font-bold text-emerald-600 font-mono">{proyeccion}</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold text-muted-foreground">Faltante Proy.</div>
                <div className="text-2xl font-bold text-rose-600 font-mono">{proyFaltante}</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold text-muted-foreground">Meta</div>
                <div className="text-2xl font-bold font-mono">{meta}</div>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {/* MÉTRICAS DE DÍAS LABORALES */}
      <Panel title="Análisis en Términos de Días Laborales">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center py-2">
          <div className="px-2">
            <div className="text-xs text-muted-foreground mb-2">Colocación promedio por día transcurrido</div>
            <div className="text-4xl font-bold text-emerald-600 font-mono">{credPorDiaHastaFecha}</div>
          </div>
          <div className="px-2 border-x border-border/60">
            <div className="text-xs text-muted-foreground mb-2">Créditos diarios necesarios (Días restantes)</div>
            <div className="text-4xl font-bold text-rose-600 font-mono">{credPorDiaRestantes}</div>
          </div>
          <div className="px-2">
            <div className="text-xs text-muted-foreground mb-2">Referencia diaria para llegar a la meta</div>
            <div className="text-4xl font-bold font-mono">{credPorDiaReferencia}</div>
          </div>
        </div>
      </Panel>

      {/* 3. NIVEL DE ASESORES (TABLA EJECUTIVA) */}
      <Panel title="Desempeño a Nivel de Asesores" icon={Users} eyebrow={`Productividad ideal: ${prodIdeal} créditos / día`}>
        <div className="overflow-x-auto pb-4">
          <table className="w-full text-left text-[11px] whitespace-nowrap">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="px-3 pb-2 font-semibold">Asesor</th>
                <th className="px-3 pb-2 font-semibold text-right">Logrado</th>
                <th className="px-3 pb-2 font-semibold text-right">Meta Asesor</th>
                <th className="px-3 pb-2 font-semibold text-right">Productividad</th>
                <th className="px-3 pb-2 font-semibold text-right">Proyección</th>
                <th className="px-3 pb-2 font-semibold text-right">Faltante por Día Restante</th>
                <th className="px-3 pb-2 font-semibold text-right">Faltante Exigente / Día</th>
                <th className="px-3 pb-2 font-semibold text-center">Categoría / Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {tableData.length > 0 ? tableData.map((c: any, i: number) => (
                <tr key={i} className="hover:bg-muted/30">
                  <td className="px-3 py-2.5 font-medium">{c.asesor}</td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-600">{c.log}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{c.met}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{c.prod.toFixed(2)}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{c.proy}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-rose-600">{c.faltDia.toFixed(2)}</td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold">{c.faltExigente}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] ${c.badgeClass}`}>
                      Proyección: {Math.round((c.proy / c.met) * 100)}%
                    </span>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={8} className="py-4 text-center text-muted-foreground italic">No hay datos para esta selección</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border font-bold bg-muted/20">
                <td className="px-3 py-2.5">Total Agencia</td>
                <td className="px-3 py-2.5 text-right font-mono text-emerald-600">{t_log}</td>
                <td className="px-3 py-2.5 text-right font-mono">{t_met}</td>
                <td className="px-3 py-2.5 text-right font-mono">{t_prod.toFixed(2)}</td>
                <td className="px-3 py-2.5 text-right font-mono">{t_proy}</td>
                <td className="px-3 py-2.5 text-right font-mono text-rose-600">{t_faltDia.toFixed(2)}</td>
                <td className="px-3 py-2.5 text-right font-mono">-</td>
                <td className="px-3 py-2.5 text-center">{Math.round(cumplimiento)}% Global</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>

    </div>
  );
}