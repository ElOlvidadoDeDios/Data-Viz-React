//ProductividadDiaria.tsx

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, Cell, LabelList } from 'recharts';
import * as XLSX from 'xlsx';
import { Filters } from '../utils/constants';
import { money, number } from '../utils/formatters';
import { LoadingState } from '../components/ui/LoadingState';
import { SectionBand } from '../components/ui/SectionBand';
import { Panel } from '../components/ui/Panel';
import { WorkdayStrip } from '../components/WorkdayStrip';
import { ShieldAlert, TrendingUp, Users, RefreshCw, Copy, Download } from 'lucide-react';

// ============================================================================
// HOOKS Y COMPONENTES MAESTROS DE EXPORTACIÓN Y ARRASTRE
// ============================================================================
function useColumnOrder(initialOrder: string[], tableId: string, lockedCol: string = 'agency') {
  const [order, setOrder] = useState(initialOrder);
  const isModified = JSON.stringify(order) !== JSON.stringify(initialOrder);

  useEffect(() => {
    setOrder(initialOrder);
  }, [JSON.stringify(initialOrder)]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (id === lockedCol) { e.preventDefault(); return; }
    e.dataTransfer.setData(`col_id_${tableId}`, id);
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
  
  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData(`col_id_${tableId}`);
    if (!sourceId || sourceId === targetId || sourceId === lockedCol || targetId === lockedCol) return;
    
    const sourceIndex = order.indexOf(sourceId);
    const targetIndex = order.indexOf(targetId);
    const newOrder = [...order];
    const [removed] = newOrder.splice(sourceIndex, 1);
    newOrder.splice(targetIndex, 0, removed);
    setOrder(newOrder);
  };
  
  return { order, handleDragStart, handleDragOver, handleDrop, resetOrder: () => setOrder(initialOrder), isModified, lockedCol };
}

const ExportActions = ({ control, onExport }: { control: any, onExport: (format: 'excel' | 'clipboard') => void }) => (
  <div className="flex items-center gap-2">
    {control.isModified && (
      <button onClick={control.resetOrder} className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-[11px] font-semibold text-muted-foreground shadow-sm transition hover:text-foreground">
        <RefreshCw size={13} /> Restablecer
      </button>
    )}
    <button onClick={() => onExport('clipboard')} className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-[11px] font-semibold text-muted-foreground shadow-sm transition hover:text-primary hover:border-primary/50">
      <Copy size={13} /> Copiar
    </button>
    <button onClick={() => onExport('excel')} className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-emerald-700">
      <Download size={13} /> Excel
    </button>
  </div>
);

// ============================================================================
// 1. VISTA PREVENTIVA (Gestión Preventiva)
// ============================================================================
const COL_PREV = ['agencia', 'socio', 'telefono', 'producto', 'analista', 'fecha_vencimiento', 'dias_para_vencimiento', 'saldo'];

export function PreventivaView({ filters }: { filters: Filters }) {
  const { data: creditos, isLoading, error } = useQuery({
    queryKey: ['gestion-preventiva'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3000/api/gestion-preventiva');
      if (!res.ok) throw new Error('Error de red');
      return res.json();
    }
  });

  const cPrev = useColumnOrder(COL_PREV, 'prev', 'agencia');

  const safeCreditos = creditos || [];
  const datosFiltrados = filters.agency === 'Todas' 
    ? safeCreditos 
    : safeCreditos.filter((c: any) => c.agencia === filters.agency);

  const totalSaldo = datosFiltrados.reduce((acc: number, curr: any) => acc + Number(curr.saldo_formateado?.replace(/,/g, '') || 0), 0);

  if (isLoading) return <LoadingState />;
  if (error) return <div className="p-4 text-destructive font-semibold">Error al cargar datos del DWH.</div>;

  const defPrev = [
    { id: 'agencia', header: 'Agencia', align: 'left', cell: (r:any) => <span className="font-medium">{r.agencia}</span>, raw: (r:any) => r.agencia, footer: () => 'Total General' },
    { id: 'socio', header: 'Socio', align: 'left', cell: (r:any) => <span className="truncate max-w-[200px]" title={r.socio}>{r.socio}</span>, raw: (r:any) => r.socio, footer: () => '' },
    { id: 'telefono', header: 'Teléfono', align: 'left', cell: (r:any) => <span className="font-mono text-xs">{r.telefono}</span>, raw: (r:any) => r.telefono, footer: () => '' },
    { id: 'producto', header: 'Producto', align: 'left', cell: (r:any) => <span className="text-xs text-muted-foreground">{r.producto}</span>, raw: (r:any) => r.producto, footer: () => '' },
    { id: 'analista', header: 'Analista', align: 'left', cell: (r:any) => r.analista, raw: (r:any) => r.analista, footer: () => '' },
    { id: 'fecha_vencimiento', header: 'Vencimiento', align: 'left', cell: (r:any) => <span className="font-mono">{r.fecha_vencimiento}</span>, raw: (r:any) => r.fecha_vencimiento, footer: () => '' },
    { id: 'dias_para_vencimiento', header: 'Días Faltantes', align: 'center', raw: (r:any) => r.dias_para_vencimiento, footer: () => '',
      cell: (r:any) => (
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
          r.dias_para_vencimiento === 0 ? 'bg-rose-500/20 text-rose-700' :
          r.dias_para_vencimiento <= 2 ? 'bg-amber-500/20 text-amber-800' : 'bg-sky-500/20 text-sky-700'
        }`}>
          {r.dias_para_vencimiento === 0 ? 'HOY' : `${r.dias_para_vencimiento} días`}
        </span>
      )
    },
    { id: 'saldo', header: 'Saldo', align: 'right', cell: (r:any) => <span className="font-mono font-bold text-rose-600">S/ {r.saldo_formateado}</span>, raw: (r:any) => Number(r.saldo_formateado?.replace(/,/g, '') || 0), footer: () => <span className="font-mono text-rose-600">{money(totalSaldo)}</span> }
  ];

  const colRender = cPrev.order.map(id => defPrev.find(c => c.id === id)!);

  const exportar = (formato: 'excel' | 'clipboard') => {
    const headers = colRender.map(c => c.header);
    const rows = datosFiltrados.map((r:any) => colRender.map(col => col.raw(r)));
    if (formato === 'clipboard') {
      const contenido = [headers.join('\t'), ...rows.map(row => row.join('\t'))].join('\n');
      navigator.clipboard.writeText(contenido).then(() => alert('✅ Datos copiados al portapapeles.'));
    } else {
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Preventiva");
      XLSX.writeFile(workbook, `Gestion_Preventiva_${filters.period}.xlsx`);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500" key={`${filters.period}-${filters.agency}`}>
      <WorkdayStrip periodo={filters.period} />
      <SectionBand tone="coral">Próximos a Vencer (5 Días)</SectionBand>
      <Panel title="Gestión Preventiva" icon={ShieldAlert} eyebrow="Cartera en riesgo inminente" action={<ExportActions control={cPrev} onExport={exportar} />}>
        <div className="overflow-auto pb-4 max-h-[500px]">
          <table className="w-full text-left text-[11px] whitespace-nowrap">
            <thead>
              <tr className="border-b border-border text-muted-foreground sticky top-0 bg-card z-10 shadow-sm">
                {colRender.map(col => (
                  <th key={col.id} draggable={col.id !== cPrev.lockedCol} onDragStart={(e) => cPrev.handleDragStart(e, col.id)} onDragOver={cPrev.handleDragOver} onDrop={(e) => cPrev.handleDrop(e, col.id)} 
                      className={`px-3 pt-2 pb-2.5 font-semibold transition-colors ${col.id !== cPrev.lockedCol ? 'cursor-grab active:cursor-grabbing hover:bg-muted/50 hover:text-foreground rounded-t-md' : ''} ${col.align === 'left' ? 'text-left' : col.align === 'center' ? 'text-center' : 'text-right'}`}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {datosFiltrados?.map((row: any, i: number) => (
                <tr key={i} className="hover:bg-muted/30">
                  {colRender.map(col => (
                    <td key={`${i}-${col.id}`} className={`px-3 py-2.5 ${col.align === 'left' ? 'text-left' : col.align === 'center' ? 'text-center' : 'text-right'}`}>{col.cell(row)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot className="sticky bottom-0 z-20 bg-card shadow-[0_-2px_4px_rgba(0,0,0,0.05)]">
              <tr className="border-t-2 border-border font-bold bg-muted/40">
                {colRender.map(col => (
                  <td key={`foot-${col.id}`} className={`px-3 py-2.5 ${col.align === 'left' ? 'text-left' : col.align === 'center' ? 'text-center' : 'text-right'}`} colSpan={col.id === 'agencia' ? 1 : 1}>
                    {col.footer()}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>
    </div>
  );
}

// ============================================================================
// 2. VISTA DE PRODUCTIVIDAD DIARIA (En Vivo con Backend)
// ============================================================================
export function ProductividadDiaria({ filters }: { filters: Filters }) {
  const { data: diariaBD, isLoading, isError } = useQuery({
    queryKey: ['productividad-diaria', filters.period, filters.day],
    queryFn: async () => {
      const params = new URLSearchParams({ day: filters.day || 'Hoy' });
      const res = await fetch(`http://localhost:3000/api/diaria/${filters.period}?${params}`);
      if (!res.ok) throw new Error('Error de red');
      return res.json();
    },
    enabled: filters.period !== 'Cargando...'
  });

  const { dailyRows, asesoresRows, fechaConsultada } = useMemo(() => {
    if (!diariaBD) return { dailyRows: [], asesoresRows: [], fechaConsultada: '' };
    let filteredAgencias = filters.agency === 'Todas' ? diariaBD.agencias || [] : (diariaBD.agencias || []).filter((r: any) => r.agency === filters.agency);
    let filteredAsesores = diariaBD.asesores || [];
    if (filters.agency !== 'Todas') filteredAsesores = filteredAsesores.filter((r: any) => r.agency === filters.agency);
    if (filters.advisor !== 'Todos') filteredAsesores = filteredAsesores.filter((r: any) => r.asesor === filters.advisor);
    
    const rawDate = diariaBD.fechaConsultada;
    const fecha = rawDate ? new Date(rawDate).toLocaleDateString('es-PE', { timeZone: 'UTC' }) : '';
    return { dailyRows: filteredAgencias, asesoresRows: filteredAsesores, fechaConsultada: fecha };
  }, [diariaBD, filters.agency, filters.advisor]);

  const countData = dailyRows.map((row: any) => ({ agency: row.agency, value: row.targetCount > 0 ? Math.round((row.achievedCount / row.targetCount) * 100) : 0 }));
  const amountData = dailyRows.map((row: any) => ({ agency: row.agency, value: row.targetAmount > 0 ? Math.round((row.achievedAmount / row.targetAmount) * 100) : 0 }));

  if (isLoading) return <LoadingState />;
  if (isError || !diariaBD) return <div className="p-4 text-destructive font-semibold">Error al cargar datos diarios.</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500" key={`${filters.period}-${filters.agency}-${filters.day}`}>
      <WorkdayStrip periodo={filters.period} />
      <SectionBand tone="blue">Productividad Diaria {fechaConsultada ? `· Mostrando corte al: ${fechaConsultada}` : ''}</SectionBand>

      <div className="grid gap-5 xl:grid-cols-2">
        <DailyTable title="Respecto a la Cantidad de Colocaciones" mode="count" data={dailyRows} period={filters.period} />
        <DailyTable title="Respecto al Monto de Colocaciones" mode="amount" data={dailyRows} period={filters.period} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ComplianceChart title="Cumplimiento Porcentual de la Meta (Cantidad)" data={countData} />
        <ComplianceChart title="Cumplimiento Porcentual de la Meta (Monto)" data={amountData} />
      </div>

      <div className="grid gap-5 xl:grid-cols-1">
        <AsesoresDiariosTable data={asesoresRows} period={filters.period} />
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// 3. COMPONENTES HIJOS DINÁMICOS
// ----------------------------------------------------------------------------
const COL_DAILY = ['agency', 'target', 'projection', 'achieved', 'diffProj', 'diffMeta'];

function DailyTable({ title, mode, data, period }: { title: string; mode: 'count' | 'amount'; data: any[], period: string }) {
  const cDaily = useColumnOrder(COL_DAILY, `daily_${mode}`, 'agency');

  const t_target = data.reduce((acc, r) => acc + Number(mode === 'count' ? r.targetCount : r.targetAmount), 0);
  const t_projection = data.reduce((acc, r) => acc + Number(mode === 'count' ? r.projectionCount : r.projectionAmount), 0);
  const t_achieved = data.reduce((acc, r) => acc + Number(mode === 'count' ? r.achievedCount : r.achievedAmount), 0);
  const t_faltanteProj = t_projection - t_achieved;
  const t_faltanteMeta = t_target - t_achieved;

  const getTarget = (r:any) => Number(mode === 'count' ? r.targetCount : r.targetAmount);
  const getProj = (r:any) => Number(mode === 'count' ? r.projectionCount : r.projectionAmount);
  const getAchieved = (r:any) => Number(mode === 'count' ? r.achievedCount : r.achievedAmount);
  const getBadge = (pct: number) => pct >= 90 ? '🟢' : (pct >= 60 ? '🟠' : '❌');

  const defDaily = [
    { id: 'agency', header: 'Agencia', align: 'left', cell: (r:any) => <span className="font-medium">{r.agency}</span>, raw: (r:any) => r.agency, footer: () => 'Total' },
    { id: 'target', header: mode === 'count' ? '# Meta' : 'S/ Meta', align: 'right', cell: (r:any) => <span className="font-mono bg-accent/10 px-2 py-0.5 rounded">{mode === 'count' ? getTarget(r) : money(getTarget(r))}</span>, raw: (r:any) => getTarget(r), footer: () => <span className="font-mono bg-accent/10 px-2 py-0.5 rounded">{mode === 'count' ? t_target : money(t_target)}</span> },
    { id: 'projection', header: mode === 'count' ? '# Proyección' : 'S/ Proyección', align: 'right', cell: (r:any) => <span className="font-mono">{mode === 'count' ? getProj(r) : money(getProj(r))}</span>, raw: (r:any) => getProj(r), footer: () => <span className="font-mono">{mode === 'count' ? t_projection : money(t_projection)}</span> },
    { id: 'achieved', header: mode === 'count' ? '# Logrado' : 'S/ Logrado', align: 'right', cell: (r:any) => <span className="font-mono font-bold text-emerald-600">{mode === 'count' ? getAchieved(r) : money(getAchieved(r))}</span>, raw: (r:any) => getAchieved(r), footer: () => <span className="font-mono text-emerald-600">{mode === 'count' ? t_achieved : money(t_achieved)}</span> },
    { id: 'diffProj', header: 'Faltante Proyección', align: 'right', 
      cell: (r:any) => { 
        const diff = getProj(r) - getAchieved(r);
        return <span className="font-mono text-rose-600">{mode === 'count' ? number(Math.abs(diff)) : money(Math.abs(diff))} {getBadge(getTarget(r) > 0 ? (getAchieved(r)/getTarget(r))*100 : 0)}</span>; 
      }, raw: (r:any) => getProj(r) - getAchieved(r), footer: () => <span className="font-mono text-rose-600">{mode === 'count' ? number(Math.abs(t_faltanteProj)) : money(Math.abs(t_faltanteProj))}</span> 
    },
    { id: 'diffMeta', header: 'Faltante Meta', align: 'right', 
      cell: (r:any) => { 
        const diff = getTarget(r) - getAchieved(r);
        return <span className="font-mono font-bold text-rose-600">{mode === 'count' ? number(Math.abs(diff)) : money(Math.abs(diff))} {getBadge(getTarget(r) > 0 ? (getAchieved(r)/getTarget(r))*100 : 0)}</span>; 
      }, raw: (r:any) => getTarget(r) - getAchieved(r), footer: () => <span className="font-mono font-bold text-rose-600">{mode === 'count' ? number(Math.abs(t_faltanteMeta)) : money(Math.abs(t_faltanteMeta))}</span> 
    }
  ];

  const colRender = cDaily.order.map(id => defDaily.find(c => c.id === id)!);

  const exportar = (formato: 'excel' | 'clipboard') => {
    const headers = colRender.map(c => c.header);
    const rows = data.map((r:any) => colRender.map(col => col.raw(r)));
    if (formato === 'clipboard') {
      const contenido = [headers.join('\t'), ...rows.map(row => row.map(val => (typeof val === 'number' && val % 1 !== 0) ? val.toFixed(4) : val).join('\t'))].join('\n');
      navigator.clipboard.writeText(contenido).then(() => alert('✅ Datos copiados al portapapeles.'));
    } else {
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");
      XLSX.writeFile(workbook, `Productividad_${mode}_${period}.xlsx`);
    }
  };

  return (
    <Panel title={title} icon={TrendingUp} eyebrow="Verde: >=90% || Naranja: >=60% || Rojo: <60%" action={<ExportActions control={cDaily} onExport={exportar} />}>
      <div className="overflow-auto pb-4 max-h-[500px]">
        <table className="w-full text-left text-[11px] whitespace-nowrap">
          <thead>
            <tr className="border-b border-border text-muted-foreground sticky top-0 bg-card z-10 shadow-sm">
              {colRender.map(col => (
                <th key={col.id} draggable={col.id !== cDaily.lockedCol} onDragStart={(e) => cDaily.handleDragStart(e, col.id)} onDragOver={cDaily.handleDragOver} onDrop={(e) => cDaily.handleDrop(e, col.id)} 
                    className={`px-3 pt-2 pb-2.5 font-semibold transition-colors ${col.id !== cDaily.lockedCol ? 'cursor-grab active:cursor-grabbing hover:bg-muted/50 hover:text-foreground rounded-t-md' : ''} ${col.align === 'left' ? 'text-left' : 'text-right'}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {data.map((row) => (
              <tr key={row.agency} className="hover:bg-muted/30">
                {colRender.map(col => (
                  <td key={`${row.agency}-${col.id}`} className={`px-3 py-2.5 ${col.align === 'left' ? 'text-left' : 'text-right'}`}>{col.cell(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot className="sticky bottom-0 z-20 bg-card shadow-[0_-2px_4px_rgba(0,0,0,0.05)]">
            <tr className="border-t-2 border-border font-bold bg-muted/40">
              {colRender.map(col => (
                <td key={`foot-${col.id}`} className={`px-3 py-2.5 ${col.align === 'left' ? 'text-left' : 'text-right'}`}>{col.footer()}</td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </Panel>
  );
}

function ComplianceChart({ title, data }: { title: string; data: { agency: string; value: number }[] }) {
  const sortedData = data.slice().sort((a, b) => b.value - a.value);
  return (
    <Panel title={title} eyebrow="Porcentaje de avance respecto a la meta">
      <div className="h-[380px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sortedData} layout="vertical" margin={{ left: 20, right: 35, top: 10, bottom: 10 }}>
            <CartesianGrid horizontal={false} stroke="#e2e8f0" strokeDasharray="3 3" />
            <XAxis type="number" domain={[0, 100]} tickFormatter={(val) => `${val}%`} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="agency" width={95} tick={{ fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(val: number) => [`${val}%`, 'Avance']} />
            <Bar dataKey="value" name="% Avanzado" fill="#1e3a8a" radius={[0, 3, 3, 0]} barSize={16}>
              <LabelList dataKey="value" position="right" formatter={(val: number) => `${val}%`} style={{ fontSize: '10px', fill: '#334155', fontWeight: 'bold' }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

const COL_ASESORES = ['asesor', 'operations', 'disbursements'];

function AsesoresDiariosTable({ data, period }: { data: any[], period: string }) {
  const cAsesores = useColumnOrder(COL_ASESORES, 'asesores', 'asesor');

  const t_ops = data.reduce((acc, r) => acc + Number(r.operations || 0), 0);
  const t_des = data.reduce((acc, r) => acc + Number(r.disbursements || 0), 0);

  const defAsesores = [
    { id: 'asesor', header: 'Asesor', align: 'left', cell: (r:any) => <span className="font-medium">{r.asesor}</span>, raw: (r:any) => r.asesor, footer: () => 'Total' },
    { id: 'operations', header: 'Operaciones', align: 'right', cell: (r:any) => <span className="font-mono">{r.operations}</span>, raw: (r:any) => r.operations, footer: () => <span className="font-mono">{t_ops}</span> },
    { id: 'disbursements', header: 'Desembolsos', align: 'right', cell: (r:any) => <span className="font-mono">{money(r.disbursements)}</span>, raw: (r:any) => r.disbursements, footer: () => <span className="font-mono">{money(t_des)}</span> }
  ];

  const colRender = cAsesores.order.map(id => defAsesores.find(c => c.id === id)!);

  const exportar = (formato: 'excel' | 'clipboard') => {
    const headers = colRender.map(c => c.header);
    const rows = data.map((r:any) => colRender.map(col => col.raw(r)));
    if (formato === 'clipboard') {
      const contenido = [headers.join('\t'), ...rows.map(row => row.join('\t'))].join('\n');
      navigator.clipboard.writeText(contenido).then(() => alert('✅ Datos copiados al portapapeles.'));
    } else {
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Asesores");
      XLSX.writeFile(workbook, `Productividad_Asesores_${period}.xlsx`);
    }
  };

  return (
    <Panel title="Cantidad y Monto de Colocaciones por Asesor" icon={Users} eyebrow="Rendimiento individual diario" action={<ExportActions control={cAsesores} onExport={exportar} />}>
      <div className="overflow-auto pb-4 max-h-[450px]">
        <table className="w-full text-left text-[11px] whitespace-nowrap">
          <thead>
            <tr className="border-b border-border text-muted-foreground sticky top-0 bg-card z-10 shadow-sm">
              {colRender.map(col => (
                <th key={col.id} draggable={col.id !== cAsesores.lockedCol} onDragStart={(e) => cAsesores.handleDragStart(e, col.id)} onDragOver={cAsesores.handleDragOver} onDrop={(e) => cAsesores.handleDrop(e, col.id)} 
                    className={`px-4 py-2 font-semibold transition-colors ${col.id !== cAsesores.lockedCol ? 'cursor-grab active:cursor-grabbing hover:bg-muted/50 hover:text-foreground rounded-t-md' : ''} ${col.align === 'left' ? 'text-left' : 'text-right'}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {data.length > 0 ? data.map((row, idx) => (
              <tr key={idx} className="hover:bg-muted/30">
                {colRender.map(col => (
                  <td key={`${idx}-${col.id}`} className={`px-4 py-2 ${col.align === 'left' ? 'text-left' : 'text-right'}`}>{col.cell(row)}</td>
                ))}
              </tr>
            )) : (
              <tr><td colSpan={3} className="py-4 text-center text-muted-foreground italic">No hay registros de asesores para esta fecha.</td></tr>
            )}
          </tbody>
          <tfoot className="sticky bottom-0 z-20 bg-card shadow-[0_-2px_4px_rgba(0,0,0,0.05)]">
            <tr className="border-t-2 border-border font-bold bg-muted/40">
              {colRender.map(col => (
                <td key={`foot-${col.id}`} className={`px-4 py-2.5 ${col.align === 'left' ? 'text-left' : 'text-right'}`}>
                  {col.footer()}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </Panel>
  );
}