import { useQuery } from '@tanstack/react-query';
import { Filters } from '../utils/constants';
import { number } from '../utils/formatters';
import { LoadingState } from '../components/ui/LoadingState';
import { SectionBand } from '../components/ui/SectionBand';
import { GaugeChart } from '../components/ui/GaugeChart';

export function ColocacionesView({ filters }: { filters: Filters }) {
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

  const dataDias = Array.isArray(diasBD) ? diasBD[0] : (diasBD || {});
  const transcurridos = Number(dataDias?.transcurridos || dataDias?.DiasTranscurridos || 14); 
  const restantes = Number(dataDias?.restantes || dataDias?.DiasRestantes || 11);
  const totales = transcurridos + restantes;

  // 🚨 LA SOLUCIÓN EXACTA PARA IGUALAR A AVERAGEX DE DAX 🚨
  const horaPeru = new Date().toLocaleString("en-US", { timeZone: "America/Lima" });
  const horaActual = new Date(horaPeru).getHours();
  const diasProductividadDAX = horaActual < 19 ? transcurridos + 1 : transcurridos;

  const filterByAgency = (arr: any[]) => filters.agency === 'Todas' ? arr : arr.filter((r: any) => r.agency === filters.agency);
  let dataComercial = filterByAgency(agenciaBD?.comercial || []);
  const dataResumen = filterByAgency(agenciaBD?.resumen || []);
  
  if (filters.advisor !== 'Todos') {
    dataComercial = dataComercial.filter((r: any) => r.asesor === filters.advisor);
  }

  const metaGlobalReferencia = 30; 
  const prodIdeal = totales > 0 ? (metaGlobalReferencia / totales).toFixed(2) : "0.00";

  const dataAsesores = dataComercial.map((row: any) => {
    const logrado = Number(row.opAchieved || 0);
    const metaIndividual = Number(row.metaAsesor || 30);
    
    const productividad = diasProductividadDAX > 0 ? (logrado / diasProductividadDAX) : 0;
    const proyeccion = logrado + Math.round(productividad * restantes);
    
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
        <div className="bg-card rounded-xl border border-border shadow-sm p-6 flex flex-col items-center text-center">
          <h3 className="font-bold text-xl text-foreground mb-1">Hasta Hoy, ¿Cómo Va mi Agencia?</h3>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-8">Cumplimiento de la Meta Mensual</p>
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

        <div className="bg-card rounded-xl border border-border shadow-sm p-6 flex flex-col items-center text-center">
          <h3 className="font-bold text-xl text-foreground mb-1">Al cierre de Mes, ¿Cómo Iría mi Agencia?</h3>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-8">Proyección de la Meta Mensual</p>
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

      <div className="bg-card rounded-xl border border-border shadow-sm p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-muted/20 pointer-events-none"></div>
        <h3 className="text-center font-bold text-xl text-foreground mb-8 relative z-10">En términos de días laborales:</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center max-w-5xl mx-auto relative z-10 divide-y md:divide-y-0 md:divide-x divide-border/60">
          <div className="flex flex-col items-center px-4 pt-4 md:pt-0">
            <div className="text-5xl font-light text-[hsl(142_71%_35%)] mb-3">{ritmoHastaFecha}</div>
            <p className="text-xs text-muted-foreground max-w-[200px] leading-relaxed">
              Hasta la fecha, es como si hubiese colocado ... créditos por día laboral
            </p>
          </div>
          <div className="flex flex-col items-center px-4 pt-4 md:pt-0">
            <div className="text-5xl font-bold text-[hsl(348_83%_55%)] mb-2">{ritmoDesdeHoy}</div>
            <span className="mb-3 inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-red-700 ring-1 ring-inset ring-red-600/20 dark:bg-red-900/30 dark:text-red-400">
              Mi meta de hoy
            </span>
            <p className="text-xs text-muted-foreground max-w-[220px] leading-relaxed">
              Cada uno de estos días restantes, tengo que colocar ... créditos para llegar a mi meta
            </p>
          </div>
          <div className="flex flex-col items-center px-4 pt-4 md:pt-0">
            <div className="text-5xl font-light text-foreground/80 mb-3">{ritmoReferencia}</div>
            <p className="text-xs text-muted-foreground max-w-[220px] leading-relaxed">
              Como referencia, si durante el mes coloco ... créditos por día laboral llego a mi meta
            </p>
          </div>
        </div>
      </div>

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