import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, Line, Legend, Area, Cell } from 'recharts';
import { TrendingUp, Target, Building2, AlertTriangle, RefreshCw } from 'lucide-react';

import { Filters, View } from '../utils/constants';
import { money } from '../utils/formatters';
import { LoadingState } from '../components/ui/LoadingState';
import { SectionBand } from '../components/ui/SectionBand';
import { Panel } from '../components/ui/Panel';
import { TableShell } from '../components/ui/TableShell';
import { KpiCard } from '../components/ui/KpiCard';
import { WorkdayStrip } from '../components/WorkdayStrip';

// 1. MICRO-COMPONENTE: Velocímetro de 180 grados
function HalfGauge({ value, title, color = '#16a34a' }: { value: number; title: string; color?: string }) {
  const radius = 70;
  const stroke = 22;
  const normalizedValue = Math.min(Math.max(value, 0), 100);
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (normalizedValue / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className="relative flex items-end justify-center overflow-hidden" style={{ width: '180px', height: '90px' }}>
        <svg width="180" height="180" className="absolute top-0">
          <path d="M 20 90 A 70 70 0 0 1 160 90" fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} strokeLinecap="round" />
          <path 
            d="M 20 90 A 70 70 0 0 1 160 90" 
            fill="none" 
            stroke={color} 
            strokeWidth={stroke} 
            strokeLinecap="round" 
            strokeDasharray={circumference} 
            strokeDashoffset={strokeDashoffset} 
            className="transition-all duration-1000 ease-out" 
          />
        </svg>
        <div className="absolute bottom-1 text-center text-3xl font-bold tracking-tight">{value}%</div>
        <div className="absolute bottom-0 left-2 text-[10px] text-muted-foreground">0%</div>
        <div className="absolute bottom-0 right-2 text-[10px] text-muted-foreground">100%</div>
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
  if (error) return <div className="p-5 text-destructive font-semibold border border-destructive/20 bg-destructive/10 rounded-xl">Error de conexión al DWH.</div>;

  // DATA COMPLETA (Para gráficos con contexto global)
  const todasComercial = indicadoresBD.comercial || [];
  const todasNormalizacion = indicadoresBD.normalizacion || [];

  // DATA FILTRADA (Para la tabla si el usuario selecciona una agencia específica)
  const datosFiltrados = todasComercial.filter((row: any) => filters.agency === 'Todas' ? true : row.agency === filters.agency);
  const datosNormalizacion = todasNormalizacion.filter((row: any) => filters.agency === 'Todas' ? true : row.agency === filters.agency);

  // Cálculos Comerciales (basados en la selección activa)
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

  // Helper para resaltar barras de Recharts
  const getBarColor = (entryAgency: string, activeColor: string) => {
    if (filters.agency === 'Todas') return activeColor;
    return entryAgency === filters.agency ? '#f59e0b' : '#cbd5e1'; // Ámbar para la seleccionada, gris claro para las demás
  };

  const defColumnasComercial = [
    { id: 'agency', header: 'Agencia', align: 'left', cell: (row: any) => <span className="font-semibold text-xs">{row.agency}</span>, footer: () => 'Total Comercial' },
    { id: 'cartera', header: 'Cartera', align: 'right', cell: (row: any) => money(row.cartera), footer: () => money(totCartera) },
    { id: 'crecimiento', header: 'Crecimiento', align: 'right', 
      cell: (row: any) => <span className={`font-semibold ${row.crecimientoBruto >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{row.crecimientoBruto >= 0 ? '+' : ''}{money(row.crecimientoBruto)}</span>, 
      footer: () => <span className={totCrecimientoBruto >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{totCrecimientoBruto >= 0 ? '+' : ''}{money(totCrecimientoBruto)}</span> 
    },
    { id: 'nroOper', header: 'Nro Oper', align: 'center', cell: (row: any) => <span className="font-mono bg-muted px-2 py-0.5 rounded text-xs">{row.opAchieved}</span>, footer: () => totalOpLogradas },
    { id: 'desembolsos', header: 'Desembolsos', align: 'right', cell: (row: any) => money(row.amountAchieved), footer: () => money(totalMontoLogrado) },
    { id: 'repagos', header: 'Repagos', align: 'right', cell: (row: any) => money(row.repagos), footer: () => money(totRepagos) },
    { id: 'duracion', header: 'Duración', align: 'center', cell: (row: any) => <span className="font-mono text-xs">{Number(row.duration).toFixed(2)}</span>, footer: () => <span className="font-mono text-xs">{avgDuracion.toFixed(2)}</span> },
    { id: 'moraCPP', header: 'Mora CPP', align: 'right', cell: (row: any) => <span className={row.cpp > 10 ? 'text-rose-600 font-semibold' : ''}>{money(row.moraCPP_soles)}</span>, footer: () => money(totMoraCPP) },
    { id: 'pctMora', header: '% Mora', align: 'right', cell: (row: any) => <span className={`px-2 py-0.5 rounded text-xs ${row.cpp > 10 ? 'bg-rose-500/10 text-rose-600 font-bold' : 'font-semibold text-rose-600'}`}>{Number(row.cpp).toFixed(2)}%</span>, footer: () => `${avgPctMora.toFixed(2)}%` },
    { id: 'moraDef', header: 'Mora Defic.', align: 'right', cell: (row: any) => money(row.moraDeficiente_soles), footer: () => money(totMoraDeficiente) },
    { id: 'crecNeto150', header: 'Crec. Neto 150', align: 'right', 
      cell: (row: any) => <span className={`font-bold ${row.crecimientoNeto150 >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{row.crecimientoNeto150 >= 0 ? '+' : ''}{money(row.crecimientoNeto150)}</span>, 
      footer: () => <span className={totCrecimientoNeto150 >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{totCrecimientoNeto150 >= 0 ? '+' : ''}{money(totCrecimientoNeto150)}</span> 
    }
  ];

  const columnasRender = order.map(id => defColumnasComercial.find(c => c.id === id)!);

  return (
    <div className="space-y-6 animate-in fade-in duration-500" key={filters.period}>
      <WorkdayStrip periodo={filters.period} />
      
      {/* TARJETAS PRINCIPALES */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Colocación acumulada" value={money(totalMontoLogrado)} note="Logrado a la fecha" icon={TrendingUp} delta={`+${pctAvanceMontos}%`} />
        <KpiCard label="Meta mensual" value={money(totalMontoMeta)} note="Monto objetivo" icon={Target} tone="gold" />
        <KpiCard label="Crecimiento Neto 150" value={money(totCrecimientoNeto150)} note="Variación real del mes" icon={Building2} tone="blue" />
        <KpiCard label="Excedente Mora CPP" value={money(totExcedenteMora)} note="Sobre la meta del 10%" icon={AlertTriangle} tone={totExcedenteMora > 0 ? "red" : "teal"} delta={totExcedenteMora > 0 ? "Excede" : "OK"} />
      </div>

      {/* SECCIÓN 1: MATRIZ GENERAL */}
      <SectionBand tone="green">Indicadores de Crecimiento Global</SectionBand>
      <Panel 
        title="Matriz General de Resultados" 
        eyebrow="Flujo, Duración y Riesgo consolidado"
        action={isModified && (
          <button onClick={resetOrder} className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm transition hover:text-foreground">
            <RefreshCw size={13} /> Restablecer columnas
          </button>
        )}
      >
        <div className="mb-4 flex w-full max-w-xs rounded-lg bg-muted/60 p-1 font-semibold">
          <button onClick={() => setTipoCartera('comercial')} className={`flex-1 rounded-md py-1.5 text-xs transition-all ${tipoCartera === 'comercial' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Comercial</button>
          <button onClick={() => setTipoCartera('normalizacion')} className={`flex-1 rounded-md py-1.5 text-xs transition-all ${tipoCartera === 'normalizacion' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Normalización</button>
        </div>

        {tipoCartera === 'comercial' ? (
          <div key="vista-comercial" className="overflow-x-auto pb-2">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  {columnasRender.map((col) => (
                    <th key={col.id} draggable onDragStart={(e) => handleDragStart(e, col.id)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, col.id)} className={`px-3 pb-2.5 font-semibold cursor-grab active:cursor-grabbing hover:text-foreground ${col.align === 'left' ? 'text-left' : col.align === 'center' ? 'text-center' : 'text-right'}`}>
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {datosFiltrados.map((row: any) => (
                  <tr key={row.agency} className="hover:bg-muted/30 transition-colors">
                    {columnasRender.map((col) => (
                      <td key={`${row.agency}-${col.id}`} className={`px-3 py-2.5 ${col.align === 'left' ? 'text-left' : col.align === 'center' ? 'text-center' : 'text-right font-mono'}`}>{col.cell(row)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border font-bold bg-muted/20">
                  {columnasRender.map((col) => (
                    <td key={`footer-${col.id}`} className={`px-3 py-2.5 ${col.align === 'left' ? 'text-left' : col.align === 'center' ? 'text-center' : 'text-right font-mono'}`}>{col.footer()}</td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div key="vista-normalizacion" className="overflow-x-auto pb-2">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="px-3 pb-2.5 font-semibold text-left">Agencia</th>
                  <th className="px-3 pb-2.5 font-semibold text-left">Recuperador</th>
                  <th className="px-3 pb-2.5 font-semibold text-right">Cartera</th>
                  <th className="px-3 pb-2.5 font-semibold text-right">Repagos</th>
                  <th className="px-3 pb-2.5 font-semibold text-right">Mora CPP</th>
                  <th className="px-3 pb-2.5 font-semibold text-right">Mora Deficiente</th>
                  <th className="px-3 pb-2.5 font-semibold text-right">% Mora 9</th>
                  <th className="px-3 pb-2.5 font-semibold text-right">Crec. Neto 30</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {datosNormalizacion.map((row: any) => (
                  <tr key={`${row.agency}-${row.recuperador}`} className="hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2.5 font-semibold text-left">{row.agency}</td>
                    <td className="px-3 py-2.5 text-left text-muted-foreground">{row.recuperador}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{money(row.cartera)}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{money(row.repagos)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-rose-600">{money(row.moraCPP_soles)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-rose-600">{money(row.moraDeficiente_soles)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-rose-600 font-bold">{Number(row.pctMora9).toFixed(2)}%</td>
                    <td className="px-3 py-2.5 text-right font-mono text-rose-600 font-bold">{money(row.crecNeto30)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border font-bold bg-muted/20">
                  <td className="px-3 py-2.5 text-left" colSpan={2}>Total Normalización</td>
                  <td className="px-3 py-2.5 text-right font-mono">{money(totNormCartera)}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{money(totNormRepagos)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-rose-600">{money(totNormMoraCPP)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-rose-600">{money(totNormMoraDef)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-rose-600">{avgNormPctMora.toFixed(2)}%</td>
                  <td className="px-3 py-2.5 text-right font-mono text-rose-600">{money(totNormCrecNeto30)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Panel>

      {/* SECCIÓN 2: AVANCE DE OPERACIONES Y MONTOS */}
      <SectionBand tone="blue">Avance de Operaciones y Montos</SectionBand>
      <div className="grid gap-5 xl:grid-cols-2">
        
        {/* GRÁFICO 1: OPERACIONES */}
        <Panel title="En Cantidad de Colocaciones" eyebrow="Resaltando agencia seleccionada">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_1.5fr] items-stretch">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="px-2 pb-2 font-semibold">Agencia</th>
                    <th className="px-2 pb-2 font-semibold text-right">Oper.</th>
                    <th className="px-2 pb-2 font-semibold text-right">Meta</th>
                    <th className="px-2 pb-2 font-semibold text-right">Avance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {datosFiltrados.map((row: any) => (
                    <tr key={row.agency} className="hover:bg-muted/30">
                      <td className="px-2 py-2 font-medium">{row.agency}</td>
                      <td className="px-2 py-2 text-right font-mono">{row.opAchieved}</td>
                      <td className="px-2 py-2 text-right font-mono text-muted-foreground">{row.opTarget}</td>
                      <td className="px-2 py-2 text-right font-mono font-bold text-emerald-600">
                        {row.opTarget > 0 ? Math.round((row.opAchieved / row.opTarget) * 100) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border font-bold bg-muted/20">
                    <td className="px-2 py-2">Total</td>
                    <td className="px-2 py-2 text-right font-mono">{totalOpLogradas}</td>
                    <td className="px-2 py-2 text-right font-mono">{totalOpMeta}</td>
                    <td className="px-2 py-2 text-right font-mono text-emerald-600">{pctAvanceOperaciones}%</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* GRÁFICO CON TODAS LAS AGENCIAS (Highlighting) */}
            <div className="flex flex-col h-full min-h-[300px]">
              <div className="flex-1 w-full min-h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={todasComercial} margin={{ top: 10, right: 0, left: -25, bottom: 45 }}>
                    <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                    <XAxis dataKey="agency" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 9 }} />
                    <Tooltip />
                    <Bar dataKey="opAchieved" radius={[2, 2, 0, 0]}>
                      {todasComercial.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={getBarColor(entry.agency, '#0284c7')} />
                      ))}
                    </Bar>
                    <Line type="step" dataKey="opTarget" stroke="#ea580c" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center pt-2">
                <HalfGauge value={pctAvanceOperaciones} title="CUMPLIMIENTO (CANT)" color="#16a34a" />
              </div>
            </div>
          </div>
        </Panel>

        {/* GRÁFICO 2: MONTOS */}
        <Panel title="En Monto de Colocaciones" eyebrow="Resaltando agencia seleccionada">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_1.5fr] items-stretch">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="px-2 pb-2 font-semibold">Agencia</th>
                    <th className="px-2 pb-2 font-semibold text-right">Desembolso</th>
                    <th className="px-2 pb-2 font-semibold text-right">Meta</th>
                    <th className="px-2 pb-2 font-semibold text-right">Avance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {datosFiltrados.map((row: any) => (
                    <tr key={row.agency} className="hover:bg-muted/30">
                      <td className="px-2 py-2 font-medium">{row.agency}</td>
                      <td className="px-2 py-2 text-right font-mono">{money(row.amountAchieved)}</td>
                      <td className="px-2 py-2 text-right font-mono text-muted-foreground">{money(row.amountTarget)}</td>
                      <td className="px-2 py-2 text-right font-mono font-bold text-emerald-600">
                        {row.amountTarget > 0 ? Math.round((row.amountAchieved / row.amountTarget) * 100) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border font-bold bg-muted/20">
                    <td className="px-2 py-2">Total</td>
                    <td className="px-2 py-2 text-right font-mono">{money(totalMontoLogrado)}</td>
                    <td className="px-2 py-2 text-right font-mono">{money(totalMontoMeta)}</td>
                    <td className="px-2 py-2 text-right font-mono text-emerald-600">{pctAvanceMontos}%</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* GRÁFICO CON TODAS LAS AGENCIAS (Highlighting) */}
            <div className="flex flex-col h-full min-h-[300px]">
              <div className="flex-1 w-full min-h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={todasComercial} margin={{ top: 10, right: 0, left: 10, bottom: 45 }}>
                    <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                    <XAxis dataKey="agency" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" interval={0} />
                    <YAxis tickFormatter={v => `${v / 1000}k`} tick={{ fontSize: 9 }} />
                    <Tooltip formatter={(v: number) => money(v)} />
                    <Bar dataKey="amountAchieved" radius={[2, 2, 0, 0]}>
                      {todasComercial.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={getBarColor(entry.agency, '#0369a1')} />
                      ))}
                    </Bar>
                    <Line type="step" dataKey="amountTarget" stroke="#ea580c" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center pt-2">
                <HalfGauge value={pctAvanceMontos} title="CUMPLIMIENTO (S/)" color="#16a34a" />
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {/* SECCIÓN 3: CALIDAD DE CARTERA Y MORAS */}
      <SectionBand tone="coral">Calidad de Cartera y Moras</SectionBand>
      <div className="grid gap-5 xl:grid-cols-[1.1fr_1.3fr] items-stretch">
        <Panel title="Mora CPP - Detalle" eyebrow="Excedentes y variaciones en tabla">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="px-3 pb-2 font-semibold">Agencia</th>
                  <th className="px-3 pb-2 font-semibold text-right">Mora CPP</th>
                  <th className="px-3 pb-2 font-semibold text-right">% Vigente</th>
                  <th className="px-3 pb-2 font-semibold text-right">Meta</th>
                  <th className="px-3 pb-2 font-semibold text-right">Excedente (S/)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {datosFiltrados.map((row: any) => (
                  <tr key={row.agency} className="hover:bg-muted/30">
                    <td className="px-3 py-2.5 font-medium">{row.agency}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{money(row.moraCPP_soles)}</td>
                    <td className={`px-3 py-2.5 text-right font-mono ${row.cpp > 10 ? 'text-rose-600 font-bold' : ''}`}>{Number(row.cpp).toFixed(2)}%</td>
                    <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{row.meta}%</td>
                    <td className={`px-3 py-2.5 text-right font-mono font-bold ${row.excedente > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {row.excedente > 0 ? '+' : ''}{money(row.excedente)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border font-bold bg-muted/20">
                  <td className="px-3 py-2.5">Total</td>
                  <td className="px-3 py-2.5 text-right font-mono">{money(totMoraCPP)}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{avgPctMora.toFixed(2)}%</td>
                  <td className="px-3 py-2.5 text-right font-mono">10%</td>
                  <td className={`px-3 py-2.5 text-right font-mono ${totExcedenteMora > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {totExcedenteMora > 0 ? '+' : ''}{money(totExcedenteMora)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Panel>

        {/* CURVA DE MORA COMPLETA CON RESALTADO */}
        <Panel title="Curva de Cumplimiento Mora CPP" eyebrow="Ordenado por % de Mora">
          <div className="w-full h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart 
                data={[...todasComercial].sort((a, b) => Number(a.cpp) - Number(b.cpp))} 
                margin={{ top: 20, right: 15, left: -15, bottom: 45 }}
              >
                <defs>
                  <linearGradient id="colorCpp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="agency" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" interval={0} />
                <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 9 }} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Line type="monotone" dataKey="meta" name="Meta 10%" stroke="#dc2626" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                <Area 
                  type="monotone" 
                  dataKey="cpp" 
                  name="% Mora CPP" 
                  stroke="#0284c7" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#colorCpp)" 
                  dot={(props: any) => {
                    const isSelected = props.payload.agency === filters.agency;
                    return (
                      <circle 
                        key={props.key}
                        cx={props.cx} 
                        cy={props.cy} 
                        r={isSelected ? 7 : 3.5} 
                        fill={isSelected ? '#f59e0b' : '#fff'} 
                        stroke={isSelected ? '#d97706' : '#0284c7'} 
                        strokeWidth={isSelected ? 3 : 2} 
                      />
                    );
                  }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </div>
  );
}