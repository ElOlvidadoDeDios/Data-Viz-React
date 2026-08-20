import { useQuery } from '@tanstack/react-query';
import { Filters } from '../utils/constants';
import { money, number } from '../utils/formatters';
import { LoadingState } from '../components/ui/LoadingState';
import { SectionBand } from '../components/ui/SectionBand';
import { Panel } from '../components/ui/Panel';
import { TableShell } from '../components/ui/TableShell';
import { WorkdayStrip } from '../components/WorkdayStrip';

export function AsesoresView({ filters }: { filters: Filters }) {
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
  const keyTranscurridos = Object.keys(dataDias).find(k => k.toLowerCase().includes('trans')) || 'transcurridos';
  const keyRestantes = Object.keys(dataDias).find(k => k.toLowerCase().includes('restant')) || 'restantes';

  const transcurridos = Math.max(1, Number(dataDias[keyTranscurridos]) || 12);
  const restantes = Number(dataDias[keyRestantes]) || 13;

  // 🚨 LA VACUNA AVERAGEX: Sincronizamos la productividad con DAX
  const horaPeru = new Date().toLocaleString("en-US", { timeZone: "America/Lima" });
  const horaActual = new Date(horaPeru).getHours();
  const diasProductividadDAX = horaActual < 19 ? transcurridos + 1 : transcurridos;

  let datosFiltrados = filters.agency === 'Todas' ? asesoresBD : asesoresBD.filter((r: any) => r.agency === filters.agency);
  if (filters.advisor !== 'Todos') {
    datosFiltrados = datosFiltrados.filter((r: any) => r.asesor === filters.advisor);
  }

  const datosProyectados = datosFiltrados.map((row: any) => {
    const logrado = Number(row.opAchieved || 0);
    const productividad = diasProductividadDAX > 0 ? (logrado / diasProductividadDAX) : 0;
    const proyeccionRestante = Math.round(productividad * restantes);
    const opProjection = logrado + proyeccionRestante;
    return { ...row, opProjection };
  });

  const cGreen = "bg-[#7cb361] text-white font-bold border-b border-white/20";
  const cYellow = "bg-[#f0cb69] text-[hsl(35_80%_20%)] font-bold border-b border-white/20";
  const cRed = "bg-[#e06c61] text-white font-bold border-b border-white/20";
  const cNeutral = "text-muted-foreground border-b border-border/60";

  const getCrecNetoColor = (val: number) => val >= 20000 ? cGreen : val >= 0 ? cYellow : cRed;
  const getFaltanteColor = (val: number) => val <= 0 ? cGreen : val <= 20000 ? cYellow : cRed;
  const getOperacionesColor = (val: number) => val >= 27 ? cGreen : val >= 20 ? cYellow : cRed;
  const getDuracionColor = (val: number) => val >= 6 ? cGreen : cRed;
  const getSociosColor = (val: number) => val > 0 ? cGreen : cRed;
  const getExcedenteColor = (val: number) => val <= 0 ? cGreen : cRed;
  const getCarteraColor = (val: number) => val >= 200000 ? cGreen : val >= 100000 ? cYellow : cRed;

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200" key={`${filters.period}-${filters.agency}-${filters.advisor}`}>
      <WorkdayStrip periodo={filters.period} />

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

      <div className="grid gap-5 lg:grid-cols-3">
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

      <div className="grid gap-5 xl:grid-cols-2">
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