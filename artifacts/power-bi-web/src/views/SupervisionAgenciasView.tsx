import { useQuery } from '@tanstack/react-query';
import { Filters, View } from '../utils/constants';
import { money, number } from '../utils/formatters';
import { LoadingState } from '../components/ui/LoadingState';
import { SectionBand } from '../components/ui/SectionBand';
import { Panel } from '../components/ui/Panel';
import { TableShell } from '../components/ui/TableShell';
import { StatusCell } from '../components/ui/StatusCell';
import { WorkdayStrip } from '../components/WorkdayStrip';

export function SupervisionAgenciasView({ navigate, filters }: { navigate: (view: View) => void; filters: Filters }) {
  const { data: supervisionBD, isLoading, error } = useQuery({
    queryKey: ['indicadores-supervision', filters.period],
    queryFn: async () => {
      if (!filters.period || filters.period === 'Cargando...') return null;
      const res = await fetch(`http://localhost:3000/api/supervision/${filters.period}`);
      if (!res.ok) throw new Error('Error al cargar supervisión');
      return res.json();
    },
    enabled: !!filters.period && filters.period !== 'Cargando...'
  });

  if (isLoading || !supervisionBD) return <LoadingState />;
  if (error) return <div className="p-5 text-red-500 font-bold border border-red-200 bg-red-50 rounded-xl">Error de conexión al DWH. Verifica la terminal del backend.</div>;

  const filterByAgency = (arr: any[]) => filters.agency === 'Todas' ? arr : arr.filter((r: any) => r.agency === filters.agency);
  const sum = (arr: any[], key: string) => arr.reduce((acc, row) => acc + Number(row[key] || 0), 0);
  const wAvg = (arr: any[], valKey: string, weightKey: string) => {
    const totalWeight = sum(arr, weightKey);
    if (totalWeight === 0) return 0;
    const sumProduct = arr.reduce((acc, row) => acc + (Number(row[valKey] || 0) * Number(row[weightKey] || 0)), 0);
    return sumProduct / totalWeight;
  };

  const dataCompleta = filterByAgency(supervisionBD.completa || []);
  const dataComercial = filterByAgency(supervisionBD.comercial || []);
  const dataRecuperacion = filterByAgency(supervisionBD.recuperacion || []);

  // TOTALES: TABLA COMPLETA
  const t1_crecNeto = sum(dataCompleta, 'crecimientoNeto150');
  const t1_tea = wAvg(dataCompleta, 'tea', 'amountAchieved');
  const t1_metaOp = sum(dataCompleta, 'opTarget');
  const t1_nroOp = sum(dataCompleta, 'opAchieved');
  const t1_plazo = wAvg(dataCompleta, 'plazo', 'opAchieved');
  const t1_socInicio = sum(dataCompleta, 'sociosInicio');
  const t1_socActual = sum(dataCompleta, 'sociosActual');
  const t1_colocacion = sum(dataCompleta, 'amountAchieved');
  const t1_cartera = sum(dataCompleta, 'cartera');
  const t1_moraCppMax = sum(dataCompleta, 'moraCppMax');
  const t1_moraCppAct = sum(dataCompleta, 'moraCppActual');
  const t1_moraDefMax = sum(dataCompleta, 'moraDefMax');
  const t1_moraDefAct = sum(dataCompleta, 'moraDefActual');
  const t1_repagos = sum(dataCompleta, 'repagos');

  // TOTALES: TABLA COMERCIAL
  const t2_crecNeto = sum(dataComercial, 'crecimientoNeto150');
  const t2_tea = wAvg(dataComercial, 'tea', 'amountAchieved');
  const t2_metaOp = sum(dataComercial, 'opTarget');
  const t2_nroOp = sum(dataComercial, 'opAchieved');
  const t2_plazo = wAvg(dataComercial, 'plazo', 'opAchieved');
  const t2_socInicio = sum(dataComercial, 'sociosInicio');
  const t2_socActual = sum(dataComercial, 'sociosActual');
  const t2_colocacion = sum(dataComercial, 'amountAchieved');
  const t2_cartera = sum(dataComercial, 'cartera');
  const t2_moraCppMax = sum(dataComercial, 'moraCppMax');
  const t2_moraCppAct = sum(dataComercial, 'moraCppActual');
  const t2_pctMoraCpp = t2_cartera > 0 ? (t2_moraCppAct / t2_cartera) * 100 : 0;
  const t2_moraDefMax = sum(dataComercial, 'moraDefMax');
  const t2_moraDefAct = sum(dataComercial, 'moraDefActual');
  const t2_repagos = sum(dataComercial, 'repagos');
  const t2_pctMoraDef = t2_cartera > 0 ? (t2_moraDefAct / t2_cartera) * 100 : 0;
  const t2_carteraFin = sum(dataComercial, 'carteraFin');
  const t2_pctMoraCppCf = t2_carteraFin > 0 ? (t2_moraCppAct / t2_carteraFin) * 100 : 0;
  const t2_pctMoraDefCf = t2_carteraFin > 0 ? (t2_moraDefAct / t2_carteraFin) * 100 : 0;

  // TOTALES: TABLA RECUPERACIÓN
  const t3_crecNeto = sum(dataRecuperacion, 'crecimientoNeto150');
  const t3_cartInicio = sum(dataRecuperacion, 'carteraInicio');
  const t3_moraCppMax = sum(dataRecuperacion, 'moraCppMax');
  const t3_moraCppAct = sum(dataRecuperacion, 'moraCppActual');
  const t3_moraDefMax = sum(dataRecuperacion, 'moraDefMax');
  const t3_moraDefAct = sum(dataRecuperacion, 'moraDefActual');
  const t3_repagos = sum(dataRecuperacion, 'repagos');

  const colDestacada = "bg-[hsl(35_80%_50%/.15)]";

  return (
    <div className="space-y-6" key={`${filters.period}-${filters.agency}`}>
      {/* COMPONENTE DE DÍAS LABORALES */}
      <WorkdayStrip periodo={filters.period} />
      {/* 1. AGENCIA COMPLETA */}
      <SectionBand tone="blue">Agencia Completa: Comercial + Recuperadores</SectionBand>
      <Panel title="Indicadores por agencia" eyebrow="Crecimiento Neto 150 · Cartera y Mora" action={<button onClick={() => navigate('agencia')} className="text-xs font-semibold text-[hsl(var(--primary))] hover:underline">Abrir detalle →</button>}>
        <TableShell minWidth="1800px">
          <table className="w-full text-[13px] whitespace-nowrap">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3.5 text-left font-bold text-muted-foreground">Agencia</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Crecimiento Neto 150</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">TEA</th>
                <th className={`px-4 py-3.5 text-right font-bold text-muted-foreground ${colDestacada}`}>Meta Ope</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Nro Ope</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Plazo</th>
                <th className={`px-4 py-3.5 text-right font-bold text-muted-foreground ${colDestacada}`}>Nro Socios de Inicio</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Nro Socios</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Colocación</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Cartera</th>
                <th className={`px-4 py-3.5 text-right font-bold text-muted-foreground ${colDestacada}`}>Mora CPP Máximo</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Mora CPP Actual</th>
                <th className={`px-4 py-3.5 text-right font-bold text-muted-foreground ${colDestacada}`}>Mora Deficiente Máximo</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Mora deficiente real</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Repagos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {dataCompleta.map((r: any) => (
                <tr key={r.agency} onClick={() => navigate('agencia')} className="cursor-pointer hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-bold text-left">{r.agency}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${r.crecimientoNeto150 < 0 ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--primary))]'}`}>
                    {r.crecimientoNeto150 >= 0 ? '+' : ''}{money(r.crecimientoNeto150)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{Number(r.tea).toFixed(2)}</td>
                  <td className={`px-4 py-3 text-right font-mono font-semibold ${colDestacada}`}>{r.opTarget}</td>
                  <td className="px-4 py-3 text-right font-mono">{r.opAchieved}</td>
                  <td className="px-4 py-3 text-right font-mono text-[hsl(138_72%_35%)]">{Number(r.plazo).toFixed(2)}</td>
                  <td className={`px-4 py-3 text-right font-mono font-semibold ${colDestacada}`}>{number(r.sociosInicio)}</td>
                  <td className="px-4 py-3 text-right font-mono text-[hsl(138_72%_35%)]">{number(r.sociosActual)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{money(r.amountAchieved)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{money(r.cartera)}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${colDestacada}`}>{money(r.moraCppMax)}</td>
                  <td className="px-4 py-3 text-right"><StatusCell value={r.moraCppActual} threshold={r.moraCppMax} /></td>
                  <td className={`px-4 py-3 text-right font-semibold ${colDestacada}`}>{money(r.moraDefMax)}</td>
                  <td className="px-4 py-3 text-right"><StatusCell value={r.moraDefActual} threshold={r.moraDefMax} /></td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{money(r.repagos)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border font-bold bg-muted/40">
                <td className="px-4 py-3 text-left">Total</td>
                <td className={`px-4 py-3 text-right ${t1_crecNeto < 0 ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--primary))]'}`}>
                  {t1_crecNeto >= 0 ? '+' : ''}{money(t1_crecNeto)}
                </td>
                <td className="px-4 py-3 text-right font-mono">{t1_tea.toFixed(2)}</td>
                <td className={`px-4 py-3 text-right font-mono ${colDestacada}`}>{t1_metaOp}</td>
                <td className="px-4 py-3 text-right font-mono">{t1_nroOp}</td>
                <td className="px-4 py-3 text-right font-mono text-[hsl(138_72%_35%)]">{t1_plazo.toFixed(2)}</td>
                <td className={`px-4 py-3 text-right font-mono ${colDestacada}`}>{number(t1_socInicio)}</td>
                <td className="px-4 py-3 text-right font-mono text-[hsl(138_72%_35%)]">{number(t1_socActual)}</td>
                <td className="px-4 py-3 text-right font-mono">{money(t1_colocacion)}</td>
                <td className="px-4 py-3 text-right font-mono">{money(t1_cartera)}</td>
                <td className={`px-4 py-3 text-right ${colDestacada}`}>{money(t1_moraCppMax)}</td>
                <td className="px-4 py-3 text-right font-mono"><StatusCell value={t1_moraCppAct} threshold={t1_moraCppMax} /></td>
                <td className={`px-4 py-3 text-right font-mono ${colDestacada}`}>{money(t1_moraDefMax)}</td>
                <td className="px-4 py-3 text-right font-mono"><StatusCell value={t1_moraDefAct} threshold={t1_moraDefMax} /></td>
                <td className="px-4 py-3 text-right font-mono">{money(t1_repagos)}</td>
              </tr>
            </tfoot>
          </table>
        </TableShell>
      </Panel>

      {/* 2. AGENCIA COMERCIAL */}
      <SectionBand tone="green">Agencias - Parte Comercial</SectionBand>
      <Panel title="Indicadores por agencia" eyebrow="Analistas y Administradores">
        <TableShell minWidth="2400px">
          <table className="w-full text-[13px] whitespace-nowrap">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3.5 text-left font-bold text-muted-foreground">Agencia</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Crecimiento Neto 150</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">TEA</th>
                <th className={`px-4 py-3.5 text-right font-bold text-muted-foreground ${colDestacada}`}>Meta Ope</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Nro Ope</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Plazo</th>
                <th className={`px-4 py-3.5 text-right font-bold text-muted-foreground ${colDestacada}`}>Nro Socios de Inicio</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Nro Socios</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Colocación</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Cartera</th>
                <th className={`px-4 py-3.5 text-right font-bold text-muted-foreground ${colDestacada}`}>Mora Piso Maximo</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Mora Piso Actual</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">% Mora Piso</th>
                <th className={`px-4 py-3.5 text-right font-bold text-muted-foreground ${colDestacada}`}>Mora Deficiente Maximo</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Mora deficiente real</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Repagos</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">% Mora deficiente</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">M M Cartera Fin</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">% mora piso cf</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Mora deficiente cf</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {dataComercial.map((r: any) => (
                <tr key={r.agency} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-bold text-left">{r.agency}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${r.crecimientoNeto150 < 0 ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--primary))]'}`}>
                    {r.crecimientoNeto150 >= 0 ? '+' : ''}{money(r.crecimientoNeto150)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{Number(r.tea).toFixed(2)}</td>
                  <td className={`px-4 py-3 text-right font-mono font-semibold ${colDestacada}`}>{r.opTarget}</td>
                  <td className="px-4 py-3 text-right font-mono">{r.opAchieved}</td>
                  <td className="px-4 py-3 text-right font-mono text-[hsl(138_72%_35%)]">{Number(r.plazo).toFixed(2)}</td>
                  <td className={`px-4 py-3 text-right font-mono font-semibold ${colDestacada}`}>{number(r.sociosInicio)}</td>
                  <td className="px-4 py-3 text-right font-mono text-[hsl(138_72%_35%)]">{number(r.sociosActual)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{money(r.amountAchieved)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{money(r.cartera)}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${colDestacada}`}>{money(r.moraCppMax)}</td>
                  <td className="px-4 py-3 text-right"><StatusCell value={r.moraCppActual} threshold={r.moraCppMax} /></td>
                  <td className="px-4 py-3 text-right font-mono">{Number(r.pctMoraCpp).toFixed(2)}%</td>
                  <td className={`px-4 py-3 text-right font-semibold ${colDestacada}`}>{money(r.moraDefMax)}</td>
                  <td className="px-4 py-3 text-right"><StatusCell value={r.moraDefActual} threshold={r.moraDefMax} /></td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{money(r.repagos)}</td>
                  <td className="px-4 py-3 text-right font-mono">{Number(r.pctMoraDef).toFixed(2)}%</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{money(r.carteraFin)}</td>
                  <td className="px-4 py-3 text-right font-mono">{Number(r.pctMoraCppCf).toFixed(2)}%</td>
                  <td className="px-4 py-3 text-right font-mono">{Number(r.pctMoraDefCf).toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border font-bold bg-muted/40">
                <td className="px-4 py-3 text-left">Total</td>
                <td className={`px-4 py-3 text-right ${t2_crecNeto < 0 ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--primary))]'}`}>
                  {t2_crecNeto >= 0 ? '+' : ''}{money(t2_crecNeto)}
                </td>
                <td className="px-4 py-3 text-right font-mono">{t2_tea.toFixed(2)}</td>
                <td className={`px-4 py-3 text-right font-mono ${colDestacada}`}>{t2_metaOp}</td>
                <td className="px-4 py-3 text-right font-mono">{t2_nroOp}</td>
                <td className="px-4 py-3 text-right font-mono text-[hsl(138_72%_35%)]">{t2_plazo.toFixed(2)}</td>
                <td className={`px-4 py-3 text-right font-mono ${colDestacada}`}>{number(t2_socInicio)}</td>
                <td className="px-4 py-3 text-right font-mono text-[hsl(138_72%_35%)]">{number(t2_socActual)}</td>
                <td className="px-4 py-3 text-right font-mono">{money(t2_colocacion)}</td>
                <td className="px-4 py-3 text-right font-mono">{money(t2_cartera)}</td>
                <td className={`px-4 py-3 text-right font-mono ${colDestacada}`}>{money(t2_moraCppMax)}</td>
                <td className="px-4 py-3 text-right font-mono"><StatusCell value={t2_moraCppAct} threshold={t2_moraCppMax} /></td>
                <td className="px-4 py-3 text-right font-mono">{t2_pctMoraCpp.toFixed(2)}%</td>
                <td className={`px-4 py-3 text-right font-mono ${colDestacada}`}>{money(t2_moraDefMax)}</td>
                <td className="px-4 py-3 text-right font-mono"><StatusCell value={t2_moraDefAct} threshold={t2_moraDefMax} /></td>
                <td className="px-4 py-3 text-right font-mono">{money(t2_repagos)}</td>
                <td className="px-4 py-3 text-right font-mono">{t2_pctMoraDef.toFixed(2)}%</td>
                <td className="px-4 py-3 text-right font-mono">{money(t2_carteraFin)}</td>
                <td className="px-4 py-3 text-right font-mono">{t2_pctMoraCppCf.toFixed(2)}%</td>
                <td className="px-4 py-3 text-right font-mono">{t2_pctMoraDefCf.toFixed(2)}%</td>
              </tr>
            </tfoot>
          </table>
        </TableShell>
      </Panel>

      {/* 3. RECUPERADORES */}
      <SectionBand tone="coral">Agencias - Parte Recuperación</SectionBand>
      <Panel title="Recuperación por agencia" eyebrow="Cartera de inicio, mora deficiente y repagos">
        <TableShell minWidth="1200px">
          <table className="w-full text-[13px] whitespace-nowrap">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3.5 text-left font-bold text-muted-foreground">Agencia</th>
                <th className="px-4 py-3.5 text-left font-bold text-muted-foreground">Recuperador</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Crecimiento Neto 150</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Cartera de Inicio</th>
                <th className={`px-4 py-3.5 text-right font-bold text-muted-foreground ${colDestacada}`}>Mora CPP Máximo</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Mora CPP Actual</th>
                <th className={`px-4 py-3.5 text-right font-bold text-muted-foreground ${colDestacada}`}>Mora Deficiente Maximo</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Mora deficiente real</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Repagos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {dataRecuperacion.map((r: any) => (
                <tr key={`${r.agency}-${r.recuperador}`} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-bold text-left">{r.agency}</td>
                  <td className="px-4 py-3 text-left text-muted-foreground">{r.recuperador}</td>
                  <td className="px-4 py-3 text-right font-semibold text-[hsl(var(--destructive))]">
                    -{money(Math.abs(r.crecimientoNeto150))}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{money(r.carteraInicio)}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${colDestacada}`}>{money(r.moraCppMax)}</td>
                  <td className="px-4 py-3 text-right"><StatusCell value={r.moraCppActual} threshold={r.moraCppMax} /></td>
                  <td className={`px-4 py-3 text-right font-semibold ${colDestacada}`}>{money(r.moraDefMax)}</td>
                  <td className="px-4 py-3 text-right"><StatusCell value={r.moraDefActual} threshold={r.moraDefMax} /></td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{money(r.repagos)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border font-bold bg-muted/40">
                <td className="px-4 py-3 text-left font-mono" colSpan={2}>Total</td>
                <td className="px-4 py-3 text-right text-[hsl(var(--destructive))]">-{money(Math.abs(t3_crecNeto))}</td>
                <td className="px-4 py-3 text-right font-mono">{money(t3_cartInicio)}</td>
                <td className={`px-4 py-3 text-right font-mono ${colDestacada}`}>{money(t3_moraCppMax)}</td>
                <td className="px-4 py-3 text-right font-mono"><StatusCell value={t3_moraCppAct} threshold={t3_moraCppMax} /></td>
                <td className={`px-4 py-3 text-right font-mono ${colDestacada}`}>{money(t3_moraDefMax)}</td>
                <td className="px-4 py-3 text-right font-mono"><StatusCell value={t3_moraDefAct} threshold={t3_moraDefMax} /></td>
                <td className="px-4 py-3 text-right font-mono">{money(t3_repagos)}</td>
              </tr>
            </tfoot>
          </table>
        </TableShell>
      </Panel>
    </div>
  );
}