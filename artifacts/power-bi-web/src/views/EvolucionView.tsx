//EvolucionView.tsx

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { ResponsiveContainer, ComposedChart, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Bar, Line, Legend } from 'recharts';
import { LineChart, History, RefreshCw, Copy, Download, SlidersHorizontal } from 'lucide-react';
import { money } from '../utils/formatters';
import { LoadingState } from '../components/ui/LoadingState';
import { SectionBand } from '../components/ui/SectionBand';
import { Panel } from '../components/ui/Panel';

// ============================================================================
// HOOKS MAESTROS DE DRAG & DROP Y EXPORTACIÓN
// ============================================================================
function useColumnOrder(initialOrder: string[], tableId: string, lockedCol: string = 'periodo') {
  const [order, setOrder] = useState(initialOrder);
  const isModified = JSON.stringify(order) !== JSON.stringify(initialOrder);

  // 🚀 FIX FANTASMA: Si cambias de Mensual a Diario, actualiza el número de columnas
  useEffect(() => {
    setOrder(initialOrder);
  }, [JSON.stringify(initialOrder)]);

  const handleDragStart = (e: React.DragEvent, id: string) => { if (id === lockedCol) { e.preventDefault(); return; } e.dataTransfer.setData(`col_id_${tableId}`, id); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
  const handleDrop = (e: React.DragEvent, targetId: string) => { e.preventDefault(); const sourceId = e.dataTransfer.getData(`col_id_${tableId}`); if (!sourceId || sourceId === targetId || sourceId === lockedCol || targetId === lockedCol) return; const newOrder = [...order]; newOrder.splice(order.indexOf(targetId), 0, newOrder.splice(order.indexOf(sourceId), 1)[0]); setOrder(newOrder); };
  
  return { order, handleDragStart, handleDragOver, handleDrop, resetOrder: () => setOrder(initialOrder), isModified, lockedCol };
}

const ExportActions = ({ control, onExport }: { control: any, onExport: (format: 'excel' | 'clipboard') => void }) => (
  <div className="flex items-center gap-2">
    {control.isModified && <button onClick={control.resetOrder} className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-[11px] font-semibold text-muted-foreground shadow-sm transition hover:text-foreground"><RefreshCw size={13} /> Restablecer</button>}
    <button onClick={() => onExport('clipboard')} className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-[11px] font-semibold text-muted-foreground shadow-sm transition hover:text-primary hover:border-primary/50"><Copy size={13} /> Copiar</button>
    <button onClick={() => onExport('excel')} className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-emerald-700"><Download size={13} /> Excel</button>
  </div>
);

// ============================================================================
// VISTA PRINCIPAL
// ============================================================================
export function EvolucionView({ dbFilters }: { dbFilters: any }) {
  // ==========================================
  // ZONA 0: VARIABLES PREVIAS (Para iniciar estados)
  // ==========================================
  const periodosDisponibles = dbFilters?.periodos || [];
  const defaultEndMonth = periodosDisponibles[0] || '202608';
  const defaultStartMonth = periodosDisponibles.length > 11 ? periodosDisponibles[11] : (periodosDisponibles[periodosDisponibles.length - 1] || '202508');
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // ==========================================
  // ZONA 1: TODOS LOS HOOKS (Incondicionales)
  // ==========================================
  const [granularity, setGranularity] = useState<'Mensual' | 'Diario'>('Mensual');
  const [agency, setAgency] = useState('Todas');
  const [advisor, setAdvisor] = useState('Todos');
  const [dateRange, setDateRange] = useState({ start: defaultStartMonth, end: defaultEndMonth });

  const asesoresHistoricos = useMemo(() => {
    if (!dbFilters?.asesores) return [];
    let arr = dbFilters.asesores;
    if (agency !== 'Todas') {
      const agencyCodeMap: Record<string, string> = { 'Wanchaq': '01', 'San Jerónimo': '02', 'Quillabamba': '03', 'Sicuani': '04', 'Molino': '05', 'Juliaca': '06', 'Lima Los Olivos': '07', 'Tica Tica': '08', 'Magisterio': '09', 'Lima SJL': '10', 'Chiclayo': '11', 'Arequipa': '12', 'Pucallpa': '13' };
      arr = arr.filter((a: any) => String(a.IdSAgencia).trim() === agencyCodeMap[agency]);
    }
    const unique = new Map<string, string>();
    arr.forEach((a: any) => {
      const short = String(a.Asesor || '').trim();
      if (short) unique.set(String(a.AsesorNombresApellidos || short).trim(), short);
    });
    return Array.from(unique.entries()).map(([valorFiltro, textoVista]) => ({ valorFiltro, textoVista })).sort((a, b) => a.textoVista.localeCompare(b.textoVista));
  }, [dbFilters, agency]);

  const { data: evolucionBD, isLoading, error } = useQuery({
    queryKey: ['evolucion', granularity, agency, advisor, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({ agencia: agency !== 'Todas' ? agency : '', asesor: advisor !== 'Todos' ? advisor : '', granularidad: granularity, desde: dateRange.start, hasta: dateRange.end });
      const res = await fetch(`http://localhost:3000/api/evolucion?${params}`);
      if (!res.ok) throw new Error('Error al cargar historial');
      return res.json();
    },
    enabled: !!dateRange.start && !!dateRange.end
  });

  const isMensual = granularity === 'Mensual';
  const isAsesor = advisor !== 'Todos';

  const baseColumns = ['periodo', 'etiquetaMes', 'colocacionNumReal', 'colocacionNumMeta', 'colocacionMonto', 'colocacionMeta', 'repagos', 'crecimientoBruto'];
  const allColumns = isMensual ? [...baseColumns, 'carteraTotal', 'mora31Total', 'pctMora31'] : baseColumns;
  const cTable = useColumnOrder(allColumns, 'historial', 'periodo');

  // ==========================================
  // ZONA 2: LÓGICA Y FUNCIONES
  // ==========================================
  const handleGranularityChange = (val: 'Mensual' | 'Diario') => {
    setGranularity(val);
    if (val === 'Diario') setDateRange({ start: thirtyDaysAgo, end: today });
    else setDateRange({ start: defaultStartMonth, end: defaultEndMonth });
  };

  const defCols = [
    { id: 'periodo', header: isMensual ? 'Periodo' : 'Fecha', align: 'left', cell: (r:any) => <span className="font-bold">{r.periodo}</span>, raw: (r:any) => r.periodo },
    { id: 'etiquetaMes', header: 'Etiqueta', align: 'left', cell: (r:any) => <span className="font-medium text-muted-foreground">{r.etiqueta}</span>, raw: (r:any) => r.etiqueta },
    { id: 'colocacionNumReal', header: 'Nro Oper.', align: 'right', cell: (r:any) => <span className="font-mono text-blue-600 font-semibold">{r.colocacionNumReal}</span>, raw: (r:any) => r.colocacionNumReal },
    { id: 'colocacionNumMeta', header: 'Meta Oper.', align: 'right', cell: (r:any) => <span className="font-mono text-muted-foreground">{r.colocacionNumMeta}</span>, raw: (r:any) => r.colocacionNumMeta },
    { id: 'colocacionMonto', header: 'Desembolsos S/', align: 'right', cell: (r:any) => <span className="font-mono text-emerald-600 font-semibold">{money(r.colocacionMonto)}</span>, raw: (r:any) => r.colocacionMonto },
    { id: 'colocacionMeta', header: 'Meta S/', align: 'right', cell: (r:any) => <span className="font-mono text-muted-foreground">{money(r.colocacionMeta)}</span>, raw: (r:any) => r.colocacionMeta },
    { id: 'repagos', header: 'Repagos S/', align: 'right', cell: (r:any) => <span className="font-mono text-rose-600">{money(r.repagos)}</span>, raw: (r:any) => r.repagos },
    { id: 'crecimientoBruto', header: 'Crec. Bruto', align: 'right', cell: (r:any) => <span className={`font-mono font-bold ${r.crecimientoBruto >= 0 ? 'text-amber-600' : 'text-rose-600'}`}>{money(r.crecimientoBruto)}</span>, raw: (r:any) => r.crecimientoBruto },
    { id: 'carteraTotal', header: 'Cartera Total', align: 'right', cell: (r:any) => <span className="font-mono">{money(r.carteraTotal)}</span>, raw: (r:any) => r.carteraTotal },
    { id: 'mora31Total', header: 'Mora > 30 Días', align: 'right', cell: (r:any) => <span className="font-mono text-rose-600">{money(r.mora31Total)}</span>, raw: (r:any) => r.mora31Total },
    { id: 'pctMora31', header: '% Mora > 30', align: 'right', cell: (r:any) => <span className="font-mono font-bold">{Number(r.pctMora31).toFixed(2)}%</span>, raw: (r:any) => r.pctMora31 / 100 }
  ];

  const colRender = cTable.order.map(id => defCols.find(c => c.id === id)!);
  const chartData = evolucionBD || []; 

  const exportar = (formato: 'excel' | 'clipboard') => {
    if (chartData.length === 0) return;
    const headers = colRender.map(c => c.header);
    const rows = chartData.map((r:any) => colRender.map(col => col.raw(r)));
    if (formato === 'clipboard') {
      const contenido = [headers.join('\t'), ...rows.map(row => row.map(val => (typeof val === 'number' && val % 1 !== 0) ? val.toFixed(4) : val).join('\t'))].join('\n');
      navigator.clipboard.writeText(contenido).then(() => alert('✅ Datos copiados al portapapeles.'));
    } else {
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Historial");
      XLSX.writeFile(workbook, `Evolucion_${granularity}_${agency}_${new Date().getTime()}.xlsx`);
    }
  };

  // ==========================================
  // ZONA 3: RETORNOS ANTICIPADOS (Carga y Error)
  // ==========================================
  if (!dbFilters || isLoading) return <LoadingState />;
  if (error) return <div className="p-5 text-destructive font-semibold border border-destructive/20 bg-destructive/10 rounded-xl">Error al cargar datos históricos. Verifica la conexión al DWH.</div>;

  // ==========================================
  // ZONA 4: RENDERIZADO PRINCIPAL
  // ==========================================
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
          <SlidersHorizontal size={16} className="text-[hsl(var(--primary))]" />
          <h3 className="text-sm font-bold text-foreground">Laboratorio de Análisis Histórico</h3>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground">Granularidad</label>
            <select value={granularity} onChange={e => handleGranularityChange(e.target.value as any)} className="rounded-lg border-0 bg-muted/50 px-3 py-2 text-xs font-semibold focus:ring-1 focus:ring-[hsl(var(--primary))]">
              <option value="Mensual">Mensual (Mes a Mes)</option>
              <option value="Diario">Diario (Día a Día)</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground">Desde</label>
            {isMensual ? (
              <select value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} className="rounded-lg border-0 bg-muted/50 px-3 py-2 text-xs font-semibold">
                {periodosDisponibles.map((p: string) => <option key={p} value={p}>{p}</option>)}
              </select>
            ) : (
              <input type="date" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} className="rounded-lg border-0 bg-muted/50 px-3 py-2 text-xs font-semibold uppercase" />
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground">Hasta</label>
            {isMensual ? (
              <select value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} className="rounded-lg border-0 bg-muted/50 px-3 py-2 text-xs font-semibold">
                {periodosDisponibles.map((p: string) => <option key={p} value={p}>{p}</option>)}
              </select>
            ) : (
              <input type="date" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} className="rounded-lg border-0 bg-muted/50 px-3 py-2 text-xs font-semibold uppercase" />
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground">Agencia</label>
            <select value={agency} onChange={e => { setAgency(e.target.value); setAdvisor('Todos'); }} className="rounded-lg border-0 bg-muted/50 px-3 py-2 text-xs font-semibold">
              <option value="Todas">Todas la Red</option>
              {['Wanchaq', 'San Jerónimo', 'Quillabamba', 'Sicuani', 'Molino', 'Juliaca', 'Lima Los Olivos', 'Tica Tica', 'Magisterio', 'Lima SJL', 'Chiclayo', 'Arequipa', 'Pucallpa'].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground">Asesor</label>
            <select value={advisor} onChange={e => setAdvisor(e.target.value)} className="rounded-lg border-0 bg-muted/50 px-3 py-2 text-xs font-semibold">
              <option value="Todos">Todos</option>
              {asesoresHistoricos.map((a: any, i: number) => <option key={i} value={a.valorFiltro}>{a.textoVista}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className={`grid gap-5 ${isMensual ? 'xl:grid-cols-2' : 'xl:grid-cols-1'}`}>
        
        {/* 🚀 GRÁFICO 1 INTELIGENTE: Cambia su diseño si es Agencia o si es Asesor */}
        <Panel title={`Evolución de Colocaciones (${granularity})`} icon={LineChart} eyebrow={isAsesor ? "Monto Desembolsado vs Cantidad de Operaciones" : "Monto Desembolsado vs Meta Asignada"}>
          <div className="h-[380px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorColocacion" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="etiqueta" tick={{ fontSize: 10 }} />
                
                {/* Eje Izquierdo: Siempre Monto S/ */}
                <YAxis yAxisId="left" tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 10 }} />
                
                {/* Eje Derecho: Solo se activa si es Asesor (Nro Operaciones) */}
                {isAsesor && <YAxis yAxisId="right" orientation="right" allowDecimals={false} tick={{ fontSize: 10, fill: '#2563eb' }} />}
                
                <RechartsTooltip formatter={(val: any, name: string) => name.includes('Operaciones') ? val : money(val)} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                
                {/* Monto siempre se muestra como área verde en el Eje Izquierdo */}
                <Area yAxisId="left" type="monotone" dataKey="colocacionMonto" name="Desembolsos S/" stroke="#059669" strokeWidth={3} fillOpacity={1} fill="url(#colorColocacion)" />
                
                {/* Lógica Condicional: SIN FRAGMENTOS (<>) PARA QUE RECHARTS LOS DETECTE */}
                {!isAsesor && (
                  <Line yAxisId="left" type="step" dataKey="colocacionMeta" name="Meta Asignada S/" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                )}

                {isAsesor && (
                  <Bar yAxisId="right" dataKey="colocacionNumReal" name="Operaciones Real" fill="#3b82f6" radius={[3, 3, 0, 0]} barSize={isMensual ? 24 : 12} />
                )}

                {isAsesor && (
                  <Line yAxisId="right" type="step" dataKey="colocacionNumMeta" name="Meta Operaciones" stroke="#d97706" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {isMensual && (
          <Panel title="Crecimiento de Cartera y Riesgo" icon={History} eyebrow="Saldo de Cartera vs % Mora Mayor a 30 Días">
            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
                  <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis dataKey="etiqueta" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="left" tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} />
                  <RechartsTooltip formatter={(val: any, name: string) => name === '% Mora > 30' ? `${Number(val).toFixed(2)}%` : money(val)} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar yAxisId="left" dataKey="carteraTotal" name="Cartera Total" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={30} />
                  <Line yAxisId="right" type="monotone" dataKey="pctMora31" name="% Mora > 30" stroke="#e11d48" strokeWidth={3} dot={{ r: 4, fill: '#e11d48' }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        )}
      </div>

      <Panel title={`Registro Histórico ${granularity}`} icon={History} eyebrow={`Datos crudos desde ${dateRange.start} hasta ${dateRange.end}`} action={<ExportActions control={cTable} onExport={exportar} />}>
        <div className="overflow-x-auto pb-4 max-h-[500px]">
          <table className="w-full text-left text-[11px] whitespace-nowrap">
            <thead>
              <tr className="border-b border-border text-muted-foreground sticky top-0 bg-card z-10 shadow-sm">
                {colRender.map(col => (
                  <th key={col.id} draggable={col.id !== cTable.lockedCol} onDragStart={(e) => cTable.handleDragStart(e, col.id)} onDragOver={cTable.handleDragOver} onDrop={(e) => cTable.handleDrop(e, col.id)} 
                      className={`px-4 py-3 font-semibold transition-colors ${col.id !== cTable.lockedCol ? 'cursor-grab active:cursor-grabbing hover:bg-muted/50 hover:text-foreground rounded-t-md' : ''} ${col.align === 'left' ? 'text-left' : 'text-right'}`}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {chartData.length > 0 ? chartData.map((row: any, i: number) => (
                <tr key={i} className="hover:bg-muted/30 transition-colors">
                  {colRender.map(col => (
                    <td key={`${i}-${col.id}`} className={`px-4 py-3 ${col.align === 'left' ? 'text-left' : 'text-right'}`}>{col.cell(row)}</td>
                  ))}
                </tr>
              )) : (
                <tr><td colSpan={colRender.length} className="py-8 text-center text-muted-foreground italic">No hay datos históricos disponibles para este rango.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}