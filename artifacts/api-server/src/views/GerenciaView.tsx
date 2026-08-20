import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, Line, Legend, Area } from 'recharts';
import { TrendingUp, Target, Building2, AlertTriangle, RefreshCw } from 'lucide-react';

import { Filters, View } from '../utils/constants';
import { money, number } from '../utils/formatters';
import { LoadingState } from '../components/ui/LoadingState';
import { SectionBand } from '../components/ui/SectionBand';
import { Panel } from '../components/ui/Panel';
import { TableShell } from '../components/ui/TableShell';
import { KpiCard } from '../components/ui/KpiCard';
import { WorkdayStrip } from '../components/WorkdayStrip';

// 1. MICRO-COMPONENTE: Velocímetro de 180 grados
function HalfGauge({ value, title, color = '#15803d' }: { value: number; title: string; color?: string }) {
  const radius = 80;
  const stroke = 26;
  const normalizedValue = Math.min(Math.max(value, 0), 100);
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (normalizedValue / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-4 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className="relative flex items-end justify-center overflow-hidden" style={{ width: '200px', height: '100px' }}>
        <svg width="200" height="200" className="absolute top-0 transform transition-transform duration-1000">
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} strokeLinecap="round" />
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="transition-all duration-1000 ease-out" />
        </svg>
        <div className="absolute bottom-1 text-center font-display text-4xl font-bold">{value}%</div>
        <div className="absolute bottom-0 left-2 font-mono text-[10px] text-muted-foreground">0%</div>
        <div className="absolute bottom-0 right-1 font-mono text-[10px] text-muted-foreground">100%</div>
      </div>
    </div>
  );
}

// 2. HOOK: Drag & Drop de columnas
const ORDEN_INICIAL_COMERCIAL = ['agency', 'cartera', 'crecimiento', 'nroOper', 'desembolsos', 'repagos', 'duracion', 'moraCPP', 'pctMora', 'moraDef', 'crecNeto150'];

function useColumnOrder(initialOrder: string[]) {
  const [order, setOrder] = useState(initialOrder);
  const isModified = JSON.stringify(order) !== JSON.stringify(initialOrder);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('col_id', id);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('col_id');
    if (!sourceId || sourceId === targetId) return;
    const sourceIndex = order.indexOf(sourceId);
    const targetIndex = order.indexOf(targetId);
    const newOrder = [...order];
    const [removed] = newOrder.splice(sourceIndex, 1);
    newOrder.splice(targetIndex, 0, removed);
    setOrder(newOrder);
  };
  const resetOrder = () => setOrder(initialOrder);
  return { order, handleDragStart, handleDragOver, handleDrop, resetOrder, isModified };
}

// 3. VISTA PRINCIPAL
export function GerenciaView({ navigate, filters }: { navigate: (view: View) => void; filters: Filters }) {
  const [tipoCartera, setTipoCartera] = useState<'comercial' | 'normalizacion'>('comercial');
  const { order, handleDragStart, handleDragOver, handleDrop, resetOrder, isModified } = useColumnOrder(ORDEN_INICIAL_COMERCIAL);

  const { data: indicadoresBD, isLoading, error } = useQuery({
    queryKey: ['indicadores-gerencia', filters.period],
    queryFn: async () => {
      if (!filters.period || filters.period === 'Cargando...') return null;
      const res = await fetch(`http://localhost:3000/api/indicadores-gerencia/${filters.period}`);
      if (!res.ok) throw new Error('Error al cargar indicadores');
      return res.json();
    },
    enabled: !!filters.period && filters.period !== 'Cargando...'
  });

  if (isLoading || !indicadoresBD) return <LoadingState />;
  if (error) return <div className="p-5 text-red-500 font-bold border border-red-200 bg-red-50 rounded-xl">Error de conexión al DWH.</div>;

  const datosFiltrados = (indicadoresBD.comercial || []).filter((row: any) => filters.agency === 'Todas' ? true : row.agency === filters.agency);
  const datosNormalizacion = (indicadoresBD.normalizacion || []).filter((row: any) => filters.agency === 'Todas' ? true : row.agency === filters.agency);

  // Cálculos Comerciales
  const totalOpLogradas = datosFiltrados.reduce((sum: number, row: any) => sum + Number(row.opAchieved || 0), 0);
  const totalOpMeta = datosFiltrados.reduce((sum: number, row: any) => sum + Number(row.opTarget || 0), 0);
  const pctAvanceOperaciones = totalOpMeta > 0 ? Math.round((totalOpLogradas / totalOpMeta) * 100) : 0;
  const totalMontoLogrado = datosFiltrados.reduce((sum: number, row: any) => sum + Number(row.amountAchieved || 0), 0);
  const totalMontoMeta = datosFiltrados.reduce((sum: number, row: any) => sum + Number(row.amountTarget || 0), 0);
  const pctAvanceMontos = totalMontoMeta > 0 ? Math.round((totalMontoLogrado / totalMontoMeta) * 100) : 0;
  const totCartera = datosFiltrados.reduce((sum: number, row: any) => sum + Number(row.cartera || 0), 0);
  const totCrecimientoBruto = datosFiltrados.reduce((sum: number, row: any) => sum + Number(row.crecimientoBruto || 0), 0);
  const totRepagos = datosFiltrados.reduce((sum: number, row: any) => sum + Number(row.repagos || 0), 0);
  const totMoraCPP = datosFiltrados.reduce((sum: number, row: any) => sum + Number(row.moraCPP_soles || 0), 0);
  const totMoraDeficiente = datosFiltrados.reduce((sum: number, row: any) => sum + Number(row.moraDeficiente_soles || 0), 0);
  const totCrecimientoNeto150 = datosFiltrados.reduce((sum: number, row: any) => sum + Number(row.crecimientoNeto150 || 0), 0);
  const totExcedenteMora = datosFiltrados.reduce((sum: number, row: any) => sum + Number(row.excedente || 0), 0);
  const avgPctMora = totCartera > 0 ? (totMoraCPP / totCartera) * 100 : 0;
  const totDuracionPonderada = datosFiltrados.reduce((sum: number, row: any) => sum + (Number(row.duration || 0) * Number(row.opAchieved || 0)), 0);
  const avgDuracion = totalOpLogradas > 0 ? (totDuracionPonderada / totalOpLogradas) : 0;

  // Cálculos Normalización
  const totNormCartera = datosNormalizacion.reduce((sum: number, row: any) => sum + Number(row.cartera || 0), 0);
  const totNormRepagos = datosNormalizacion.reduce((sum: number, row: any) => sum + Number(row.repagos || 0), 0);
  const totNormMoraCPP = datosNormalizacion.reduce((sum: number, row: any) => sum + Number(row.moraCPP_soles || 0), 0);
  const totNormMoraDef = datosNormalizacion.reduce((sum: number, row: any) => sum + Number(row.moraDeficiente_soles || 0), 0);
  const totNormCrecNeto30 = datosNormalizacion.reduce((sum: number, row: any) => sum + Number(row.crecNeto30 || 0), 0);
  const avgNormPctMora = totNormCartera > 0 ? (totNormMoraCPP / totNormCartera) * 100 : 0;

  const defColumnasComercial = [
    { id: 'agency', header: 'Agencia', align: 'left', cell: (row: any) => <span className="font-semibold">{row.agency}</span>, footer: () => 'Total Comercial' },
    { id: 'cartera', header: 'Cartera', align: 'right', cell: (row: any) => money(row.cartera), footer: () => money(totCartera) },
    { id: 'crecimiento', header: 'Crecimiento', align: 'right', 
      cell: (row: any) => <span className={`font-semibold ${row.crecimientoBruto >= 0 ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--destructive))]'}`}>{row.crecimientoBruto >= 0 ? '+' : ''}{money(row.crecimientoBruto)}</span>, 
      footer: () => <span className={totCrecimientoBruto >= 0 ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--destructive))]'}>{totCrecimientoBruto >= 0 ? '+' : ''}{money(totCrecimientoBruto)}</span> 
    },
    { id: 'nroOper', header: 'Nro Oper', align: 'right', cell: (row: any) => <span className="font-mono bg-[hsl(var(--accent)/.1)] px-1">{row.opAchieved}</span>, footer: () => totalOpLogradas },
    { id: 'desembolsos', header: 'Desembolsos', align: 'right', cell: (row: any) => money(row.amountAchieved), footer: () => money(totalMontoLogrado) },
    { id: 'repagos', header: 'Repagos', align: 'right', cell: (row: any) => money(row.repagos), footer: () => money(totRepagos) },
    { id: 'duracion', header: 'Duración', align: 'right', cell: (row: any) => <span className="font-mono">{Number(row.duration).toFixed(2)}</span>, footer: () => <span className="font-mono">{avgDuracion.toFixed(2)}</span> },
    { id: 'moraCPP', header: 'Mora CPP', align: 'right', cell: (row: any) => <span className={row.cpp > 10 ? 'text-[hsl(var(--destructive))]' : ''}>{money(row.moraCPP_soles)}</span>, footer: () => money(totMoraCPP) },
    { id: 'pctMora', header: '% Mora', align: 'right', cell: (row: any) => <span className={row.cpp > 10 ? 'bg-[hsl(var(--destructive)/.1)] text-[hsl(var(--destructive))] font-bold px-1' : ''}>{Number(row.cpp).toFixed(2)}%</span>, footer: () => `${avgPctMora.toFixed(2)}%` },
    { id: 'moraDef', header: 'Mora Defic.', align: 'right', cell: (row: any) => money(row.moraDeficiente_soles), footer: () => money(totMoraDeficiente) },
    { id: 'crecNeto150', header: 'Crec. Neto 150', align: 'right', 
      cell: (row: any) => <span className={`font-bold ${row.crecimientoNeto150 >= 0 ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--destructive))]'}`}>{row.crecimientoNeto150 >= 0 ? '+' : ''}{money(row.crecimientoNeto150)}</span>, 
      footer: () => <span className={totCrecimientoNeto150 >= 0 ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--destructive))]'}>{totCrecimientoNeto150 >= 0 ? '+' : ''}{money(totCrecimientoNeto150)}</span> 
    }
  ];

  const columnasRender = order.map(id => defColumnasComercial.find(c => c.id === id)!);

  return (
    <div className="space-y-8" key={filters.period}>
      <WorkdayStrip periodo={filters.period} />
      
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Colocación acumulada" value={money(totalMontoLogrado)} note="Logrado a la fecha" icon={TrendingUp} delta={`+${pctAvanceMontos}%`} />
        <KpiCard label="Meta mensual" value={money(totalMontoMeta)} note="Monto objetivo" icon={Target} tone="gold" />
        <KpiCard label="Crecimiento Neto 150" value={money(totCrecimientoNeto150)} note="Variación real del mes" icon={Building2} tone="blue" />
        <KpiCard label="Excedente Mora CPP" value={money(totExcedenteMora)} note="Sobre la meta del 10%" icon={AlertTriangle} tone={totExcedenteMora > 0 ? "red" : "teal"} delta={totExcedenteMora > 0 ? "Excede" : "OK"} />
      </div>

      <SectionBand tone="green">Indicadores de Crecimiento Global</SectionBand>
      <Panel 
        title="Matriz General de Resultados" 
        eyebrow="Flujo, Duración y Riesgo consolidado"
        action={isModified && (<button onClick={resetOrder} className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm transition hover:text-foreground"><RefreshCw size={13} /> Restablecer columnas</button>)}
      >
        <div className="mb-5 flex w-full max-w-sm rounded-lg bg-muted/60 p-1 font-semibold">
          <button onClick={() => setTipoCartera('comercial')} className={`flex-1 rounded-md py-2 text-xs transition-all ${tipoCartera === 'comercial' ? 'bg-white text-[hsl(var(--primary))] shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Cartera Comercial</button>
          <button onClick={() => setTipoCartera('normalizacion')} className={`flex-1 rounded-md py-2 text-xs transition-all ${tipoCartera === 'normalizacion' ? 'bg-white text-[hsl(var(--primary))] shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Cartera Normalización</button>
        </div>

        {tipoCartera === 'comercial' ? (
          <div key="vista-comercial" className="animate-in fade-in zoom-in-95 duration-200">
            <TableShell minWidth="1200px">
              <table className="w-full text-[13px] whitespace-nowrap">
                <thead>
                  <tr className="border-b border-border bg-[hsl(138_72%_32%/.08)]">
                    {columnasRender.map((col) => (
                      <th key={col.id} draggable onDragStart={(e) => handleDragStart(e, col.id)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, col.id)} title="Arrastra para mover la columna" className={`px-4 py-3.5 font-bold text-[hsl(138_72%_25%)] cursor-grab active:cursor-grabbing transition-colors hover:bg-[hsl(138_72%_32%/.12)] ${col.align === 'left' ? 'text-left' : 'text-right'}`}>
                        {col.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {datosFiltrados.map((row: any) => (
                    <tr key={row.agency} className="hover:bg-muted/20 transition-colors">
                      {columnasRender.map((col) => (
                        <td key={`${row.agency}-${col.id}`} className={`px-4 py-3 ${col.align === 'left' ? 'text-left' : 'text-right'}`}>{col.cell(row)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border font-bold bg-muted/30">
                    {columnasRender.map((col) => (
                      <td key={`footer-${col.id}`} className={`px-4 py-3 ${col.align === 'left' ? 'text-left' : 'text-right'}`}>{col.footer()}</td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </TableShell>
          </div>
        ) : (
          <div key="vista-normalizacion" className="animate-in fade-in zoom-in-95 duration-200">
            <TableShell minWidth="1000px">
              <table className="w-full text-[13px] whitespace-nowrap">
                <thead>
                  <tr className="border-b border-border bg-[hsl(138_72%_32%/.08)]">
                    <th className="px-4 py-3.5 text-left font-bold text-[hsl(138_72%_25%)]">Agencia</th>
                    <th className="px-4 py-3.5 text-left font-bold text-[hsl(138_72%_25%)]">Recuperador</th>
                    <th className="px-4 py-3.5 text-right font-bold text-[hsl(138_72%_25%)]">Cartera</th>
                    <th className="px-4 py-3.5 text-right font-bold text-[hsl(138_72%_25%)]">Repagos</th>
                    <th className="px-4 py-3.5 text-right font-bold text-[hsl(138_72%_25%)]">Mora CPP</th>
                    <th className="px-4 py-3.5 text-right font-bold text-[hsl(138_72%_25%)]">Mora Deficiente</th>
                    <th className="px-4 py-3.5 text-right font-bold text-[hsl(138_72%_25%)]">% Mora 9</th>
                    <th className="px-4 py-3.5 text-right font-bold text-[hsl(138_72%_25%)]">Crec. Neto 30</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {datosNormalizacion.map((row: any) => (
                    <tr key={`${row.agency}-${row.recuperador}`} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-semibold text-left">{row.agency}</td>
                      <td className="px-4 py-3 text-left text-muted-foreground">{row.recuperador}</td>
                      <td className="px-4 py-3 text-right">{money(row.cartera)}</td>
                      <td className="px-4 py-3 text-right">{money(row.repagos)}</td>
                      <td className="px-4 py-3 text-right text-[hsl(var(--destructive))]">{money(row.moraCPP_soles)}</td>
                      <td className="px-4 py-3 text-right text-[hsl(var(--destructive))]">{money(row.moraDeficiente_soles)}</td>
                      <td className="px-4 py-3 text-right bg-[hsl(var(--destructive)/.1)] text-[hsl(var(--destructive))] font-bold">{Number(row.pctMora9).toFixed(2)}%</td>
                      <td className="px-4 py-3 text-right font-bold text-[hsl(var(--destructive))]">{money(row.crecNeto30)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border font-bold bg-muted/30">
                    <td className="px-4 py-3 text-left" colSpan={2}>Total Normalización</td>
                    <td className="px-4 py-3 text-right">{money(totNormCartera)}</td>
                    <td className="px-4 py-3 text-right">{money(totNormRepagos)}</td>
                    <td className="px-4 py-3 text-right text-[hsl(var(--destructive))]">{money(totNormMoraCPP)}</td>
                    <td className="px-4 py-3 text-right text-[hsl(var(--destructive))]">{money(totNormMoraDef)}</td>
                    <td className="px-4 py-3 text-right text-[hsl(var(--destructive))]">{avgNormPctMora.toFixed(2)}%</td>
                    <td className="px-4 py-3 text-right text-[hsl(var(--destructive))]">{money(totNormCrecNeto30)}</td>
                  </tr>
                </tfoot>
              </table>
            </TableShell>
          </div>
        )}
      </Panel>

      <SectionBand tone="blue">Avance de Operaciones y Montos</SectionBand>
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="En Cantidad de Colocaciones" eyebrow="Tabla de datos vs Gráfico de avance">
          <div className="grid gap-5 lg:grid-cols-[1.3fr_1.5fr] items-stretch">
            <TableShell minWidth="100%">
              <table className="w-full text-[13px] whitespace-nowrap">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">Agencia</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground">Operac.</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground">Meta</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground">Avance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {datosFiltrados.map((row: any) => (
                    <tr key={row.agency} className="hover:bg-muted/20">
                      <td className="px-3 py-2.5 font-semibold text-left">{row.agency}</td>
                      <td className="px-3 py-2.5 text-right font-mono">{row.opAchieved}</td>
                      <td className="px-3 py-2.5 text-right bg-[hsl(var(--accent)/.15)]">
                        <div className="font-bold text-[14px]">{row.opTarget}</div>
                        {row.opTarget !== row.opTargetBase && row.opTargetBase > 0 && (<div className="text-[11px] text-muted-foreground line-through" title="Meta Base Original">{row.opTargetBase}</div>)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-[hsl(var(--primary))]">{row.opTarget > 0 ? Math.round((row.opAchieved / row.opTarget) * 100) : 0}%</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border font-bold bg-muted/30">
                    <td className="px-3 py-2.5 text-left">Total</td>
                    <td className="px-3 py-2.5 text-right font-mono">{totalOpLogradas}</td>
                    <td className="px-3 py-2.5 text-right text-[14px]">{totalOpMeta}</td>
                    <td className="px-3 py-2.5 text-right text-[hsl(var(--primary))]">{pctAvanceOperaciones}%</td>
                  </tr>
                </tfoot>
              </table>
            </TableShell>
            <div className="flex flex-col h-full min-h-[350px]">
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={datosFiltrados} margin={{ top: 10, right: 0, left: -25, bottom: 45 }}>
                    <CartesianGrid vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="agency" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="opAchieved" fill="#0284c7" barSize={20} radius={[2, 2, 0, 0]} />
                    <Line type="step" dataKey="opTarget" stroke="#ea580c" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center pb-2">
                <HalfGauge value={pctAvanceOperaciones} title="CUMPLIMIENTO MENSUAL (CANT)" color="#15803d" />
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="En Monto de Colocaciones" eyebrow="Tabla de datos vs Gráfico de avance">
          <div className="grid gap-5 lg:grid-cols-[1.3fr_1.5fr] items-stretch">
            <TableShell minWidth="100%">
              <table className="w-full text-[13px] whitespace-nowrap">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">Agencia</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground">Desembolso</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground">Meta</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground">Avance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {datosFiltrados.map((row: any) => (
                    <tr key={row.agency} className="hover:bg-muted/20">
                      <td className="px-3 py-2.5 font-semibold text-left">{row.agency}</td>
                      <td className="px-3 py-2.5 text-right">{money(row.amountAchieved)}</td>
                      <td className="px-3 py-2.5 text-right bg-[hsl(var(--accent)/.15)]">
                        <div className="font-bold text-[14px]">{money(row.amountTarget)}</div>
                        {row.amountTarget !== row.amountTargetBase && row.amountTargetBase > 0 && (<div className="text-[11px] text-muted-foreground line-through" title="Meta Base Original">{money(row.amountTargetBase)}</div>)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-[hsl(var(--primary))]">{row.amountTarget > 0 ? Math.round((row.amountAchieved / row.amountTarget) * 100) : 0}%</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border font-bold bg-muted/30">
                    <td className="px-3 py-2.5 text-left">Total</td>
                    <td className="px-3 py-2.5 text-right">{money(totalMontoLogrado)}</td>
                    <td className="px-3 py-2.5 text-right text-[14px]">{money(totalMontoMeta)}</td>
                    <td className="px-3 py-2.5 text-right text-[hsl(var(--primary))]">{pctAvanceMontos}%</td>
                  </tr>
                </tfoot>
              </table>
            </TableShell>
            <div className="flex flex-col h-full min-h-[350px]">
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={datosFiltrados} margin={{ top: 10, right: 0, left: 10, bottom: 45 }}>
                    <CartesianGrid vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="agency" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" interval={0} />
                    <YAxis tickFormatter={v => `${v / 1000}k`} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => money(v)} />
                    <Bar dataKey="amountAchieved" fill="#0369a1" barSize={20} radius={[2, 2, 0, 0]} />
                    <Line type="step" dataKey="amountTarget" stroke="#ea580c" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center pb-2">
                <HalfGauge value={pctAvanceMontos} title="CUMPLIMIENTO MENSUAL (S/)" color="#15803d" />
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <SectionBand tone="coral">Calidad de Cartera y Moras</SectionBand>
      <div className="grid gap-5 xl:grid-cols-[1.15fr_1fr] items-stretch">
        <Panel title="Mora CPP - Detalle" eyebrow="Excedentes y variaciones en tabla">
          <TableShell minWidth="100%">
            <table className="w-full text-[13px] whitespace-nowrap">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Agencia</th>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Mora CPP</th>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground">% Vigente</th>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Meta</th>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Excedente (S/)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {datosFiltrados.map((row: any) => (
                  <tr key={row.agency} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-semibold text-left">{row.agency}</td>
                    <td className="px-4 py-3 text-right">{money(row.moraCPP_soles)}</td>
                    <td className={`px-4 py-3 text-right ${row.cpp > 10 ? 'text-[hsl(var(--destructive))] font-bold' : ''}`}>{Number(row.cpp).toFixed(2)}%</td>
                    <td className="px-4 py-3 text-right bg-[hsl(var(--accent)/.15)]">{row.meta}%</td>
                    <td className={`px-4 py-3 text-right font-bold ${row.excedente > 0 ? 'text-[hsl(var(--destructive))]' : 'text-green-600'}`}>
                      {row.excedente > 0 ? '+' : ''}{money(row.excedente)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border font-bold bg-muted/30">
                  <td className="px-4 py-3 text-left">Total</td>
                  <td className="px-4 py-3 text-right">{money(totMoraCPP)}</td>
                  <td className="px-4 py-3 text-right">{avgPctMora.toFixed(2)}%</td>
                  <td className="px-4 py-3 text-right">10%</td>
                  <td className={`px-4 py-3 text-right ${totExcedenteMora > 0 ? 'text-[hsl(var(--destructive))]' : 'text-green-600'}`}>
                    {totExcedenteMora > 0 ? '+' : ''}{money(totExcedenteMora)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </TableShell>
        </Panel>

        <Panel title="Curva de Cumplimiento Mora CPP" eyebrow="Ordenado por % de Mora">
          <div className="w-full h-[620px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={[...datosFiltrados].sort((a, b) => Number(a.cpp) - Number(b.cpp))} margin={{ top: 20, right: 10, left: -20, bottom: 45 }}>
                <defs>
                  <linearGradient id="colorCpp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="4 4" />
                <XAxis dataKey="agency" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" interval={0} />
                <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Line type="monotone" dataKey="meta" name="Meta 10%" stroke="#dc2626" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                <Area type="monotone" dataKey="cpp" name="% Mora CPP" stroke="#0284c7" strokeWidth={3} fillOpacity={1} fill="url(#colorCpp)" dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6, fill: '#0284c7' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </div>
  );
}