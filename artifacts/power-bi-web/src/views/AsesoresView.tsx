import { useQuery } from '@tanstack/react-query';
import { Filters } from '../utils/constants';
import { money, number } from '../utils/formatters';
import { LoadingState } from '../components/ui/LoadingState';
import { SectionBand } from '../components/ui/SectionBand';
import { Panel } from '../components/ui/Panel';
import { TableShell } from '../components/ui/TableShell';
import { WorkdayStrip } from '../components/WorkdayStrip';
import { Users, Clock3, ShieldAlert } from 'lucide-react';

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
  if (errAsesores) return <div className="p-5 text-destructive font-semibold border border-destructive/20 bg-destructive/10 rounded-xl">Error de conexión al DWH.</div>;

  const dataDias = Array.isArray(diasBD) ? diasBD[0] : (diasBD || {});
  const keyTranscurridos = Object.keys(dataDias).find(k => k.toLowerCase().includes('trans')) || 'transcurridos';
  const keyRestantes = Object.keys(dataDias).find(k => k.toLowerCase().includes('restant')) || 'restantes';

  const transcurridos = Math.max(1, Number(dataDias[keyTranscurridos]) || 12);
  const restantes = Number(dataDias[keyRestantes]) || 13;

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

  // --- CÁLCULO DE TOTALES PARA LA FILA PIE DE TABLA ---
  const sumTotal = (key: string) => datosProyectados.reduce((acc: number, curr: any) => acc + Number(curr[key] || 0), 0);
  const avgTotal = (key: string) => datosProyectados.length > 0 ? sumTotal(key) / datosProyectados.length : 0;

  const t_cartera = sumTotal('cartera');
  const t_desembolsos = sumTotal('desembolsos');
  const t_repagos = sumTotal('repagos');
  const t_crecimientoBruto = sumTotal('crecimientoBruto');
  const t_mora150 = sumTotal('mora150');
  const t_pctMora150 = t_cartera > 0 ? (t_mora150 / t_cartera) * 100 : 0;
  const t_crecimientoNeto150 = sumTotal('crecimientoNeto150');
  const t_faltante20k = sumTotal('faltante20k');

  const t_opAchieved = sumTotal('opAchieved');
  const t_opProjection = sumTotal('opProjection');
  const t_duracion = avgTotal('duracion');
  const t_sociosInicio = sumTotal('sociosInicio');
  const t_sociosActual = sumTotal('sociosActual');
  const t_sociosNuevos = sumTotal('sociosNuevos');

  const t_carteraInicio = sumTotal('carteraInicio');
  const t_moraCppActual = sumTotal('moraCppActual');
  const t_pctMoraCpp = t_carteraInicio > 0 ? (t_moraCppActual / t_carteraInicio) * 100 : 0;
  const t_metaMoraCpp = avgTotal('metaMoraCpp');
  const t_excedentePctCpp = avgTotal('excedentePctCpp');
  const t_excedenteSolesCpp = sumTotal('excedenteSolesCpp');

  const t_moraDefActual = sumTotal('moraDefActual');
  const t_pctMoraDef = t_carteraInicio > 0 ? (t_moraDefActual / t_carteraInicio) * 100 : 0;
  const t_metaMoraDef = avgTotal('metaMoraDef');
  const t_excedentePctDef = avgTotal('excedentePctDef');
  const t_excedenteSolesDef = sumTotal('excedenteSolesDef');

  // Clases de semáforo estandarizadas con el look de Supervisión
  const cGreen = "bg-emerald-500/20 text-emerald-700 font-bold";
  const cYellow = "bg-amber-500/20 text-amber-800 font-bold";
  const cRed = "bg-rose-500/20 text-rose-700 font-bold";

  const getCrecNetoColor = (val: number) => val >= 20000 ? 'text-emerald-600 font-bold' : val >= 0 ? 'text-amber-600 font-bold' : 'text-rose-600 font-bold';
  const getFaltanteColor = (val: number) => val <= 0 ? 'text-emerald-600 font-bold' : val <= 20000 ? 'text-amber-600 font-bold' : 'text-rose-600 font-bold';
  const getOperacionesColor = (val: number) => val >= 27 ? 'text-emerald-600 font-bold' : val >= 20 ? 'text-amber-600 font-bold' : 'text-rose-600 font-bold';
  const getDuracionColor = (val: number) => val >= 6 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold';
  const getSociosColor = (val: number) => val > 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold';
  const getExcedenteColor = (val: number) => val <= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold';

  return (
    <div className="space-y-8 animate-in fade-in duration-500" key={`${filters.period}-${filters.agency}-${filters.advisor}`}>
      <WorkdayStrip periodo={filters.period} />

      {/* 1. CARTERA COMERCIAL */}
      <SectionBand tone="green">CARTERA COMERCIAL</SectionBand>
      <Panel title="Indicadores de Bonificación" icon={Users} eyebrow="Cartera y Crecimiento Neto 150">
        <div className="overflow-x-auto pb-4">
          <table className="w-full text-left text-[11px] whitespace-nowrap">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="px-3 pb-2 font-semibold">Asesor</th>
                <th className="px-3 pb-2 font-semibold text-right">Cartera</th>
                <th className="px-3 pb-2 font-semibold text-right">Desembolsos</th>
                <th className="px-3 pb-2 font-semibold text-right">Repagos</th>
                <th className="px-3 pb-2 font-semibold text-right">Crecimiento</th>
                <th className="px-3 pb-2 font-semibold text-right">Mora 150</th>
                <th className="px-3 pb-2 font-semibold text-right">% Mora150</th>
                <th className="px-3 pb-2 font-semibold text-right bg-emerald-500/10">Crecimiento Neto 150</th>
                <th className="px-3 pb-2 font-semibold text-right bg-amber-500/10">Faltante a S/20K</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {datosProyectados.map((row: any) => (
                <tr key={row.asesor} className="hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2.5 font-medium">{row.asesor}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{money(row.cartera)}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{money(row.desembolsos)}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{money(row.repagos)}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{money(row.crecimientoBruto)}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{money(row.mora150)}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{Number(row.pctMora150).toFixed(2)}%</td>
                  <td className={`px-3 py-2.5 text-right font-mono bg-emerald-500/10 ${getCrecNetoColor(row.crecimientoNeto150)}`}>{money(row.crecimientoNeto150)}</td>
                  <td className={`px-3 py-2.5 text-right font-mono bg-amber-500/10 ${getFaltanteColor(row.faltante20k)}`}>{money(row.faltante20k)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border font-bold bg-muted/20">
                <td className="px-3 py-2.5">Total</td>
                <td className="px-3 py-2.5 text-right font-mono">{money(t_cartera)}</td>
                <td className="px-3 py-2.5 text-right font-mono">{money(t_desembolsos)}</td>
                <td className="px-3 py-2.5 text-right font-mono">{money(t_repagos)}</td>
                <td className="px-3 py-2.5 text-right font-mono">{money(t_crecimientoBruto)}</td>
                <td className="px-3 py-2.5 text-right font-mono">{money(t_mora150)}</td>
                <td className="px-3 py-2.5 text-right font-mono">{t_pctMora150.toFixed(2)}%</td>
                <td className={`px-3 py-2.5 text-right font-mono bg-emerald-500/10 ${getCrecNetoColor(t_crecimientoNeto150)}`}>{money(t_crecimientoNeto150)}</td>
                <td className={`px-3 py-2.5 text-right font-mono bg-amber-500/10 ${getFaltanteColor(t_faltante20k)}`}>{money(t_faltante20k)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>

      {/* 2. TABLAS SECUNDARIAS (Operaciones, Duración, Socios) */}
      <div className="grid gap-5 lg:grid-cols-3">
        
        {/* OPERACIONES */}
        <Panel title="Operaciones" icon={Users}>
          <div className="overflow-x-auto pb-4">
            <table className="w-full text-left text-[11px] whitespace-nowrap">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="px-3 pb-2 font-semibold">Asesor</th>
                  <th className="px-3 pb-2 font-semibold text-right">A la Fecha</th>
                  <th className="px-3 pb-2 font-semibold text-right">Proyección</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {datosProyectados.map((row: any) => (
                  <tr key={`op-${row.asesor}`} className="hover:bg-muted/30">
                    <td className="px-3 py-2 font-medium">{row.asesor}</td>
                    <td className={`px-3 py-2 text-right font-mono ${getOperacionesColor(row.opAchieved)}`}>{row.opAchieved}</td>
                    <td className={`px-3 py-2 text-right font-mono ${getOperacionesColor(row.opProjection)}`}>{row.opProjection}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border font-bold bg-muted/20">
                  <td className="px-3 py-2">Total</td>
                  <td className="px-3 py-2 text-right font-mono">{t_opAchieved}</td>
                  <td className="px-3 py-2 text-right font-mono">{t_opProjection}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Panel>

        {/* DURACIÓN */}
        <Panel title="Duración" icon={Clock3}>
          <div className="overflow-x-auto pb-4">
            <table className="w-full text-left text-[11px] whitespace-nowrap">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="px-3 pb-2 font-semibold">Asesor</th>
                  <th className="px-3 pb-2 font-semibold text-right">Duración</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {datosProyectados.map((row: any) => (
                  <tr key={`dur-${row.asesor}`} className="hover:bg-muted/30">
                    <td className="px-3 py-2 font-medium">{row.asesor}</td>
                    <td className={`px-3 py-2 text-right font-mono ${getDuracionColor(row.duracion)}`}>{Number(row.duracion).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border font-bold bg-muted/20">
                  <td className="px-3 py-2">Promedio Ponderado</td>
                  <td className="px-3 py-2 text-right font-mono">{t_duracion.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Panel>

        {/* NÚMERO DE SOCIOS */}
        <Panel title="Número de Socios" icon={Users}>
          <div className="overflow-x-auto pb-4">
            <table className="w-full text-left text-[11px] whitespace-nowrap">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="px-2 pb-2 font-semibold">Asesor</th>
                  <th className="px-2 pb-2 font-semibold text-right">Inicio</th>
                  <th className="px-2 pb-2 font-semibold text-right">Actual</th>
                  <th className="px-2 pb-2 font-semibold text-right">Nuevos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {datosProyectados.map((row: any) => (
                  <tr key={`soc-${row.asesor}`} className="hover:bg-muted/30">
                    <td className="px-2 py-2 font-medium truncate max-w-[100px]" title={row.asesor}>{row.asesor}</td>
                    <td className="px-2 py-2 text-right font-mono">{row.sociosInicio}</td>
                    <td className="px-2 py-2 text-right font-mono">{row.sociosActual}</td>
                    <td className={`px-2 py-2 text-right font-mono ${getSociosColor(row.sociosNuevos)}`}>{row.sociosNuevos}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border font-bold bg-muted/20">
                  <td className="px-2 py-2">Total</td>
                  <td className="px-2 py-2 text-right font-mono">{t_sociosInicio}</td>
                  <td className="px-2 py-2 text-right font-mono">{t_sociosActual}</td>
                  <td className="px-2 py-2 text-right font-mono">{t_sociosNuevos}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Panel>
      </div>

      {/* 3. MORA CPP Y MORA VENCIDA */}
      <div className="grid gap-5 xl:grid-cols-2">
        
        {/* MORA CPP */}
        <Panel title="Mora CPP" icon={ShieldAlert}>
          <div className="overflow-x-auto pb-4">
            <table className="w-full text-left text-[11px] whitespace-nowrap">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="px-3 pb-2 font-semibold">Asesor</th>
                  <th className="px-3 pb-2 font-semibold text-right">Cartera Inicio</th>
                  <th className="px-3 pb-2 font-semibold text-right">Mora S/</th>
                  <th className="px-3 pb-2 font-semibold text-right">Mora %</th>
                  <th className="px-3 pb-2 font-semibold text-right">Meta %</th>
                  <th className="px-3 pb-2 font-semibold text-right">Excedente %</th>
                  <th className="px-3 pb-2 font-semibold text-right">Excedente S/</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {datosProyectados.map((row: any) => (
                  <tr key={`cpp-${row.asesor}`} className="hover:bg-muted/30">
                    <td className="px-3 py-2 font-medium">{row.asesor}</td>
                    <td className="px-3 py-2 text-right font-mono">{money(row.carteraInicio)}</td>
                    <td className="px-3 py-2 text-right font-mono">{money(row.moraCppActual)}</td>
                    <td className="px-3 py-2 text-right font-mono">{Number(row.pctMoraCpp).toFixed(2)}%</td>
                    <td className="px-3 py-2 text-right font-mono text-muted-foreground">{Number(row.metaMoraCpp).toFixed(2)}%</td>
                    <td className={`px-3 py-2 text-right font-mono ${getExcedenteColor(row.excedentePctCpp)}`}>{Number(row.excedentePctCpp).toFixed(2)}%</td>
                    <td className={`px-3 py-2 text-right font-mono ${getExcedenteColor(row.excedenteSolesCpp)}`}>{money(row.excedenteSolesCpp)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border font-bold bg-muted/20">
                  <td className="px-3 py-2">Total</td>
                  <td className="px-3 py-2 text-right font-mono">{money(t_carteraInicio)}</td>
                  <td className="px-3 py-2 text-right font-mono">{money(t_moraCppActual)}</td>
                  <td className="px-3 py-2 text-right font-mono">{t_pctMoraCpp.toFixed(2)}%</td>
                  <td className="px-3 py-2 text-right font-mono">{t_metaMoraCpp.toFixed(2)}%</td>
                  <td className="px-3 py-2 text-right font-mono">{t_excedentePctCpp.toFixed(2)}%</td>
                  <td className={`px-3 py-2 text-right font-mono ${getExcedenteColor(t_excedenteSolesCpp)}`}>{money(t_excedenteSolesCpp)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Panel>

        {/* MORA VENCIDA */}
        <Panel title="Mora Vencida" icon={ShieldAlert}>
          <div className="overflow-x-auto pb-4">
            <table className="w-full text-left text-[11px] whitespace-nowrap">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="px-3 pb-2 font-semibold">Asesor</th>
                  <th className="px-3 pb-2 font-semibold text-right">Cartera Inicio</th>
                  <th className="px-3 pb-2 font-semibold text-right">Mora S/</th>
                  <th className="px-3 pb-2 font-semibold text-right">Mora %</th>
                  <th className="px-3 pb-2 font-semibold text-right">Meta %</th>
                  <th className="px-3 pb-2 font-semibold text-right">Excedente %</th>
                  <th className="px-3 pb-2 font-semibold text-right">Excedente S/</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {datosProyectados.map((row: any) => (
                  <tr key={`venc-${row.asesor}`} className="hover:bg-muted/30">
                    <td className="px-3 py-2 font-medium">{row.asesor}</td>
                    <td className="px-3 py-2 text-right font-mono">{money(row.carteraInicio)}</td>
                    <td className="px-3 py-2 text-right font-mono">{money(row.moraDefActual)}</td>
                    <td className="px-3 py-2 text-right font-mono">{Number(row.pctMoraDef).toFixed(2)}%</td>
                    <td className="px-3 py-2 text-right font-mono text-muted-foreground">{Number(row.metaMoraDef).toFixed(2)}%</td>
                    <td className={`px-3 py-2 text-right font-mono ${getExcedenteColor(row.excedentePctDef)}`}>{Number(row.excedentePctDef).toFixed(2)}%</td>
                    <td className={`px-3 py-2 text-right font-mono ${getExcedenteColor(row.excedenteSolesDef)}`}>{money(row.excedenteSolesDef)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border font-bold bg-muted/20">
                  <td className="px-3 py-2">Total</td>
                  <td className="px-3 py-2 text-right font-mono">{money(t_carteraInicio)}</td>
                  <td className="px-3 py-2 text-right font-mono">{money(t_moraDefActual)}</td>
                  <td className="px-3 py-2 text-right font-mono">{t_pctMoraDef.toFixed(2)}%</td>
                  <td className="px-3 py-2 text-right font-mono">{t_metaMoraDef.toFixed(2)}%</td>
                  <td className="px-3 py-2 text-right font-mono">{t_excedentePctDef.toFixed(2)}%</td>
                  <td className={`px-3 py-2 text-right font-mono ${getExcedenteColor(t_excedenteSolesDef)}`}>{money(t_excedenteSolesDef)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Panel>
      </div>

      {/* 4. RESUMEN DE BONIFICACIÓN */}
      <SectionBand tone="blue">Resumen de Bonificación</SectionBand>
      <Panel title="Indicadores de Bonificación" icon={Users} eyebrow="Bonos condicionados a Candado y Multiplicadores">
        <div className="overflow-x-auto pb-4">
          <table className="w-full text-left text-[11px] whitespace-nowrap">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="px-3 pb-2 font-semibold">Asesor</th>
                <th className="px-3 pb-2 font-semibold text-right">Duración (Candado)</th>
                <th className="px-3 pb-2 font-semibold text-right">Cartera (Cond. Adicional)</th>
                <th className="px-3 pb-2 font-semibold text-right">Nro Oper (Bono Base)</th>
                <th className="px-3 pb-2 font-semibold text-right">Nro Oper Proyección</th>
                <th className="px-3 pb-2 font-semibold text-right">Crec. Neto 150 (Mult.)</th>
                <th className="px-3 pb-2 font-semibold text-right">Socios Nuevos (Mult.)</th>
                <th className="px-3 pb-2 font-semibold text-right">Excedente Mora CPP (Mult.)</th>
                <th className="px-3 pb-2 font-semibold text-right">Excedente Mora Vencida (Mult.)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {datosProyectados.map((row: any) => (
                <tr key={`res-${row.asesor}`} className="hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium">{row.asesor}</td>
                  <td className={`px-3 py-2 text-right font-mono ${getDuracionColor(row.duracion)}`}>{Number(row.duracion).toFixed(2)}</td>
                  <td className={`px-3 py-2 text-right font-mono`}>{money(row.cartera)}</td>
                  <td className={`px-3 py-2 text-right font-mono ${getOperacionesColor(row.opAchieved)}`}>{row.opAchieved}</td>
                  <td className={`px-3 py-2 text-right font-mono ${getOperacionesColor(row.opProjection)}`}>{row.opProjection}</td>
                  <td className={`px-3 py-2 text-right font-mono ${getCrecNetoColor(row.crecimientoNeto150)}`}>{money(row.crecimientoNeto150)}</td>
                  <td className={`px-3 py-2 text-right font-mono ${getSociosColor(row.sociosNuevos)}`}>{row.sociosNuevos}</td>
                  <td className={`px-3 py-2 text-right font-mono ${getExcedenteColor(row.excedenteSolesCpp)}`}>{money(row.excedenteSolesCpp)}</td>
                  <td className={`px-3 py-2 text-right font-mono ${getExcedenteColor(row.excedenteSolesDef)}`}>{money(row.excedenteSolesDef)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border font-bold bg-muted/20">
                <td className="px-3 py-2" colSpan={5}>Total General</td>
                <td className={`px-3 py-2 text-right font-mono ${getCrecNetoColor(t_crecimientoNeto150)}`}>{money(t_crecimientoNeto150)}</td>
                <td className="px-3 py-2 text-right font-mono">{t_sociosNuevos}</td>
                <td className={`px-3 py-2 text-right font-mono ${getExcedenteColor(t_excedenteSolesCpp)}`}>{money(t_excedenteSolesCpp)}</td>
                <td className={`px-3 py-2 text-right font-mono ${getExcedenteColor(t_excedenteSolesDef)}`}>{money(t_excedenteSolesDef)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>
    </div>
  );
}