//SupervisionAgenciasView.tsx

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Filters, View } from '../utils/constants';
import { money, number } from '../utils/formatters';
import { LoadingState } from '../components/ui/LoadingState';
import { SectionBand } from '../components/ui/SectionBand';
import { Panel } from '../components/ui/Panel';
import { TableShell } from '../components/ui/TableShell';
import { StatusCell } from '../components/ui/StatusCell';
import { WorkdayStrip } from '../components/WorkdayStrip';
import { RefreshCw, Copy, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

// ============================================================================
// COMPONENTES MAESTROS Y HOOKS (Extraídos para máximo rendimiento)
// ============================================================================
function useColumnOrder(initialOrder: string[], tableId: string) {
  const [order, setOrder] = useState(initialOrder);
  const isModified = JSON.stringify(order) !== JSON.stringify(initialOrder);

  // 🚀 FIX FANTASMA: Mantiene sincronizadas las columnas si el initialOrder cambia
  useEffect(() => {
    setOrder(initialOrder);
  }, [JSON.stringify(initialOrder)]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (id === 'agency') {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData(`col_id_${tableId}`, id);
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  
  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData(`col_id_${tableId}`);
    if (!sourceId || sourceId === targetId || sourceId === 'agency' || targetId === 'agency') return;
    
    const sourceIndex = order.indexOf(sourceId);
    const targetIndex = order.indexOf(targetId);
    const newOrder = [...order];
    const [removed] = newOrder.splice(sourceIndex, 1);
    newOrder.splice(targetIndex, 0, removed);
    setOrder(newOrder);
  };
  
  return { order, handleDragStart, handleDragOver, handleDrop, resetOrder: () => setOrder(initialOrder), isModified };
}

// 🚀 EXTRAÍDO AFUERA: Ahora no causa re-renderizados innecesarios en las 3 tablas
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

// DEFINICIÓN DE COLUMNAS INICIALES
const COL_T1_COMPLETA = ['agency', 'crecNeto', 'tea', 'metaOp', 'nroOp', 'plazo', 'socInicio', 'socActual', 'colocacion', 'cartera', 'moraCppMax', 'moraCppAct', 'moraDefMax', 'moraDefAct', 'repagos'];
const COL_T2_COMERCIAL = ['agency', 'crecNeto', 'tea', 'metaOp', 'nroOp', 'plazo', 'socInicio', 'socActual', 'colocacion', 'cartera', 'moraCppMax', 'moraCppAct', 'pctMoraCpp', 'moraDefMax', 'moraDefAct', 'repagos', 'pctMoraDef', 'carteraFin', 'pctMoraCppCf', 'pctMoraDefCf'];
const COL_T3_RECUPERACION = ['agency', 'recuperador', 'crecNeto', 'cartInicio', 'moraCppMax', 'moraCppAct', 'moraDefMax', 'moraDefAct', 'repagos'];

// ============================================================================
// VISTA PRINCIPAL
// ============================================================================
export function SupervisionAgenciasView({ navigate, filters }: { navigate: (view: View) => void; filters: Filters }) {
  // ==========================================
  // ZONA 1: TODOS LOS HOOKS (Incondicionales)
  // ==========================================
  const { data: supervisionBD, isLoading, error } = useQuery({
    queryKey: ['indicadores-supervision', filters.period],
    queryFn: async () => {
      const res = await fetch(`http://localhost:3000/api/supervision/${filters.period}`);
      if (!res.ok) throw new Error('Error al cargar supervisión');
      return res.json();
    },
    enabled: !!filters.period && filters.period !== 'Cargando...'
  });

  const { dataCompleta, dataComercial, dataRecuperacion } = useMemo(() => {
    const filterByAgency = (arr: any[]) => filters.agency === 'Todas' ? arr : arr.filter((r: any) => r.agency === filters.agency);
    return {
      dataCompleta: filterByAgency(supervisionBD?.completa || []),
      dataComercial: filterByAgency(supervisionBD?.comercial || []),
      dataRecuperacion: filterByAgency(supervisionBD?.recuperacion || [])
    };
  }, [supervisionBD, filters.agency]);

  const totales = useMemo(() => {
    const sum = (arr: any[], key: string) => arr.reduce((acc, row) => acc + Number(row[key] || 0), 0);
    const wAvg = (arr: any[], valKey: string, weightKey: string) => {
      const totalWeight = sum(arr, weightKey);
      if (totalWeight === 0) return 0;
      const sumProduct = arr.reduce((acc, row) => acc + (Number(row[valKey] || 0) * Number(row[weightKey] || 0)), 0);
      return sumProduct / totalWeight;
    };

    const t2_cartera = sum(dataComercial, 'cartera');
    const t2_carteraFin = sum(dataComercial, 'carteraFin');

    return {
      // TABLA 1: COMPLETA
      t1_crecNeto: sum(dataCompleta, 'crecimientoNeto150'),
      t1_tea: wAvg(dataCompleta, 'tea', 'amountAchieved'),
      t1_metaOp: sum(dataCompleta, 'opTarget'),
      t1_nroOp: sum(dataCompleta, 'opAchieved'),
      t1_plazo: wAvg(dataCompleta, 'plazo', 'opAchieved'),
      t1_socInicio: sum(dataCompleta, 'sociosInicio'),
      t1_socActual: sum(dataCompleta, 'sociosActual'),
      t1_colocacion: sum(dataCompleta, 'amountAchieved'),
      t1_cartera: sum(dataCompleta, 'cartera'),
      t1_moraCppMax: sum(dataCompleta, 'moraCppMax'),
      t1_moraCppAct: sum(dataCompleta, 'moraCppActual'),
      t1_moraDefMax: sum(dataCompleta, 'moraDefMax'),
      t1_moraDefAct: sum(dataCompleta, 'moraDefActual'),
      t1_repagos: sum(dataCompleta, 'repagos'),

      // TABLA 2: COMERCIAL
      t2_crecNeto: sum(dataComercial, 'crecimientoNeto150'),
      t2_tea: wAvg(dataComercial, 'tea', 'amountAchieved'),
      t2_metaOp: sum(dataComercial, 'opTarget'),
      t2_nroOp: sum(dataComercial, 'opAchieved'),
      t2_plazo: wAvg(dataComercial, 'plazo', 'opAchieved'),
      t2_socInicio: sum(dataComercial, 'sociosInicio'),
      t2_socActual: sum(dataComercial, 'sociosActual'),
      t2_colocacion: sum(dataComercial, 'amountAchieved'),
      t2_cartera,
      t2_moraCppMax: sum(dataComercial, 'moraCppMax'),
      t2_moraCppAct: sum(dataComercial, 'moraCppActual'),
      t2_pctMoraCpp: t2_cartera > 0 ? (sum(dataComercial, 'moraCppActual') / t2_cartera) * 100 : 0,
      t2_moraDefMax: sum(dataComercial, 'moraDefMax'),
      t2_moraDefAct: sum(dataComercial, 'moraDefActual'),
      t2_repagos: sum(dataComercial, 'repagos'),
      t2_pctMoraDef: t2_cartera > 0 ? (sum(dataComercial, 'moraDefActual') / t2_cartera) * 100 : 0,
      t2_carteraFin,
      t2_pctMoraCppCf: t2_carteraFin > 0 ? (sum(dataComercial, 'moraCppActual') / t2_carteraFin) * 100 : 0,
      t2_pctMoraDefCf: t2_carteraFin > 0 ? (sum(dataComercial, 'moraDefActual') / t2_carteraFin) * 100 : 0,

      // TABLA 3: RECUPERACIÓN
      t3_crecNeto: sum(dataRecuperacion, 'crecimientoNeto150'),
      t3_cartInicio: sum(dataRecuperacion, 'carteraInicio'),
      t3_moraCppMax: sum(dataRecuperacion, 'moraCppMax'),
      t3_moraCppAct: sum(dataRecuperacion, 'moraCppActual'),
      t3_moraDefMax: sum(dataRecuperacion, 'moraDefMax'),
      t3_moraDefAct: sum(dataRecuperacion, 'moraDefActual'),
      t3_repagos: sum(dataRecuperacion, 'repagos')
    };
  }, [dataCompleta, dataComercial, dataRecuperacion]);

  // 🚀 GESTIÓN INDEPENDIENTE DE COLUMNAS PARA LAS 3 TABLAS
  const t1 = useColumnOrder(COL_T1_COMPLETA, 't1');
  const t2 = useColumnOrder(COL_T2_COMERCIAL, 't2');
  const t3 = useColumnOrder(COL_T3_RECUPERACION, 't3');

  // ==========================================
  // ZONA 2: LÓGICA Y FUNCIONES
  // ==========================================
  const colDestacada = "bg-[hsl(35_80%_50%/.15)]";

  const defT1 = [
    { id: 'agency', header: 'Agencia', className: 'font-bold text-left', cell: (r: any) => r.agency, raw: (r: any) => r.agency, footer: () => 'Total' },
    { id: 'crecNeto', header: 'Crecimiento Neto 150', className: 'text-right font-semibold', cell: (r: any) => <span className={r.crecimientoNeto150 < 0 ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--primary))]'}>{r.crecimientoNeto150 >= 0 ? '+' : ''}{money(r.crecimientoNeto150)}</span>, raw: (r: any) => r.crecimientoNeto150, footer: () => <span className={totales.t1_crecNeto < 0 ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--primary))]'}>{totales.t1_crecNeto >= 0 ? '+' : ''}{money(totales.t1_crecNeto)}</span> },
    { id: 'tea', header: 'TEA', className: 'text-right font-mono', cell: (r: any) => Number(r.tea).toFixed(2), raw: (r: any) => r.tea, footer: () => totales.t1_tea.toFixed(2) },
    { id: 'metaOp', header: 'Meta Ope', className: `text-right font-mono font-semibold ${colDestacada}`, cell: (r: any) => r.opTarget, raw: (r: any) => r.opTarget, footer: () => totales.t1_metaOp },
    { id: 'nroOp', header: 'Nro Ope', className: 'text-right font-mono', cell: (r: any) => r.opAchieved, raw: (r: any) => r.opAchieved, footer: () => totales.t1_nroOp },
    { id: 'plazo', header: 'Plazo', className: 'text-right font-mono text-[hsl(138_72%_35%)]', cell: (r: any) => Number(r.plazo).toFixed(2), raw: (r: any) => r.plazo, footer: () => totales.t1_plazo.toFixed(2) },
    { id: 'socInicio', header: 'Nro Socios de Inicio', className: `text-right font-mono font-semibold ${colDestacada}`, cell: (r: any) => number(r.sociosInicio), raw: (r: any) => r.sociosInicio, footer: () => number(totales.t1_socInicio) },
    { id: 'socActual', header: 'Nro Socios', className: 'text-right font-mono text-[hsl(138_72%_35%)]', cell: (r: any) => number(r.sociosActual), raw: (r: any) => r.sociosActual, footer: () => number(totales.t1_socActual) },
    { id: 'colocacion', header: 'Colocación', className: 'text-right text-muted-foreground', cell: (r: any) => money(r.amountAchieved), raw: (r: any) => r.amountAchieved, footer: () => money(totales.t1_colocacion) },
    { id: 'cartera', header: 'Cartera', className: 'text-right text-muted-foreground', cell: (r: any) => money(r.cartera), raw: (r: any) => r.cartera, footer: () => money(totales.t1_cartera) },
    { id: 'moraCppMax', header: 'Mora CPP Máximo', className: `text-right font-semibold ${colDestacada}`, cell: (r: any) => money(r.moraCppMax), raw: (r: any) => r.moraCppMax, footer: () => money(totales.t1_moraCppMax) },
    { id: 'moraCppAct', header: 'Mora CPP Actual', className: 'text-right', cell: (r: any) => <StatusCell value={r.moraCppActual} threshold={r.moraCppMax} />, raw: (r: any) => r.moraCppActual, footer: () => <StatusCell value={totales.t1_moraCppAct} threshold={totales.t1_moraCppMax} /> },
    { id: 'moraDefMax', header: 'Mora Deficiente Máximo', className: `text-right font-semibold ${colDestacada}`, cell: (r: any) => money(r.moraDefMax), raw: (r: any) => r.moraDefMax, footer: () => money(totales.t1_moraDefMax) },
    { id: 'moraDefAct', header: 'Mora deficiente real', className: 'text-right', cell: (r: any) => <StatusCell value={r.moraDefActual} threshold={r.moraDefMax} />, raw: (r: any) => r.moraDefActual, footer: () => <StatusCell value={totales.t1_moraDefAct} threshold={totales.t1_moraDefMax} /> },
    { id: 'repagos', header: 'Repagos', className: 'text-right text-muted-foreground', cell: (r: any) => money(r.repagos), raw: (r: any) => r.repagos, footer: () => money(totales.t1_repagos) }
  ];

  const defT2 = [
    ...defT1.slice(0, 12),
    { id: 'pctMoraCpp', header: '% Mora Piso', className: 'text-right font-mono', cell: (r: any) => `${Number(r.pctMoraCpp).toFixed(2)}%`, raw: (r: any) => r.pctMoraCpp / 100, footer: () => `${totales.t2_pctMoraCpp.toFixed(2)}%` },
    defT1[12], defT1[13], defT1[14],
    { id: 'pctMoraDef', header: '% Mora deficiente', className: 'text-right font-mono', cell: (r: any) => `${Number(r.pctMoraDef).toFixed(2)}%`, raw: (r: any) => r.pctMoraDef / 100, footer: () => `${totales.t2_pctMoraDef.toFixed(2)}%` },
    { id: 'carteraFin', header: 'M M Cartera Fin', className: 'text-right text-muted-foreground', cell: (r: any) => money(r.carteraFin), raw: (r: any) => r.carteraFin, footer: () => money(totales.t2_carteraFin) },
    { id: 'pctMoraCppCf', header: '% mora piso cf', className: 'text-right font-mono', cell: (r: any) => `${Number(r.pctMoraCppCf).toFixed(2)}%`, raw: (r: any) => r.pctMoraCppCf / 100, footer: () => `${totales.t2_pctMoraCppCf.toFixed(2)}%` },
    { id: 'pctMoraDefCf', header: 'Mora deficiente cf', className: 'text-right font-mono', cell: (r: any) => `${Number(r.pctMoraDefCf).toFixed(2)}%`, raw: (r: any) => r.pctMoraDefCf / 100, footer: () => `${totales.t2_pctMoraDefCf.toFixed(2)}%` }
  ];

  const defT3 = [
    { id: 'agency', header: 'Agencia', className: 'font-bold text-left', cell: (r: any) => r.agency, raw: (r: any) => r.agency, footer: () => 'Total' },
    { id: 'recuperador', header: 'Recuperador', className: 'text-left text-muted-foreground', cell: (r: any) => r.recuperador, raw: (r: any) => r.recuperador, footer: () => '' },
    { id: 'crecNeto', header: 'Crecimiento Neto 150', className: 'text-right font-semibold text-[hsl(var(--destructive))]', cell: (r: any) => `-${money(Math.abs(r.crecimientoNeto150))}`, raw: (r: any) => r.crecimientoNeto150, footer: () => <span className="text-[hsl(var(--destructive))]">-{money(Math.abs(totales.t3_crecNeto))}</span> },
    { id: 'cartInicio', header: 'Cartera de Inicio', className: 'text-right text-muted-foreground', cell: (r: any) => money(r.carteraInicio), raw: (r: any) => r.carteraInicio, footer: () => money(totales.t3_cartInicio) },
    { id: 'moraCppMax', header: 'Mora CPP Máximo', className: `text-right font-semibold ${colDestacada}`, cell: (r: any) => money(r.moraCppMax), raw: (r: any) => r.moraCppMax, footer: () => money(totales.t3_moraCppMax) },
    { id: 'moraCppAct', header: 'Mora CPP Actual', className: 'text-right', cell: (r: any) => <StatusCell value={r.moraCppActual} threshold={r.moraCppMax} />, raw: (r: any) => r.moraCppActual, footer: () => <StatusCell value={totales.t3_moraCppAct} threshold={totales.t3_moraCppMax} /> },
    { id: 'moraDefMax', header: 'Mora Deficiente Maximo', className: `text-right font-semibold ${colDestacada}`, cell: (r: any) => money(r.moraDefMax), raw: (r: any) => r.moraDefMax, footer: () => money(totales.t3_moraDefMax) },
    { id: 'moraDefAct', header: 'Mora deficiente real', className: 'text-right', cell: (r: any) => <StatusCell value={r.moraDefActual} threshold={r.moraDefMax} />, raw: (r: any) => r.moraDefActual, footer: () => <StatusCell value={totales.t3_moraDefAct} threshold={totales.t3_moraDefMax} /> },
    { id: 'repagos', header: 'Repagos', className: 'text-right text-muted-foreground', cell: (r: any) => money(r.repagos), raw: (r: any) => r.repagos, footer: () => money(totales.t3_repagos) }
  ];

  const colRenderT1 = t1.order.map(id => defT1.find(c => c?.id === id)!);
  const colRenderT2 = t2.order.map(id => defT2.find(c => c?.id === id)!);
  const colRenderT3 = t3.order.map(id => defT3.find(c => c?.id === id)!);

  const exportarTabla = (tablaId: 't1' | 't2' | 't3', formato: 'excel' | 'clipboard') => {
    let rawCols: any[] = [];
    let rowsData: any[] = [];
    let filename = '';

    if (tablaId === 't1') { rawCols = colRenderT1; rowsData = dataCompleta; filename = `Agencia_Completa_${filters.period}`; }
    if (tablaId === 't2') { rawCols = colRenderT2; rowsData = dataComercial; filename = `Agencia_Comercial_${filters.period}`; }
    if (tablaId === 't3') { rawCols = colRenderT3; rowsData = dataRecuperacion; filename = `Recuperadores_${filters.period}`; }

    const headers = rawCols.map(c => c.header);
    const rows = rowsData.map(r => rawCols.map(col => col.raw(r)));

    if (formato === 'clipboard') {
      const contenido = [
        headers.join('\t'),
        ...rows.map(row => row.map(val => (typeof val === 'number' && val % 1 !== 0) ? val.toFixed(4) : val).join('\t'))
      ].join('\n');
      
      navigator.clipboard.writeText(contenido).then(() => {
        alert('✅ Datos copiados. Ya puedes pegarlos en Excel o Word.');
      });
    } else {
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");
      XLSX.writeFile(workbook, `${filename}.xlsx`);
    }
  };

  // ==========================================
  // ZONA 3: RETORNOS ANTICIPADOS (Carga y Error)
  // ==========================================
  if (isLoading || !supervisionBD) return <LoadingState />;
  if (error) return <div className="p-5 text-red-500 font-bold border border-red-200 bg-red-50 rounded-xl">Error de conexión al DWH. Verifica la terminal del backend.</div>;

  // ==========================================
  // ZONA 4: RENDERIZADO PRINCIPAL
  // ==========================================
  return (
    <div className="space-y-6 animate-in fade-in duration-500" key={`${filters.period}-${filters.agency}`}>
      <WorkdayStrip periodo={filters.period} />

      {/* 1. AGENCIA COMPLETA */}
      <SectionBand tone="blue">Agencia Completa: Comercial + Recuperadores</SectionBand>
      <Panel title="Indicadores por agencia" eyebrow="Crecimiento Neto 150 · Cartera y Mora" action={<ExportActions control={t1} onExport={(f) => exportarTabla('t1', f)} />}>
        <TableShell minWidth="1800px">
          <table className="w-full text-[13px] whitespace-nowrap">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {colRenderT1.map(col => (
                  <th key={col.id} draggable={col.id !== 'agency'} onDragStart={(e) => t1.handleDragStart(e, col.id)} onDragOver={t1.handleDragOver} onDrop={(e) => t1.handleDrop(e, col.id)} 
                    className={`px-4 py-3.5 font-bold text-muted-foreground transition-colors ${col.id !== 'agency' ? 'cursor-grab active:cursor-grabbing hover:bg-muted/50 hover:text-foreground rounded-t-md' : ''} ${col.className.includes('text-left') ? 'text-left' : 'text-right'} ${col.className.includes(colDestacada) ? colDestacada : ''}`}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {dataCompleta.map((r: any) => (
                <tr key={r.agency} onClick={() => navigate('agencia')} className="cursor-pointer hover:bg-muted/30 transition-colors">
                  {colRenderT1.map(col => (
                    <td key={`${r.agency}-${col.id}`} className={`px-4 py-3 ${col.className}`}>{col.cell(r)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border font-bold bg-muted/40">
                {colRenderT1.map(col => (
                  <td key={`foot-${col.id}`} className={`px-4 py-3 ${col.className}`}>{col.footer()}</td>
                ))}
              </tr>
            </tfoot>
          </table>
        </TableShell>
      </Panel>

      {/* 2. AGENCIA COMERCIAL */}
      <SectionBand tone="green">Agencias - Parte Comercial</SectionBand>
      <Panel title="Indicadores por agencia" eyebrow="Analistas y Administradores" action={<ExportActions control={t2} onExport={(f) => exportarTabla('t2', f)} />}>
        <TableShell minWidth="2400px">
          <table className="w-full text-[13px] whitespace-nowrap">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {colRenderT2.map(col => (
                  <th key={col.id} draggable={col.id !== 'agency'} onDragStart={(e) => t2.handleDragStart(e, col.id)} onDragOver={t2.handleDragOver} onDrop={(e) => t2.handleDrop(e, col.id)} 
                    className={`px-4 py-3.5 font-bold text-muted-foreground transition-colors ${col.id !== 'agency' ? 'cursor-grab active:cursor-grabbing hover:bg-muted/50 hover:text-foreground rounded-t-md' : ''} ${col.className.includes('text-left') ? 'text-left' : 'text-right'} ${col.className.includes(colDestacada) ? colDestacada : ''}`}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {dataComercial.map((r: any) => (
                <tr key={r.agency} className="hover:bg-muted/30 transition-colors">
                  {colRenderT2.map(col => (
                    <td key={`${r.agency}-${col.id}`} className={`px-4 py-3 ${col.className}`}>{col.cell(r)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border font-bold bg-muted/40">
                {colRenderT2.map(col => (
                  <td key={`foot-${col.id}`} className={`px-4 py-3 ${col.className}`}>{col.footer()}</td>
                ))}
              </tr>
            </tfoot>
          </table>
        </TableShell>
      </Panel>

      {/* 3. RECUPERADORES */}
      <SectionBand tone="coral">Agencias - Parte Recuperación</SectionBand>
      <Panel title="Recuperación por agencia" eyebrow="Cartera de inicio, mora deficiente y repagos" action={<ExportActions control={t3} onExport={(f) => exportarTabla('t3', f)} />}>
        <TableShell minWidth="1200px">
          <table className="w-full text-[13px] whitespace-nowrap">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {colRenderT3.map(col => (
                  <th key={col.id} draggable={col.id !== 'agency'} onDragStart={(e) => t3.handleDragStart(e, col.id)} onDragOver={t3.handleDragOver} onDrop={(e) => t3.handleDrop(e, col.id)} 
                    className={`px-4 py-3.5 font-bold text-muted-foreground transition-colors ${col.id !== 'agency' ? 'cursor-grab active:cursor-grabbing hover:bg-muted/50 hover:text-foreground rounded-t-md' : ''} ${col.className.includes('text-left') ? 'text-left' : 'text-right'} ${col.className.includes(colDestacada) ? colDestacada : ''}`}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {dataRecuperacion.map((r: any) => (
                <tr key={`${r.agency}-${r.recuperador}`} className="hover:bg-muted/30 transition-colors">
                  {colRenderT3.map(col => (
                    <td key={`${r.agency}-${col.id}`} className={`px-4 py-3 ${col.className}`}>{col.cell(r)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border font-bold bg-muted/40">
                {colRenderT3.map(col => (
                  <td key={`foot-${col.id}`} className={`px-4 py-3 ${col.className}`}>{col.footer()}</td>
                ))}
              </tr>
            </tfoot>
          </table>
        </TableShell>
      </Panel>
    </div>
  );
}