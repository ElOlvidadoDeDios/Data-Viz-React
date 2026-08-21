import { useQuery } from '@tanstack/react-query';
import { Panel } from '../components/ui/Panel';

export function ColocacionesView({ filters }: { filters: any }) {
  // 1. Obtenemos datos de la agencia (reutilizando tu ruta existente)
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

  // 2. Obtenemos los días laborales de tu ruta de calendario (o usamos fallback)
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
    let bgClass = "bg-rose-500/20"; 
    if (pct >= 120) bgClass = "bg-emerald-500/40";
    else if (pct >= 110) bgClass = "bg-emerald-400/20";
    else if (pct >= 100) bgClass = "bg-lime-400/20";
    else if (pct >= 90) bgClass = "bg-amber-300/20";
    else if (pct >= 80) bgClass = "bg-orange-400/20";

    return { asesor: c.asesor, log, prod, proy, faltDia, faltExigente, bgClass };
  }).sort((a: any, b: any) => a.log - b.log); // Ordenamos de menor a mayor como en PBI

  // Componente de Semi Donut SVG (recreación del Gauge de PBI)
  const SemiDonut = ({ pct }: { pct: number }) => {
    const radius = 70;
    const circum = Math.PI * radius;
    const dashoffset = circum - (Math.min(100, pct) / 100) * circum;
    return (
      <div className="relative flex flex-col items-center pt-2">
        <svg width="180" height="100" viewBox="0 0 180 100" className="overflow-visible">
          <path d="M 20 90 A 70 70 0 0 1 160 90" fill="none" stroke="#f1f5f9" strokeWidth="20" strokeLinecap="butt" />
          <path d="M 20 90 A 70 70 0 0 1 160 90" fill="none" stroke="#16a34a" strokeWidth="20" strokeLinecap="butt" 
                strokeDasharray={circum} strokeDashoffset={dashoffset} className="transition-all duration-1000 ease-out" />
        </svg>
        <div className="absolute bottom-2 text-4xl font-display font-bold text-foreground">{Math.round(pct)}%</div>
        <div className="absolute bottom-0 left-0 text-[11px] font-bold text-rose-600">0%</div>
        <div className="absolute bottom-0 right-0 text-[11px] font-bold text-rose-600">100%</div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* ======================= 1. DÍAS LABORALES ======================= */}
      <Panel title="En este mes tenemos:">
        <div className="grid grid-cols-3 text-center divide-x divide-border/50 py-4">
          <div>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase mb-2">Días Laborales Totales</div>
            <div className="text-4xl font-display text-foreground">{dTotales}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase mb-2">Días Laborales Transcurridos</div>
            <div className="text-4xl font-display text-[#1d4ed8]">{dTranscurridos}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase mb-2">Días Laborales Restantes</div>
            <div className="text-4xl font-display text-rose-600">{dRestantes}</div>
          </div>
        </div>
        <div className="h-3 w-full flex overflow-hidden">
          <div className="bg-[#3b82f6]" style={{ width: `${(dTranscurridos/dTotales)*100}%` }}></div>
          <div className="bg-[#1e3a8a] flex-1"></div>
        </div>
      </Panel>

      {/* ======================= 2. NIVEL DE AGENCIA ======================= */}
      <div className="rounded-md bg-amber-600/20 px-4 py-2 text-center font-display font-bold uppercase tracking-widest text-amber-800 mt-8">
        A NIVEL DE AGENCIA
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Panel title="" headerClass="hidden">
          <div className="bg-[#16a34a] text-white text-center py-2 font-bold rounded-t-xl text-sm">Hasta Hoy, ¿Cómo Va mi Agencia?</div>
          <div className="flex flex-col items-center p-6">
            <div className="text-[10px] text-muted-foreground font-semibold mb-4">Cumplimiento Porcentual de la Meta Mensual</div>
            <SemiDonut pct={cumplimiento} />
            <div className="grid grid-cols-3 w-full text-center mt-6">
              <div>
                <div className="text-[10px] font-semibold text-foreground">Logrado a la Fecha</div>
                <div className="text-3xl font-display text-[#16a34a]">{logrado}</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold text-foreground">Faltante a la Meta</div>
                <div className="text-3xl font-display text-rose-500">{faltante}</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold text-foreground">Meta</div>
                <div className="text-3xl font-display text-foreground">{meta}</div>
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="" headerClass="hidden">
          <div className="bg-[#16a34a] text-white text-center py-2 font-bold rounded-t-xl text-sm">Al cierre de Mes, ¿Cómo Iría mi Agencia?</div>
          <div className="flex flex-col items-center p-6">
            <div className="text-[10px] text-muted-foreground font-semibold mb-4">Proyección del Cumplimiento Porcentual</div>
            <SemiDonut pct={proyCumplimiento} />
            <div className="grid grid-cols-3 w-full text-center mt-6">
              <div>
                <div className="text-[10px] font-semibold text-foreground">Logrado a la Fecha</div>
                <div className="text-3xl font-display text-[#16a34a]">{proyeccion}</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold text-foreground">Faltante a la Meta</div>
                <div className="text-3xl font-display text-rose-500">{proyFaltante}</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold text-foreground">Meta</div>
                <div className="text-3xl font-display text-foreground">{meta}</div>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <div className="text-center font-bold pt-4">En términos de días laborales:</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="text-center px-4">
          <div className="text-xs text-foreground mb-3 h-10">Hasta la fecha, es como si hubiese colocado ... créditos por día laboral</div>
          <div className="text-5xl font-display text-[#16a34a]">{credPorDiaHastaFecha}</div>
        </div>
        <div className="text-center px-4">
          <div className="text-xs text-foreground mb-3 h-10">Cada uno de estos días restantes, tengo que colocar ... créditos para llegar a mi meta</div>
          <div className="text-5xl font-display text-rose-500 relative inline-block">
            {credPorDiaRestantes}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold text-foreground border-2 border-foreground px-2 py-1 rounded bg-background">Mi meta de hoy</div>
          </div>
        </div>
        <div className="text-center px-4">
          <div className="text-xs text-foreground mb-3 h-10">Como referencia, si durante el mes coloco ... créditos por día laboral llego a mi meta</div>
          <div className="text-5xl font-display text-foreground">{credPorDiaReferencia}</div>
        </div>
      </div>

      {/* ======================= 3. NIVEL DE ASESORES ======================= */}
      <div className="rounded-md bg-amber-600/20 px-4 py-2 text-center font-display font-bold uppercase tracking-widest text-amber-800 mt-12">
        A NIVEL DE ASESORES
      </div>
      
      <div className="bg-[#16a34a] text-white font-bold text-center py-1.5 rounded-md text-sm shadow-sm">
        ¿Qué tan Productivos son mis Asesores?
      </div>
      
      <div className="text-[13px] px-2 mt-4 leading-relaxed text-foreground">
        <p><strong>¿Productivos?</strong> Es decir, cuántos créditos colocan por día.</p>
        <p className="mt-2 text-base">Este mes, ¿cuál es la <span className="underline italic font-bold">productividad ideal</span> que debe tener mi asesor? <strong className="text-2xl">{prodIdeal}</strong> créditos por día laboral.</p>
        <p className="mt-2 text-base"><strong>¿Por qué?</strong> En este mes, si un asesor coloca <strong className="text-2xl">{prodIdeal}</strong> créditos por día, entonces en <strong className="text-2xl">{dTotales}</strong> días laborales llegará a su meta de <strong className="text-2xl">30</strong> créditos.</p>
      </div>

      <div className="overflow-x-auto border border-foreground rounded mt-6">
        <table className="w-full text-center text-[11px] whitespace-nowrap">
          <thead>
            <tr className="bg-muted">
              <th className="py-2 border-r border-foreground font-bold">Categoría</th>
              <th className="py-2 border-r border-foreground font-bold">Colocaciones Proyectadas</th>
              <th className="py-2 border-r border-foreground font-bold">Rango Productividad</th>
              <th className="py-2 font-bold">Rango de Cumplimiento %</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-emerald-600 text-white"><td className="py-1 border-r border-foreground text-left px-2 font-semibold">Muy Autosuficiente</td><td className="border-r border-foreground">&gt;= 36</td><td className="border-r border-foreground">&gt;= 1.50</td><td>&gt;= 120%</td></tr>
            <tr className="bg-emerald-400/80"><td className="py-1 border-r border-foreground text-left px-2 font-semibold">Autosuficiente</td><td className="border-r border-foreground">33 a 35</td><td className="border-r border-foreground">[1.38 - 1.50)</td><td>110% - 120%</td></tr>
            <tr className="bg-lime-400/80"><td className="py-1 border-r border-foreground text-left px-2 font-semibold">Necesita Mantenerse Así</td><td className="border-r border-foreground">30 a 32</td><td className="border-r border-foreground">[1.25 - 1.38)</td><td>100% - 110%</td></tr>
            <tr className="bg-amber-300/80"><td className="py-1 border-r border-foreground text-left px-2 font-semibold">Necesita Motivación</td><td className="border-r border-foreground">27 a 29</td><td className="border-r border-foreground">[1.12 - 1.25)</td><td>90% - 100%</td></tr>
            <tr className="bg-orange-400/80"><td className="py-1 border-r border-foreground text-left px-2 font-semibold">Necesita Exigencia</td><td className="border-r border-foreground">24 a 26</td><td className="border-r border-foreground">[1.00 - 1.12)</td><td>80% - 90%</td></tr>
            <tr className="bg-rose-500 text-white"><td className="py-1 border-r border-foreground text-left px-2 font-semibold">Necesita Llamada de Atención</td><td className="border-r border-foreground">&lt;= 23</td><td className="border-r border-foreground">&lt; 1.00</td><td>&lt;= 80%</td></tr>
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto mt-4 max-h-[400px] rounded border border-border">
        <table className="w-full text-center text-[11px] whitespace-nowrap">
          <thead className="sticky top-0 bg-background shadow-sm">
            <tr className="border-b border-border text-foreground">
              <th className="px-3 py-2 font-bold text-left">Asesor</th>
              <th className="px-3 py-2 font-bold">Logrado</th>
              <th className="px-3 py-2 font-bold">Productividad</th>
              <th className="px-3 py-2 font-bold">Proyeccion</th>
              <th className="px-3 py-2 font-bold">Faltante por Día Restante</th>
              <th className="px-3 py-2 font-bold">Faltante Exigente por Día Restante</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {tableData.length > 0 ? tableData.map((c: any, i: number) => (
              <tr key={i} className={`${c.bgClass} hover:opacity-80 transition-opacity`}>
                <td className="px-3 py-1.5 font-semibold text-left">{c.asesor}</td>
                <td className="px-3 py-1.5">{c.log}</td>
                <td className="px-3 py-1.5">{c.prod.toFixed(2)}</td>
                <td className="px-3 py-1.5">{c.proy}</td>
                <td className="px-3 py-1.5">{c.faltDia.toFixed(2)}</td>
                <td className="px-3 py-1.5">{c.faltExigente}</td>
              </tr>
            )) : (
              <tr><td colSpan={6} className="py-4 italic text-muted-foreground">No hay datos para esta selección</td></tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}