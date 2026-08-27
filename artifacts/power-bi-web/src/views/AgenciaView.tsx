import { useQuery } from '@tanstack/react-query';
import { Building2, Users, ShieldAlert } from 'lucide-react';
import { Panel } from '../components/ui/Panel';
import { WorkdayStrip } from '../components/WorkdayStrip';

export function AgenciaView({ filters }: { filters: any }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['agencia', filters.period], 
    queryFn: async () => {
      const params = new URLSearchParams({
        periodo: filters.period !== 'Cargando...' ? filters.period : '',
      });
      const res = await fetch(`http://localhost:3000/api/agencia?${params}`);
      if (!res.ok) throw new Error('Error al cargar datos de la agencia');
      return res.json();
    },
    enabled: filters.period !== 'Cargando...',
  });

  if (isLoading) {
    return <div className="h-96 animate-pulse rounded-xl bg-muted/50"></div>;
  }

  if (isError || !data) {
    return <div className="text-destructive font-semibold">Error al cargar la información de la agencia. Verifica la conexión a la BD.</div>;
  }

  // --- FORMATEADORES ---
  const fmtMoney = (val: number) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 }).format(val || 0);
  const fmtNum = (val: number) => new Intl.NumberFormat('es-PE').format(val || 0);
  const fmtDec = (val: number) => (val || 0).toFixed(2);
  const fmtPct = (val: number) => (val || 0).toFixed(2) + '%';

  // --- 1. LÓGICA DE FILTROS ---
  let comercialFiltered = data.comercial || [];
  let recuperacionFiltered = data.recuperacion || [];

  if (filters.agency !== 'Todas') {
    comercialFiltered = comercialFiltered.filter((r: any) => r.agency === filters.agency);
    recuperacionFiltered = recuperacionFiltered.filter((r: any) => r.agency === filters.agency);
  }

  if (filters.advisor !== 'Todos') {
    comercialFiltered = comercialFiltered.filter((r: any) => r.asesor === filters.advisor);
    recuperacionFiltered = recuperacionFiltered.filter((r: any) => r.recuperador === filters.advisor);
  }

  // --- 2. CÁLCULO DE TOTALES (Comercial) ---
  const totales = comercialFiltered.reduce((acc: any, curr: any) => ({
    crecimientoNeto150: acc.crecimientoNeto150 + Number(curr.crecimientoNeto150 || 0),
    amountAchieved: acc.amountAchieved + Number(curr.amountAchieved || 0),
    repagos: acc.repagos + Number(curr.repagos || 0),
    tea: acc.tea + Number(curr.tea || 0), 
    opAchieved: acc.opAchieved + Number(curr.opAchieved || 0),
    sociosInicio: acc.sociosInicio + Number(curr.sociosInicio || 0),
    sociosActual: acc.sociosActual + Number(curr.sociosActual || 0),
    cartera: acc.cartera + Number(curr.cartera || 0),
    moraCppMax: acc.moraCppMax + Number(curr.moraCppMax || 0),
    moraCppActual: acc.moraCppActual + Number(curr.moraCppActual || 0),
    moraDefMax: acc.moraDefMax + Number(curr.moraDefMax || 0),
    moraDefActual: acc.moraDefActual + Number(curr.moraDefActual || 0),
  }), {
    crecimientoNeto150: 0, amountAchieved: 0, repagos: 0, tea: 0, opAchieved: 0, 
    sociosInicio: 0, sociosActual: 0, cartera: 0, moraCppMax: 0, moraCppActual: 0, 
    moraDefMax: 0, moraDefActual: 0
  });

  // Promedios y porcentajes para tabla comercial
  if (comercialFiltered.length > 0) {
    totales.tea = totales.tea / comercialFiltered.length;
  }
  const t_plazoComercial = comercialFiltered.length > 0 ? comercialFiltered.reduce((acc: number, curr: any) => acc + Number(curr.plazo || 0), 0) / comercialFiltered.length : 0;
  const t_pctMoraCppComercial = totales.cartera > 0 ? (totales.moraCppActual / totales.cartera) * 100 : 0;

  // --- 3. CÁLCULO DE TOTALES (Suma de Recuperadores para Agencia Completa) ---
  const totalesRec = recuperacionFiltered.reduce((acc: any, curr: any) => ({
    crecimientoNeto150: acc.crecimientoNeto150 + Number(curr.crecimientoNeto150 || 0),
    repagos: acc.repagos + Number(curr.repagos || 0),
    carteraInicio: acc.carteraInicio + Number(curr.carteraInicio || 0),
    moraCppMax: acc.moraCppMax + Number(curr.moraCppMax || 0),
    moraCppActual: acc.moraCppActual + Number(curr.moraCppActual || 0),
    moraDefMax: acc.moraDefMax + Number(curr.moraDefMax || 0),
    moraDefActual: acc.moraDefActual + Number(curr.moraDefActual || 0),
  }), { crecimientoNeto150: 0, repagos: 0, carteraInicio: 0, moraCppMax: 0, moraCppActual: 0, moraDefMax: 0, moraDefActual: 0 });

  // Sumar recuperación a los totales de agencia completa
  const totAgenciaCompletaCrecNeto = totales.crecimientoNeto150 + totalesRec.crecimientoNeto150;
  const totAgenciaCompletaRepagos = totales.repagos + totalesRec.repagos;
  const totAgenciaCompletaMoraCppMax = totales.moraCppMax + totalesRec.moraCppMax;
  const totAgenciaCompletaMoraCppActual = totales.moraCppActual + totalesRec.moraCppActual;
  const totAgenciaCompletaMoraDefMax = totales.moraDefMax + totalesRec.moraDefMax;
  const totAgenciaCompletaMoraDefActual = totales.moraDefActual + totalesRec.moraDefActual;

  // Dinámica de altura: si es "Todas", limitamos la altura con scroll; si es una agencia, se expande a su tamaño real
  const containerHeightClass = filters.agency === 'Todas' ? 'max-h-[420px] overflow-y-auto' : '';

  return (
    <div className="space-y-8 animate-in fade-in duration-500" key={`${filters.period}-${filters.agency}`}>
      
      {/* FRANJA DE DÍAS LABORALES COMPACTA */}
      <WorkdayStrip periodo={filters.period} />

      {/* =========================================
          TABLA 1: AGENCIA COMPLETA
      ========================================= */}
      <Panel title="Agencia Completa: Comercial + Recuperador" icon={Building2}>
        <div className="overflow-x-auto pb-4">
          <table className="w-full text-left text-[11px] whitespace-nowrap">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="px-3 pb-2 font-semibold">Agencia</th>
                <th className="px-3 pb-2 font-semibold text-right">Crecimiento Neto 150</th>
                <th className="px-3 pb-2 font-semibold text-right">Colocación</th>
                <th className="px-3 pb-2 font-semibold text-right">Repagos</th>
                <th className="px-3 pb-2 font-semibold text-right">TEA</th>
                <th className="px-3 pb-2 font-semibold text-right">Nro Ope</th>
                <th className="px-3 pb-2 font-semibold text-right">Nro Socios Inicio</th>
                <th className="px-3 pb-2 font-semibold text-right">Nro Socios</th>
                <th className="px-3 pb-2 font-semibold text-right">Cartera</th>
                <th className="px-3 pb-2 font-semibold text-right bg-amber-500/10">Mora CPP Maximo</th>
                <th className="px-3 pb-2 font-semibold text-right bg-amber-500/10">Mora CPP Actual</th>
                <th className="px-3 pb-2 font-semibold text-right bg-rose-500/10">Mora Def. Maximo</th>
                <th className="px-3 pb-2 font-semibold text-right bg-rose-500/10">Mora Def. Actual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              <tr className="hover:bg-muted/30">
                <td className="px-3 py-3 font-bold">{filters.agency === 'Todas' ? 'TODA LA RED' : filters.agency}</td>
                <td className={`px-3 py-3 text-right font-mono ${totAgenciaCompletaCrecNeto >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtMoney(totAgenciaCompletaCrecNeto)}</td>
                <td className="px-3 py-3 text-right font-mono">{fmtMoney(totales.amountAchieved)}</td>
                <td className="px-3 py-3 text-right font-mono">{fmtMoney(totAgenciaCompletaRepagos)}</td>
                <td className="px-3 py-3 text-right font-mono">{fmtDec(totales.tea)}</td>
                <td className="px-3 py-3 text-right font-mono">{fmtNum(totales.opAchieved)}</td>
                <td className="px-3 py-3 text-right font-mono bg-amber-500/20">{fmtNum(totales.sociosInicio)}</td>
                <td className={`px-3 py-3 text-right font-mono ${totales.sociosActual < totales.sociosInicio ? 'text-rose-600' : 'text-emerald-600'}`}>{fmtNum(totales.sociosActual)}</td>
                <td className="px-3 py-3 text-right font-mono">{fmtMoney(totales.cartera)}</td>
                <td className="px-3 py-3 text-right font-mono bg-amber-500/10">{fmtMoney(totAgenciaCompletaMoraCppMax)}</td>
                <td className={`px-3 py-3 text-right font-mono bg-amber-500/10 ${totAgenciaCompletaMoraCppActual > totAgenciaCompletaMoraCppMax ? 'text-rose-600 font-bold' : 'text-emerald-600'}`}>{fmtMoney(totAgenciaCompletaMoraCppActual)}</td>
                <td className="px-3 py-3 text-right font-mono bg-rose-500/10">{fmtMoney(totAgenciaCompletaMoraDefMax)}</td>
                <td className={`px-3 py-3 text-right font-mono bg-rose-500/10 ${totAgenciaCompletaMoraDefActual > totAgenciaCompletaMoraDefMax ? 'text-rose-600 font-bold' : 'text-emerald-600'}`}>{fmtMoney(totAgenciaCompletaMoraDefActual)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>

      {/* =========================================
          TABLA 2: PARTE COMERCIAL
      ========================================= */}
      <Panel title="Agencia - Parte Comercial" subtitle="Desempeño individual por Asesor" icon={Users}>
        <div className={`overflow-x-auto pb-4 ${containerHeightClass}`}>
          <table className="w-full text-left text-[11px] whitespace-nowrap">
            <thead>
              <tr className="border-b border-border text-muted-foreground sticky top-0 bg-card z-10">
                <th className="px-3 pb-2 font-semibold">Asesor</th>
                <th className="px-3 pb-2 font-semibold text-right">Crec. Neto 150</th>
                <th className="px-3 pb-2 font-semibold text-right">Colocación</th>
                <th className="px-3 pb-2 font-semibold text-right">Repagos</th>
                <th className="px-3 pb-2 font-semibold text-right">TEA</th>
                <th className="px-3 pb-2 font-semibold text-right">Nro Ope</th>
                <th className="px-3 pb-2 font-semibold text-right">Plazo</th>
                <th className="px-3 pb-2 font-semibold text-right">Nro Soc. Inicio</th>
                <th className="px-3 pb-2 font-semibold text-right">Nro Socios</th>
                <th className="px-3 pb-2 font-semibold text-right">Cartera</th>
                <th className="px-3 pb-2 font-semibold text-right bg-amber-500/10">Mora CPP Max</th>
                <th className="px-3 pb-2 font-semibold text-right bg-amber-500/10">Mora Piso Actual</th>
                <th className="px-3 pb-2 font-semibold text-right">% Mora Piso</th>
                <th className="px-3 pb-2 font-semibold text-right bg-rose-500/10">Mora Def. Max</th>
                <th className="px-3 pb-2 font-semibold text-right bg-rose-500/10">Mora Def. Actual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {comercialFiltered.length > 0 ? comercialFiltered.map((row: any, i: number) => (
                <tr key={i} className="hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium">{row.asesor}</td>
                  <td className={`px-3 py-2 text-right font-mono ${row.crecimientoNeto150 >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtMoney(row.crecimientoNeto150)}</td>
                  <td className="px-3 py-2 text-right font-mono">{fmtMoney(row.amountAchieved)}</td>
                  <td className="px-3 py-2 text-right font-mono">{fmtMoney(row.repagos)}</td>
                  <td className="px-3 py-2 text-right font-mono">{fmtDec(row.tea)}</td>
                  <td className={`px-3 py-2 text-right font-mono ${row.opAchieved < 15 ? 'text-rose-600' : ''}`}>{fmtNum(row.opAchieved)}</td>
                  <td className={`px-3 py-2 text-right font-mono ${row.plazo < 6 ? 'text-rose-600' : 'text-emerald-600'}`}>{fmtDec(row.plazo)}</td>
                  <td className="px-3 py-2 text-right font-mono">{fmtNum(row.sociosInicio)}</td>
                  <td className={`px-3 py-2 text-right font-mono ${row.sociosActual < row.sociosInicio ? 'text-rose-600' : 'text-emerald-600'}`}>{fmtNum(row.sociosActual)}</td>
                  <td className="px-3 py-2 text-right font-mono">{fmtMoney(row.cartera)}</td>
                  <td className="px-3 py-2 text-right font-mono bg-amber-500/10">{fmtMoney(row.moraCppMax)}</td>
                  <td className={`px-3 py-2 text-right font-mono bg-amber-500/10 ${row.moraCppActual > row.moraCppMax ? 'text-rose-600' : 'text-emerald-600'}`}>{fmtMoney(row.moraCppActual)}</td>
                  <td className="px-3 py-2 text-right font-mono">{fmtPct(row.pctMoraCpp)}</td>
                  <td className="px-3 py-2 text-right font-mono bg-rose-500/10">{fmtMoney(row.moraDefMax)}</td>
                  <td className={`px-3 py-2 text-right font-mono bg-rose-500/10 ${row.moraDefActual > row.moraDefMax ? 'text-rose-600' : 'text-emerald-600'}`}>{fmtMoney(row.moraDefActual)}</td>
                </tr>
              )) : (
                <tr><td colSpan={15} className="px-3 py-4 text-center text-muted-foreground italic">No hay asesores comerciales para estos filtros.</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border font-bold bg-muted/20">
                <td className="px-3 py-2.5">Total Comercial</td>
                <td className={`px-3 py-2.5 text-right font-mono ${totales.crecimientoNeto150 >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtMoney(totales.crecimientoNeto150)}</td>
                <td className="px-3 py-2.5 text-right font-mono">{fmtMoney(totales.amountAchieved)}</td>
                <td className="px-3 py-2.5 text-right font-mono">{fmtMoney(totales.repagos)}</td>
                <td className="px-3 py-2.5 text-right font-mono">{fmtDec(totales.tea)}</td>
                <td className="px-3 py-2.5 text-right font-mono">{fmtNum(totales.opAchieved)}</td>
                <td className="px-3 py-2.5 text-right font-mono">{fmtDec(t_plazoComercial)}</td>
                <td className="px-3 py-2.5 text-right font-mono">{fmtNum(totales.sociosInicio)}</td>
                <td className="px-3 py-2.5 text-right font-mono">{fmtNum(totales.sociosActual)}</td>
                <td className="px-3 py-2.5 text-right font-mono">{fmtMoney(totales.cartera)}</td>
                <td className="px-3 py-2.5 text-right font-mono bg-amber-500/10">{fmtMoney(totales.moraCppMax)}</td>
                <td className="px-3 py-2.5 text-right font-mono bg-amber-500/10">{fmtMoney(totales.moraCppActual)}</td>
                <td className="px-3 py-2.5 text-right font-mono">{t_pctMoraCppComercial.toFixed(2)}%</td>
                <td className="px-3 py-2.5 text-right font-mono bg-rose-500/10">{fmtMoney(totales.moraDefMax)}</td>
                <td className="px-3 py-2.5 text-right font-mono bg-rose-500/10">{fmtMoney(totales.moraDefActual)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>

      {/* =========================================
          TABLA 3: PARTE RECUPERACIÓN
      ========================================= */}
      <Panel title="Agencia - Parte Recuperación" icon={ShieldAlert}>
        <div className="overflow-x-auto pb-4">
          <table className="w-full text-left text-[11px] whitespace-nowrap">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="px-3 pb-2 font-semibold">Recuperador</th>
                <th className="px-3 pb-2 font-semibold text-right">Crecimiento Neto 150</th>
                <th className="px-3 pb-2 font-semibold text-right">Repagos</th>
                <th className="px-3 pb-2 font-semibold text-right">Cartera de Inicio</th>
                <th className="px-3 pb-2 font-semibold text-right bg-amber-500/10">Mora CPP Maximo</th>
                <th className="px-3 pb-2 font-semibold text-right bg-amber-500/10">Mora CPP Actual</th>
                <th className="px-3 pb-2 font-semibold text-right bg-rose-500/10">Mora Def. Maximo</th>
                <th className="px-3 pb-2 font-semibold text-right bg-rose-500/10">Mora Def. Actual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {recuperacionFiltered.length > 0 ? recuperacionFiltered.map((row: any, i: number) => (
                <tr key={i} className="hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium">{row.recuperador}</td>
                  <td className={`px-3 py-2 text-right font-mono ${row.crecimientoNeto150 >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtMoney(row.crecimientoNeto150)}</td>
                  <td className="px-3 py-2 text-right font-mono">{fmtMoney(row.repagos)}</td>
                  <td className="px-3 py-2 text-right font-mono">{fmtMoney(row.carteraInicio)}</td>
                  <td className="px-3 py-2 text-right font-mono bg-amber-500/10">{fmtMoney(row.moraCppMax)}</td>
                  <td className={`px-3 py-2 text-right font-mono bg-amber-500/10 ${row.moraCppActual > row.moraCppMax ? 'text-rose-600' : 'text-emerald-600'}`}>{fmtMoney(row.moraCppActual)}</td>
                  <td className="px-3 py-2 text-right font-mono bg-rose-500/10">{fmtMoney(row.moraDefMax)}</td>
                  <td className={`px-3 py-2 text-right font-mono bg-rose-500/10 ${row.moraDefActual > row.moraDefMax ? 'text-rose-600' : 'text-emerald-600'}`}>{fmtMoney(row.moraDefActual)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={8} className="px-3 py-4 text-center text-muted-foreground italic">No hay recuperadores asignados para estos filtros.</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border font-bold bg-muted/20">
                <td className="px-3 py-2.5">Total Recuperación</td>
                <td className={`px-3 py-2.5 text-right font-mono ${totalesRec.crecimientoNeto150 >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtMoney(totalesRec.crecimientoNeto150)}</td>
                <td className="px-3 py-2.5 text-right font-mono">{fmtMoney(totalesRec.repagos)}</td>
                <td className="px-3 py-2.5 text-right font-mono">{fmtMoney(totalesRec.carteraInicio)}</td>
                <td className="px-3 py-2.5 text-right font-mono bg-amber-500/10">{fmtMoney(totalesRec.moraCppMax)}</td>
                <td className="px-3 py-2.5 text-right font-mono bg-amber-500/10">{fmtMoney(totalesRec.moraCppActual)}</td>
                <td className="px-3 py-2.5 text-right font-mono bg-rose-500/10">{fmtMoney(totalesRec.moraDefMax)}</td>
                <td className="px-3 py-2.5 text-right font-mono bg-rose-500/10">{fmtMoney(totalesRec.moraDefActual)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>
    </div>
  );
}