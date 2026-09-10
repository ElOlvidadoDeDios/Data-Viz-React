//AgenciaView.tsx

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { Building2, Users, ShieldAlert, RefreshCw, Copy, Download } from 'lucide-react';
import { Panel } from '../components/ui/Panel';
import { WorkdayStrip } from '../components/WorkdayStrip';

// ============================================================================
// HOOKS Y COMPONENTES MAESTROS (DRAG & DROP / EXPORTACIÓN)
// ============================================================================
function useColumnOrder(initialOrder: string[], tableId: string, lockedCol: string) {
  const [order, setOrder] = useState(initialOrder);
  const isModified = JSON.stringify(order) !== JSON.stringify(initialOrder);

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
    const newOrder = [...order];
    newOrder.splice(order.indexOf(targetId), 0, newOrder.splice(order.indexOf(sourceId), 1)[0]);
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

function DraggableTable({ control, columns, data, containerClass, showFooter = true }: { control: any, columns: any[], data: any[], containerClass: string, showFooter?: boolean }) {
  return (
    <div className={containerClass}>
      <table className="w-full text-left text-[11px] whitespace-nowrap">
        <thead>
          <tr className="border-b border-border text-muted-foreground sticky top-0 bg-card z-10 shadow-sm">
            {columns.map(col => (
              <th key={col.id} draggable={col.id !== control.lockedCol} onDragStart={(e) => control.handleDragStart(e, col.id)} onDragOver={control.handleDragOver} onDrop={(e) => control.handleDrop(e, col.id)}
                  className={`px-3 pt-2 pb-2.5 font-semibold transition-colors ${col.id !== control.lockedCol ? 'cursor-grab active:cursor-grabbing hover:bg-muted/50 hover:text-foreground rounded-t-md' : ''} ${col.align === 'left' ? 'text-left' : 'text-right'} ${col.bgClass || ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {data.length > 0 ? data.map((row: any, i: number) => (
            <tr key={`row-${i}`} className="hover:bg-muted/30 transition-colors">
              {columns.map(col => (
                <td key={`cell-${i}-${col.id}`} className={`px-3 py-2.5 ${col.align === 'left' ? 'text-left' : 'text-right'} ${col.bgClass || ''}`}>
                  {col.cell(row)}
                </td>
              ))}
            </tr>
          )) : (
            <tr><td colSpan={columns.length} className="px-3 py-4 text-center text-muted-foreground italic">No hay registros para esta selección.</td></tr>
          )}
        </tbody>
        {showFooter && data.length > 0 && (
          <tfoot className="sticky bottom-0 z-10 bg-card shadow-[0_-1px_2px_rgba(0,0,0,0.05)]">
            <tr className="border-t-2 border-border font-bold bg-muted/20">
              {columns.map(col => (
                <td key={`foot-${col.id}`} className={`px-3 py-2.5 ${col.align === 'left' ? 'text-left' : 'text-right'} ${col.bgClass || ''}`}>
                  {col.footer()}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

const Col = (id: string, header: string, cell: (r:any)=>any, raw: (r:any)=>any, footer: ()=>any, align='right', bgClass='') => ({ id, header, cell, raw, footer, align, bgClass });

// ============================================================================
// VISTA PRINCIPAL DE AGENCIA
// ============================================================================
export function AgenciaView({ filters }: { filters: any }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['agencia', filters.period], 
    queryFn: async () => {
      const params = new URLSearchParams({ periodo: filters.period !== 'Cargando...' ? filters.period : '' });
      const res = await fetch(`http://localhost:3000/api/agencia?${params}`);
      if (!res.ok) throw new Error('Error al cargar datos de la agencia');
      return res.json();
    },
    enabled: filters.period !== 'Cargando...',
  });

  const agenciaComercialRaw = useMemo(() => {
    let arr = data?.comercial || [];
    if (filters.agency !== 'Todas') arr = arr.filter((r: any) => String(r.agency || '').trim() === String(filters.agency).trim());
    return arr;
  }, [data?.comercial, filters.agency]);

  const comercialFiltered = useMemo(() => {
    let arr = agenciaComercialRaw;
    if (filters.advisor !== 'Todos') arr = arr.filter((r: any) => String(r.asesor || '').trim() === String(filters.advisor).trim());
    return arr;
  }, [agenciaComercialRaw, filters.advisor]);

  const recuperacionFiltered = useMemo(() => {
    let arr = data?.recuperacion || [];
    if (filters.agency !== 'Todas') arr = arr.filter((r: any) => String(r.agency || '').trim() === String(filters.agency).trim());
    if (filters.advisor !== 'Todos') arr = arr.filter((r: any) => String(r.recuperador || '').trim() === String(filters.advisor).trim());
    return arr;
  }, [data?.recuperacion, filters.agency, filters.advisor]);

  const totalesAgenciaGlobal = useMemo(() => {
    return agenciaComercialRaw.reduce((acc: any, curr: any) => ({
      crecimientoNeto150: acc.crecimientoNeto150 + Number(curr.crecimientoNeto150 || 0), amountAchieved: acc.amountAchieved + Number(curr.amountAchieved || 0),
      repagos: acc.repagos + Number(curr.repagos || 0), tea: acc.tea + Number(curr.tea || 0), opAchieved: acc.opAchieved + Number(curr.opAchieved || 0),
      sociosInicio: acc.sociosInicio + Number(curr.sociosInicio || 0), sociosActual: acc.sociosActual + Number(curr.sociosActual || 0),
      cartera: acc.cartera + Number(curr.cartera || 0), moraCppMax: acc.moraCppMax + Number(curr.moraCppMax || 0), moraCppActual: acc.moraCppActual + Number(curr.moraCppActual || 0),
      moraDefMax: acc.moraDefMax + Number(curr.moraDefMax || 0), moraDefActual: acc.moraDefActual + Number(curr.moraDefActual || 0),
    }), { crecimientoNeto150: 0, amountAchieved: 0, repagos: 0, tea: 0, opAchieved: 0, sociosInicio: 0, sociosActual: 0, cartera: 0, moraCppMax: 0, moraCppActual: 0, moraDefMax: 0, moraDefActual: 0 });
  }, [agenciaComercialRaw]);

  const totales = useMemo(() => {
    const acc = comercialFiltered.reduce((acc: any, curr: any) => ({
      crecimientoNeto150: acc.crecimientoNeto150 + Number(curr.crecimientoNeto150 || 0), amountAchieved: acc.amountAchieved + Number(curr.amountAchieved || 0),
      repagos: acc.repagos + Number(curr.repagos || 0), tea: acc.tea + Number(curr.tea || 0), opAchieved: acc.opAchieved + Number(curr.opAchieved || 0),
      sociosInicio: acc.sociosInicio + Number(curr.sociosInicio || 0), sociosActual: acc.sociosActual + Number(curr.sociosActual || 0),
      cartera: acc.cartera + Number(curr.cartera || 0), moraCppMax: acc.moraCppMax + Number(curr.moraCppMax || 0), moraCppActual: acc.moraCppActual + Number(curr.moraCppActual || 0),
      moraDefMax: acc.moraDefMax + Number(curr.moraDefMax || 0), moraDefActual: acc.moraDefActual + Number(curr.moraDefActual || 0), plazoTotal: acc.plazoTotal + Number(curr.plazo || 0),
    }), { crecimientoNeto150: 0, amountAchieved: 0, repagos: 0, tea: 0, opAchieved: 0, sociosInicio: 0, sociosActual: 0, cartera: 0, moraCppMax: 0, moraCppActual: 0, moraDefMax: 0, moraDefActual: 0, plazoTotal: 0 });

    const count = comercialFiltered.length;
    return { ...acc, tea: count > 0 ? acc.tea / count : 0, plazoPromedio: count > 0 ? acc.plazoTotal / count : 0, pctMoraCpp: acc.cartera > 0 ? (acc.moraCppActual / acc.cartera) * 100 : 0 };
  }, [comercialFiltered]);

  const totalesRec = useMemo(() => {
    return recuperacionFiltered.reduce((acc: any, curr: any) => ({
      crecimientoNeto150: acc.crecimientoNeto150 + Number(curr.crecimientoNeto150 || 0), repagos: acc.repagos + Number(curr.repagos || 0), carteraInicio: acc.carteraInicio + Number(curr.carteraInicio || 0),
      moraCppMax: acc.moraCppMax + Number(curr.moraCppMax || 0), moraCppActual: acc.moraCppActual + Number(curr.moraCppActual || 0), moraDefMax: acc.moraDefMax + Number(curr.moraDefMax || 0), moraDefActual: acc.moraDefActual + Number(curr.moraDefActual || 0),
    }), { crecimientoNeto150: 0, repagos: 0, carteraInicio: 0, moraCppMax: 0, moraCppActual: 0, moraDefMax: 0, moraDefActual: 0 });
  }, [recuperacionFiltered]);

  // Funciones de formato movidas hacia arriba (son seguras de ejecutar siempre)
  const fmtMoney = (val: number) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 }).format(Number(val || 0));
  const fmtNum = (val: number) => new Intl.NumberFormat('es-PE').format(Number(val || 0));
  const fmtDec = (val: number) => Number(val || 0).toFixed(2);
  const fmtPct = (val: number) => Number(val || 0).toFixed(2) + '%';

  const renderWithShare = (val: number, globalVal: number, isCurrency = true) => {
    const safeVal = Number(val || 0); const safeGlobal = Number(globalVal || 0);
    if (filters.advisor === 'Todos' || safeGlobal === 0) return isCurrency ? fmtMoney(safeVal) : fmtNum(safeVal);
    return `${isCurrency ? fmtMoney(safeVal) : fmtNum(safeVal)} (${Number((safeVal / safeGlobal) * 100 || 0).toFixed(1)}%)`;
  };

  const totCrecNeto1 = totales.crecimientoNeto150 + (filters.advisor === 'Todos' ? totalesRec.crecimientoNeto150 : 0);
  const totRepagos1 = totales.repagos + (filters.advisor === 'Todos' ? totalesRec.repagos : 0);
  const totMoraCppMax1 = totales.moraCppMax + (filters.advisor === 'Todos' ? totalesRec.moraCppMax : 0);
  const totMoraCppAct1 = totales.moraCppActual + (filters.advisor === 'Todos' ? totalesRec.moraCppActual : 0);
  const totMoraDefMax1 = totales.moraDefMax + (filters.advisor === 'Todos' ? totalesRec.moraDefMax : 0);
  const totMoraDefAct1 = totales.moraDefActual + (filters.advisor === 'Todos' ? totalesRec.moraDefActual : 0);

  const dataT1 = [{
    agencia: filters.agency === 'Todas' ? 'TODA LA RED' : filters.agency,
    crecNeto: totCrecNeto1, colocacion: totales.amountAchieved, repagos: totRepagos1,
    tea: totales.tea, opAchieved: totales.opAchieved, sociosInicio: totales.sociosInicio,
    sociosActual: totales.sociosActual, cartera: totales.cartera, moraCppMax: totMoraCppMax1,
    moraCppActual: totMoraCppAct1, moraDefMax: totMoraDefMax1, moraDefActual: totMoraDefAct1
  }];

  const defT1 = [
    Col('agencia', 'Agencia', r => <span className="font-bold">{r.agencia}</span>, r => r.agencia, () => null, 'left'),
    Col('crecNeto', 'Crecimiento Neto 150', r => <span className={`font-mono ${r.crecNeto >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{renderWithShare(r.crecNeto, totalesAgenciaGlobal.crecimientoNeto150)}</span>, r => r.crecNeto, () => null),
    Col('colocacion', 'Colocación', r => <span className="font-mono">{renderWithShare(r.colocacion, totalesAgenciaGlobal.amountAchieved)}</span>, r => r.colocacion, () => null),
    Col('repagos', 'Repagos', r => <span className="font-mono">{renderWithShare(r.repagos, totalesAgenciaGlobal.repagos)}</span>, r => r.repagos, () => null),
    Col('tea', 'TEA', r => <span className="font-mono">{fmtDec(r.tea)}</span>, r => r.tea, () => null),
    Col('nroOpe', 'Nro Ope', r => <span className="font-mono">{renderWithShare(r.opAchieved, totalesAgenciaGlobal.opAchieved, false)}</span>, r => r.opAchieved, () => null),
    Col('socInicio', 'Nro Socios Inicio', r => <span className="font-mono">{fmtNum(r.sociosInicio)}</span>, r => r.sociosInicio, () => null, 'right', 'bg-amber-500/20'),
    Col('socActual', 'Nro Socios', r => <span className={`font-mono ${r.sociosActual < r.sociosInicio ? 'text-rose-600' : 'text-emerald-600'}`}>{renderWithShare(r.sociosActual, totalesAgenciaGlobal.sociosActual, false)}</span>, r => r.sociosActual, () => null),
    Col('cartera', 'Cartera', r => <span className="font-mono">{renderWithShare(r.cartera, totalesAgenciaGlobal.cartera)}</span>, r => r.cartera, () => null),
    Col('cppMax', 'Mora CPP Maximo', r => <span className="font-mono">{fmtMoney(r.moraCppMax)}</span>, r => r.moraCppMax, () => null, 'right', 'bg-amber-500/10'),
    Col('cppAct', 'Mora CPP Actual', r => <span className={`font-mono ${r.moraCppActual > r.moraCppMax ? 'text-rose-600 font-bold' : 'text-emerald-600'}`}>{fmtMoney(r.moraCppActual)}</span>, r => r.moraCppActual, () => null, 'right', 'bg-amber-500/10'),
    Col('defMax', 'Mora Def. Maximo', r => <span className="font-mono">{fmtMoney(r.moraDefMax)}</span>, r => r.moraDefMax, () => null, 'right', 'bg-rose-500/10'),
    Col('defAct', 'Mora Def. Actual', r => <span className={`font-mono ${r.moraDefActual > r.moraDefMax ? 'text-rose-600 font-bold' : 'text-emerald-600'}`}>{fmtMoney(r.moraDefActual)}</span>, r => r.moraDefActual, () => null, 'right', 'bg-rose-500/10')
  ];

  const defT2 = [
    Col('asesor', 'Asesor', r => <span className="font-medium">{r.asesor}</span>, r => r.asesor, () => 'Total Comercial', 'left'),
    Col('crecNeto', 'Crec. Neto 150', r => <span className={`font-mono ${r.crecimientoNeto150 >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtMoney(r.crecimientoNeto150)}</span>, r => r.crecimientoNeto150, () => <span className={`font-mono ${totales.crecimientoNeto150 >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtMoney(totales.crecimientoNeto150)}</span>),
    Col('colocacion', 'Colocación', r => <span className="font-mono">{fmtMoney(r.amountAchieved)}</span>, r => r.amountAchieved, () => <span className="font-mono">{fmtMoney(totales.amountAchieved)}</span>),
    Col('repagos', 'Repagos', r => <span className="font-mono">{fmtMoney(r.repagos)}</span>, r => r.repagos, () => <span className="font-mono">{fmtMoney(totales.repagos)}</span>),
    Col('tea', 'TEA', r => <span className="font-mono">{fmtDec(r.tea)}</span>, r => r.tea, () => <span className="font-mono">{fmtDec(totales.tea)}</span>),
    Col('nroOpe', 'Nro Ope', r => <span className={`font-mono ${r.opAchieved < 15 ? 'text-rose-600' : ''}`}>{fmtNum(r.opAchieved)}</span>, r => r.opAchieved, () => <span className="font-mono">{fmtNum(totales.opAchieved)}</span>),
    Col('plazo', 'Plazo', r => <span className={`font-mono ${r.plazo < 6 ? 'text-rose-600' : 'text-emerald-600'}`}>{fmtDec(r.plazo)}</span>, r => r.plazo, () => <span className="font-mono">{fmtDec(totales.plazoPromedio)}</span>),
    Col('socInicio', 'Nro Soc. Inicio', r => <span className="font-mono">{fmtNum(r.sociosInicio)}</span>, r => r.sociosInicio, () => <span className="font-mono">{fmtNum(totales.sociosInicio)}</span>),
    Col('socActual', 'Nro Socios', r => <span className={`font-mono ${r.sociosActual < r.sociosInicio ? 'text-rose-600' : 'text-emerald-600'}`}>{fmtNum(r.sociosActual)}</span>, r => r.sociosActual, () => <span className="font-mono">{fmtNum(totales.sociosActual)}</span>),
    Col('cartera', 'Cartera', r => <span className="font-mono">{fmtMoney(r.cartera)}</span>, r => r.cartera, () => <span className="font-mono">{fmtMoney(totales.cartera)}</span>),
    Col('cppMax', 'Mora CPP Max', r => <span className="font-mono">{fmtMoney(r.moraCppMax)}</span>, r => r.moraCppMax, () => <span className="font-mono">{fmtMoney(totales.moraCppMax)}</span>, 'right', 'bg-amber-500/10'),
    Col('cppAct', 'Mora Piso Actual', r => <span className={`font-mono ${r.moraCppActual > r.moraCppMax ? 'text-rose-600' : 'text-emerald-600'}`}>{fmtMoney(r.moraCppActual)}</span>, r => r.moraCppActual, () => <span className="font-mono">{fmtMoney(totales.moraCppActual)}</span>, 'right', 'bg-amber-500/10'),
    Col('pctCpp', '% Mora Piso', r => <span className="font-mono">{fmtPct(r.pctMoraCpp)}</span>, r => r.pctMoraCpp / 100, () => <span className="font-mono">{fmtPct(totales.pctMoraCpp)}</span>),
    Col('defMax', 'Mora Def. Max', r => <span className="font-mono">{fmtMoney(r.moraDefMax)}</span>, r => r.moraDefMax, () => <span className="font-mono">{fmtMoney(totales.moraDefMax)}</span>, 'right', 'bg-rose-500/10'),
    Col('defAct', 'Mora Def. Actual', r => <span className={`font-mono ${r.moraDefActual > r.moraDefMax ? 'text-rose-600' : 'text-emerald-600'}`}>{fmtMoney(r.moraDefActual)}</span>, r => r.moraDefActual, () => <span className="font-mono">{fmtMoney(totales.moraDefActual)}</span>, 'right', 'bg-rose-500/10')
  ];

  const defT3 = [
    Col('recuperador', 'Recuperador', r => <span className="font-medium">{r.recuperador}</span>, r => r.recuperador, () => 'Total Recuperación', 'left'),
    Col('crecNeto', 'Crec. Neto 150', r => <span className={`font-mono ${r.crecimientoNeto150 >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtMoney(r.crecimientoNeto150)}</span>, r => r.crecimientoNeto150, () => <span className={`font-mono ${totalesRec.crecimientoNeto150 >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtMoney(totalesRec.crecimientoNeto150)}</span>),
    Col('repagos', 'Repagos', r => <span className="font-mono">{fmtMoney(r.repagos)}</span>, r => r.repagos, () => <span className="font-mono">{fmtMoney(totalesRec.repagos)}</span>),
    Col('carteraInicio', 'Cartera de Inicio', r => <span className="font-mono">{fmtMoney(r.carteraInicio)}</span>, r => r.carteraInicio, () => <span className="font-mono">{fmtMoney(totalesRec.carteraInicio)}</span>),
    Col('cppMax', 'Mora CPP Maximo', r => <span className="font-mono">{fmtMoney(r.moraCppMax)}</span>, r => r.moraCppMax, () => <span className="font-mono">{fmtMoney(totalesRec.moraCppMax)}</span>, 'right', 'bg-amber-500/10'),
    Col('cppAct', 'Mora CPP Actual', r => <span className={`font-mono ${r.moraCppActual > r.moraCppMax ? 'text-rose-600' : 'text-emerald-600'}`}>{fmtMoney(r.moraCppActual)}</span>, r => r.moraCppActual, () => <span className="font-mono">{fmtMoney(totalesRec.moraCppActual)}</span>, 'right', 'bg-amber-500/10'),
    Col('defMax', 'Mora Def. Maximo', r => <span className="font-mono">{fmtMoney(r.moraDefMax)}</span>, r => r.moraDefMax, () => <span className="font-mono">{fmtMoney(totalesRec.moraDefMax)}</span>, 'right', 'bg-rose-500/10'),
    Col('defAct', 'Mora Def. Actual', r => <span className={`font-mono ${r.moraDefActual > r.moraDefMax ? 'text-rose-600' : 'text-emerald-600'}`}>{fmtMoney(r.moraDefActual)}</span>, r => r.moraDefActual, () => <span className="font-mono">{fmtMoney(totalesRec.moraDefActual)}</span>, 'right', 'bg-rose-500/10')
  ];

  // ==========================================
  // AQUÍ ESTÁN LOS HOOKS (Antes del return anticipado)
  // ==========================================
  const t1 = useColumnOrder(defT1.map(c => c.id), 't1', 'agencia');
  const t2 = useColumnOrder(defT2.map(c => c.id), 't2', 'asesor');
  const t3 = useColumnOrder(defT3.map(c => c.id), 't3', 'recuperador');

  // ==========================================
  // RETORNOS DE CARGA / ERROR 
  // ==========================================
  if (isLoading) return <div className="h-96 animate-pulse rounded-xl bg-muted/50"></div>;
  if (isError || !data) return <div className="text-destructive font-semibold">Error al cargar la información de la agencia.</div>;

  const exportar = (tablaId: 't1'|'t2'|'t3', formato: 'excel' | 'clipboard') => {
    let rawCols: any[] = []; let rowsData: any[] = []; let filename = '';
    if (tablaId === 't1') { rawCols = t1.order.map(id => defT1.find(c => c.id === id)!); rowsData = dataT1; filename = 'Agencia_Completa'; }
    if (tablaId === 't2') { rawCols = t2.order.map(id => defT2.find(c => c.id === id)!); rowsData = comercialFiltered; filename = 'Agencia_Comercial'; }
    if (tablaId === 't3') { rawCols = t3.order.map(id => defT3.find(c => c.id === id)!); rowsData = recuperacionFiltered; filename = 'Agencia_Recuperacion'; }

    const headers = rawCols.map(c => c.header);
    const rows = rowsData.map((r:any) => rawCols.map(col => col.raw(r)));

    if (formato === 'clipboard') {
      const contenido = [headers.join('\t'), ...rows.map(row => row.map(val => (typeof val === 'number' && val % 1 !== 0) ? val.toFixed(4) : val).join('\t'))].join('\n');
      navigator.clipboard.writeText(contenido).then(() => alert('✅ Datos copiados. Ya puedes pegarlos en Excel o Word.'));
    } else {
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
      XLSX.writeFile(workbook, `${filename}_${filters.period}.xlsx`);
    }
  };

  const containerClass = `pb-0 overflow-x-auto ${filters.agency === 'Todas' ? 'max-h-[420px] overflow-y-auto' : ''}`;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <WorkdayStrip periodo={filters.period} />

      {/* 1. AGENCIA COMPLETA (Fila Resumen) */}
      <Panel title={filters.advisor !== 'Todos' ? `Agencia Completa · Aporte de ${filters.advisor}` : "Agencia Completa: Comercial + Recuperador"} icon={Building2} action={<ExportActions control={t1} onExport={(f) => exportar('t1', f)} />}>
        <DraggableTable control={t1} columns={t1.order.map(id => defT1.find(c => c.id === id)!)} data={dataT1} containerClass="overflow-x-auto pb-4" showFooter={false} />
      </Panel>

      {/* 2. AGENCIA COMERCIAL */}
      <Panel title="Agencia - Parte Comercial" subtitle="Desempeño individual por Asesor" icon={Users} action={<ExportActions control={t2} onExport={(f) => exportar('t2', f)} />}>
        <DraggableTable control={t2} columns={t2.order.map(id => defT2.find(c => c.id === id)!)} data={comercialFiltered} containerClass={containerClass} />
      </Panel>

      {/* 3. AGENCIA RECUPERACIÓN */}
      {filters.advisor === 'Todos' && (
        <Panel title="Agencia - Parte Recuperación" icon={ShieldAlert} action={<ExportActions control={t3} onExport={(f) => exportar('t3', f)} />}>
          <DraggableTable control={t3} columns={t3.order.map(id => defT3.find(c => c.id === id)!)} data={recuperacionFiltered} containerClass="overflow-x-auto pb-4" />
        </Panel>
      )}
    </div>
  );
}