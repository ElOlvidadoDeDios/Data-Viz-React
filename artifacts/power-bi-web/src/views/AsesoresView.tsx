//AsesoresView.tsx

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { Filters } from '../utils/constants';
import { money, number } from '../utils/formatters';
import { LoadingState } from '../components/ui/LoadingState';
import { SectionBand } from '../components/ui/SectionBand';
import { Panel } from '../components/ui/Panel';
import { WorkdayStrip } from '../components/WorkdayStrip';
import { Users, Clock3, ShieldAlert, RefreshCw, Copy, Download } from 'lucide-react';

// ============================================================================
// HOOKS Y COMPONENTES MAESTROS (DRAG & DROP / EXPORTACIÓN)
// ============================================================================
function useColumnOrder(initialOrder: string[], tableId: string, lockedCol: string = 'asesor') {
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

function DraggableTable({ control, columns, data, containerClass }: { control: any, columns: any[], data: any[], containerClass: string }) {
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
          {data.map((row: any, i: number) => (
            <tr key={`${row.asesor || i}`} className="hover:bg-muted/30 transition-colors">
              {columns.map(col => (
                <td key={`${i}-${col.id}`} className={`px-3 py-2.5 ${col.align === 'left' ? 'text-left' : 'text-right'} ${col.bgClass || ''}`}>
                  {col.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot className="sticky bottom-0 z-10 bg-card shadow-[0_-1px_2px_rgba(0,0,0,0.05)]">
          <tr className="border-t-2 border-border font-bold">
            {columns.map(col => (
              <td key={`foot-${col.id}`} className={`px-3 py-2.5 ${col.align === 'left' ? 'text-left' : 'text-right'} ${col.bgClass || ''}`}>
                {col.footer()}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// Fabrica de Columnas (DRY)
const Col = (id: string, header: string, cell: (r:any)=>any, raw: (r:any)=>any, footer: ()=>any, align='right', bgClass='') => ({ id, header, cell, raw, footer, align, bgClass });

// ============================================================================
// VISTA PRINCIPAL DE ASESORES
// ============================================================================
export function AsesoresView({ filters }: { filters: Filters }) {
  const { data: asesoresBD, isLoading: loadAsesores, error: errAsesores } = useQuery({
    queryKey: ['indicadores-asesores', filters.period],
    queryFn: async () => {
      const res = await fetch(`http://localhost:3000/api/asesores/${filters.period}`);
      if (!res.ok) throw new Error('Error al cargar asesores');
      return res.json();
    },
    enabled: !!filters.period && filters.period !== 'Cargando...'
  });

  const { data: diasBD, isLoading: loadDias } = useQuery({
    queryKey: ['dias-laborales', filters.period],
    queryFn: async () => {
      const res = await fetch(`http://localhost:3000/api/dias-laborales/${filters.period}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!filters.period && filters.period !== 'Cargando...'
  });

  const datosProyectados = useMemo(() => {
    if (!asesoresBD) return [];
    const dataDias = Array.isArray(diasBD) ? diasBD[0] : (diasBD || {});
    const transcurridos = Math.max(1, Number(dataDias.transcurridos) || 12);
    const restantes = Number(dataDias.restantes) || 13;

    let datosFiltrados = filters.agency === 'Todas' ? asesoresBD : asesoresBD.filter((r: any) => r.agency === filters.agency);
    if (filters.advisor !== 'Todos') datosFiltrados = datosFiltrados.filter((r: any) => r.asesor === filters.advisor);

    return datosFiltrados.map((row: any) => {
      const logrado = Number(row.opAchieved || 0);
      const productividad = transcurridos > 0 ? (logrado / transcurridos) : 0;
      return { ...row, opProjection: logrado + Math.round(productividad * restantes) };
    });
  }, [asesoresBD, diasBD, filters.agency, filters.advisor]);

  const totales = useMemo(() => {
    const sum = (key: string) => datosProyectados.reduce((acc: number, curr: any) => acc + Number(curr[key] || 0), 0);
    const avg = (key: string) => datosProyectados.length > 0 ? sum(key) / datosProyectados.length : 0;
    const cartera = sum('cartera');
    const carteraInicio = sum('carteraInicio');

    return {
      cartera, carteraInicio, desembolsos: sum('desembolsos'), repagos: sum('repagos'),
      crecimientoBruto: sum('crecimientoBruto'), mora150: sum('mora150'), pctMora150: cartera > 0 ? (sum('mora150') / cartera) * 100 : 0,
      crecimientoNeto150: sum('crecimientoNeto150'), faltante20k: sum('faltante20k'), opAchieved: sum('opAchieved'), opProjection: sum('opProjection'),
      duracion: avg('duracion'), sociosInicio: sum('sociosInicio'), sociosActual: sum('sociosActual'), sociosNuevos: sum('sociosNuevos'),
      moraCppActual: sum('moraCppActual'), pctMoraCpp: carteraInicio > 0 ? (sum('moraCppActual') / carteraInicio) * 100 : 0, metaMoraCpp: avg('metaMoraCpp'),
      excedentePctCpp: avg('excedentePctCpp'), excedenteSolesCpp: sum('excedenteSolesCpp'), moraDefActual: sum('moraDefActual'),
      pctMoraDef: carteraInicio > 0 ? (sum('moraDefActual') / carteraInicio) * 100 : 0, metaMoraDef: avg('metaMoraDef'),
      excedentePctDef: avg('excedentePctDef'), excedenteSolesDef: sum('excedenteSolesDef')
    };
  }, [datosProyectados]);

  // Funciones de color estandarizadas
  const getCrecNetoColor = (val: number) => val >= 20000 ? 'text-emerald-600 font-bold' : val >= 0 ? 'text-amber-600 font-bold' : 'text-rose-600 font-bold';
  const getFaltanteColor = (val: number) => val <= 0 ? 'text-emerald-600 font-bold' : val <= 20000 ? 'text-amber-600 font-bold' : 'text-rose-600 font-bold';
  const getOpColor = (val: number) => val >= 27 ? 'text-emerald-600 font-bold' : val >= 20 ? 'text-amber-600 font-bold' : 'text-rose-600 font-bold';
  const getDurColor = (val: number) => val >= 6 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold';
  const getSocColor = (val: number) => val > 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold';
  const getExcColor = (val: number) => val <= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold';

  // 🚀 DICCIONARIO MAESTRO DE COLUMNAS (Para Reutilizar en las 7 Tablas)
  const dict: Record<string, any> = {
    asesor: Col('asesor', 'Asesor', r => <span className="font-medium truncate max-w-[150px] block" title={r.asesor}>{r.asesor}</span>, r => r.asesor, () => 'Total', 'left'),
    asesorT3: Col('asesorT3', 'Asesor', r => <span className="font-medium truncate max-w-[150px] block" title={r.asesor}>{r.asesor}</span>, r => r.asesor, () => 'Promedio Ponderado', 'left'),
    asesorT7: Col('asesorT7', 'Asesor', r => <span className="font-medium truncate max-w-[150px] block" title={r.asesor}>{r.asesor}</span>, r => r.asesor, () => 'Total General', 'left'),
    
    cartera: Col('cartera', 'Cartera', r => <span className="font-mono">{money(r.cartera)}</span>, r => r.cartera, () => <span className="font-mono">{money(totales.cartera)}</span>),
    desembolsos: Col('desembolsos', 'Desembolsos', r => <span className="font-mono">{money(r.desembolsos)}</span>, r => r.desembolsos, () => <span className="font-mono">{money(totales.desembolsos)}</span>),
    repagos: Col('repagos', 'Repagos', r => <span className="font-mono">{money(r.repagos)}</span>, r => r.repagos, () => <span className="font-mono">{money(totales.repagos)}</span>),
    crecimientoBruto: Col('crecimientoBruto', 'Crecimiento', r => <span className="font-mono">{money(r.crecimientoBruto)}</span>, r => r.crecimientoBruto, () => <span className="font-mono">{money(totales.crecimientoBruto)}</span>),
    mora150: Col('mora150', 'Mora 150', r => <span className="font-mono">{money(r.mora150)}</span>, r => r.mora150, () => <span className="font-mono">{money(totales.mora150)}</span>),
    pctMora150: Col('pctMora150', '% Mora150', r => <span className="font-mono">{Number(r.pctMora150).toFixed(2)}%</span>, r => r.pctMora150 / 100, () => <span className="font-mono">{totales.pctMora150.toFixed(2)}%</span>),
    crecNeto150: Col('crecNeto150', 'Crec. Neto 150', r => <span className={`font-mono ${getCrecNetoColor(r.crecimientoNeto150)}`}>{money(r.crecimientoNeto150)}</span>, r => r.crecimientoNeto150, () => <span className={`font-mono ${getCrecNetoColor(totales.crecimientoNeto150)}`}>{money(totales.crecimientoNeto150)}</span>, 'right', 'bg-emerald-500/10'),
    faltante20k: Col('faltante20k', 'Faltante S/20K', r => <span className={`font-mono ${getFaltanteColor(r.faltante20k)}`}>{money(r.faltante20k)}</span>, r => r.faltante20k, () => <span className={`font-mono ${getFaltanteColor(totales.faltante20k)}`}>{money(totales.faltante20k)}</span>, 'right', 'bg-amber-500/10'),

    opAchieved: Col('opAchieved', 'A la Fecha', r => <span className={`font-mono ${getOpColor(r.opAchieved)}`}>{r.opAchieved}</span>, r => r.opAchieved, () => <span className="font-mono">{totales.opAchieved}</span>),
    opProjection: Col('opProjection', 'Proyección', r => <span className={`font-mono ${getOpColor(r.opProjection)}`}>{r.opProjection}</span>, r => r.opProjection, () => <span className="font-mono">{totales.opProjection}</span>),
    duracion: Col('duracion', 'Duración', r => <span className={`font-mono ${getDurColor(r.duracion)}`}>{Number(r.duracion).toFixed(2)}</span>, r => r.duracion, () => <span className="font-mono">{totales.duracion.toFixed(2)}</span>),

    sociosInicio: Col('sociosInicio', 'Inicio', r => <span className="font-mono">{r.sociosInicio}</span>, r => r.sociosInicio, () => <span className="font-mono">{totales.sociosInicio}</span>),
    sociosActual: Col('sociosActual', 'Actual', r => <span className="font-mono">{r.sociosActual}</span>, r => r.sociosActual, () => <span className="font-mono">{totales.sociosActual}</span>),
    sociosNuevos: Col('sociosNuevos', 'Nuevos', r => <span className={`font-mono ${getSocColor(r.sociosNuevos)}`}>{r.sociosNuevos}</span>, r => r.sociosNuevos, () => <span className="font-mono">{totales.sociosNuevos}</span>),

    carteraInicio: Col('carteraInicio', 'Cartera Inicio', r => <span className="font-mono">{money(r.carteraInicio)}</span>, r => r.carteraInicio, () => <span className="font-mono">{money(totales.carteraInicio)}</span>),
    moraCppActual: Col('moraCppActual', 'Mora S/', r => <span className="font-mono">{money(r.moraCppActual)}</span>, r => r.moraCppActual, () => <span className="font-mono">{money(totales.moraCppActual)}</span>),
    pctMoraCpp: Col('pctMoraCpp', 'Mora %', r => <span className="font-mono">{Number(r.pctMoraCpp).toFixed(2)}%</span>, r => r.pctMoraCpp / 100, () => <span className="font-mono">{totales.pctMoraCpp.toFixed(2)}%</span>),
    metaMoraCpp: Col('metaMoraCpp', 'Meta %', r => <span className="font-mono text-muted-foreground">{Number(r.metaMoraCpp).toFixed(2)}%</span>, r => r.metaMoraCpp / 100, () => <span className="font-mono text-muted-foreground">{totales.metaMoraCpp.toFixed(2)}%</span>),
    excedentePctCpp: Col('excedentePctCpp', 'Excedente %', r => <span className={`font-mono ${getExcColor(r.excedentePctCpp)}`}>{Number(r.excedentePctCpp).toFixed(2)}%</span>, r => r.excedentePctCpp / 100, () => <span className={`font-mono ${getExcColor(totales.excedentePctCpp)}`}>{totales.excedentePctCpp.toFixed(2)}%</span>),
    excedenteSolesCpp: Col('excedenteSolesCpp', 'Excedente S/', r => <span className={`font-mono ${getExcColor(r.excedenteSolesCpp)}`}>{money(r.excedenteSolesCpp)}</span>, r => r.excedenteSolesCpp, () => <span className={`font-mono ${getExcColor(totales.excedenteSolesCpp)}`}>{money(totales.excedenteSolesCpp)}</span>),

    moraDefActual: Col('moraDefActual', 'Mora S/', r => <span className="font-mono">{money(r.moraDefActual)}</span>, r => r.moraDefActual, () => <span className="font-mono">{money(totales.moraDefActual)}</span>),
    pctMoraDef: Col('pctMoraDef', 'Mora %', r => <span className="font-mono">{Number(r.pctMoraDef).toFixed(2)}%</span>, r => r.pctMoraDef / 100, () => <span className="font-mono">{totales.pctMoraDef.toFixed(2)}%</span>),
    metaMoraDef: Col('metaMoraDef', 'Meta %', r => <span className="font-mono text-muted-foreground">{Number(r.metaMoraDef).toFixed(2)}%</span>, r => r.metaMoraDef / 100, () => <span className="font-mono text-muted-foreground">{totales.metaMoraDef.toFixed(2)}%</span>),
    excedentePctDef: Col('excedentePctDef', 'Excedente %', r => <span className={`font-mono ${getExcColor(r.excedentePctDef)}`}>{Number(r.excedentePctDef).toFixed(2)}%</span>, r => r.excedentePctDef / 100, () => <span className={`font-mono ${getExcColor(totales.excedentePctDef)}`}>{totales.excedentePctDef.toFixed(2)}%</span>),
    excedenteSolesDef: Col('excedenteSolesDef', 'Excedente S/', r => <span className={`font-mono ${getExcColor(r.excedenteSolesDef)}`}>{money(r.excedenteSolesDef)}</span>, r => r.excedenteSolesDef, () => <span className={`font-mono ${getExcColor(totales.excedenteSolesDef)}`}>{money(totales.excedenteSolesDef)}</span>),

    // Alias para Tabla 7 (Resumen de Bonos)
    blankDuracion: Col('blankDuracion', 'Duración (Candado)', r => <span className={`font-mono ${getDurColor(r.duracion)}`}>{Number(r.duracion).toFixed(2)}</span>, r => r.duracion, () => ''),
    blankCartera: Col('blankCartera', 'Cartera (Cond. Adicional)', r => <span className="font-mono">{money(r.cartera)}</span>, r => r.cartera, () => ''),
    blankOpAchieved: Col('blankOpAchieved', 'Nro Oper (Bono Base)', r => <span className={`font-mono ${getOpColor(r.opAchieved)}`}>{r.opAchieved}</span>, r => r.opAchieved, () => ''),
    blankOpProjection: Col('blankOpProjection', 'Nro Oper Proyección', r => <span className={`font-mono ${getOpColor(r.opProjection)}`}>{r.opProjection}</span>, r => r.opProjection, () => ''),
    crecNeto150_T7: Col('crecNeto150_T7', 'Crec. Neto 150 (Mult.)', r => <span className={`font-mono ${getCrecNetoColor(r.crecimientoNeto150)}`}>{money(r.crecimientoNeto150)}</span>, r => r.crecimientoNeto150, () => <span className={`font-mono ${getCrecNetoColor(totales.crecimientoNeto150)}`}>{money(totales.crecimientoNeto150)}</span>),
    sociosNuevos_T7: Col('sociosNuevos_T7', 'Socios Nuevos (Mult.)', r => <span className={`font-mono ${getSocColor(r.sociosNuevos)}`}>{r.sociosNuevos}</span>, r => r.sociosNuevos, () => <span className="font-mono">{totales.sociosNuevos}</span>),
    excSolesCpp_T7: Col('excSolesCpp_T7', 'Mora CPP (Mult.)', r => <span className={`font-mono ${getExcColor(r.excedenteSolesCpp)}`}>{money(r.excedenteSolesCpp)}</span>, r => r.excedenteSolesCpp, () => <span className={`font-mono ${getExcColor(totales.excedenteSolesCpp)}`}>{money(totales.excedenteSolesCpp)}</span>),
    excSolesDef_T7: Col('excSolesDef_T7', 'Mora Vencida (Mult.)', r => <span className={`font-mono ${getExcColor(r.excedenteSolesDef)}`}>{money(r.excedenteSolesDef)}</span>, r => r.excedenteSolesDef, () => <span className={`font-mono ${getExcColor(totales.excedenteSolesDef)}`}>{money(totales.excedenteSolesDef)}</span>),
  };

  // Instancias de Configuración por Tabla
  const t1 = useColumnOrder(['asesor', 'cartera', 'desembolsos', 'repagos', 'crecimientoBruto', 'mora150', 'pctMora150', 'crecNeto150', 'faltante20k'], 't1', 'asesor');
  const t2 = useColumnOrder(['asesor', 'opAchieved', 'opProjection'], 't2', 'asesor');
  const t3 = useColumnOrder(['asesorT3', 'duracion'], 't3', 'asesorT3');
  const t4 = useColumnOrder(['asesor', 'sociosInicio', 'sociosActual', 'sociosNuevos'], 't4', 'asesor');
  const t5 = useColumnOrder(['asesor', 'carteraInicio', 'moraCppActual', 'pctMoraCpp', 'metaMoraCpp', 'excedentePctCpp', 'excedenteSolesCpp'], 't5', 'asesor');
  const t6 = useColumnOrder(['asesor', 'carteraInicio', 'moraDefActual', 'pctMoraDef', 'metaMoraDef', 'excedentePctDef', 'excedenteSolesDef'], 't6', 'asesor');
  const t7 = useColumnOrder(['asesorT7', 'blankDuracion', 'blankCartera', 'blankOpAchieved', 'blankOpProjection', 'crecNeto150_T7', 'sociosNuevos_T7', 'excSolesCpp_T7', 'excSolesDef_T7'], 't7', 'asesorT7');

  // ==========================================
  // RETORNOS DE CARGA / ERROR (MOVIDOS AQUÍ)
  // ==========================================
  if (loadAsesores || loadDias || !asesoresBD) return <LoadingState />;
  if (errAsesores) return <div className="p-5 text-destructive font-semibold border border-destructive/20 bg-destructive/10 rounded-xl">Error de conexión al DWH.</div>;

  const exportar = (columnKeys: string[], filename: string, formato: 'excel' | 'clipboard') => {
    const cols = columnKeys.map(k => dict[k]);
    const headers = cols.map(c => c.header);
    const rows = datosProyectados.map((r:any) => cols.map(col => col.raw(r)));
    if (formato === 'clipboard') {
      const contenido = [headers.join('\t'), ...rows.map(row => row.map(val => (typeof val === 'number' && val % 1 !== 0) ? val.toFixed(4) : val).join('\t'))].join('\n');
      navigator.clipboard.writeText(contenido).then(() => alert('✅ Datos copiados al portapapeles.'));
    } else {
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
      XLSX.writeFile(workbook, `${filename}_${filters.period}.xlsx`);
    }
  };

  const containerClass = `pb-0 overflow-x-auto ${filters.agency === 'Todas' ? 'max-h-[500px] overflow-y-auto' : ''}`;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <WorkdayStrip periodo={filters.period} />

      {/* 1. CARTERA COMERCIAL */}
      <SectionBand tone="green">CARTERA COMERCIAL</SectionBand>
      <Panel title="Indicadores de Bonificación" icon={Users} eyebrow="Cartera y Crecimiento Neto 150" action={<ExportActions control={t1} onExport={(f) => exportar(t1.order, 'Cartera_Comercial', f)} />}>
        <DraggableTable control={t1} columns={t1.order.map(k => dict[k])} data={datosProyectados} containerClass={containerClass} />
      </Panel>

      {/* 2. TABLAS SECUNDARIAS */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title="Operaciones" icon={Users} action={<ExportActions control={t2} onExport={(f) => exportar(t2.order, 'Operaciones', f)} />}>
          <DraggableTable control={t2} columns={t2.order.map(k => dict[k])} data={datosProyectados} containerClass={containerClass} />
        </Panel>

        <Panel title="Duración" icon={Clock3} action={<ExportActions control={t3} onExport={(f) => exportar(t3.order, 'Duracion', f)} />}>
          <DraggableTable control={t3} columns={t3.order.map(k => dict[k])} data={datosProyectados} containerClass={containerClass} />
        </Panel>

        <Panel title="Número de Socios" icon={Users} action={<ExportActions control={t4} onExport={(f) => exportar(t4.order, 'Socios', f)} />}>
          <DraggableTable control={t4} columns={t4.order.map(k => dict[k])} data={datosProyectados} containerClass={containerClass} />
        </Panel>
      </div>

      {/* 3. MORA CPP Y MORA VENCIDA */}
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Mora CPP" icon={ShieldAlert} action={<ExportActions control={t5} onExport={(f) => exportar(t5.order, 'Mora_CPP', f)} />}>
          <DraggableTable control={t5} columns={t5.order.map(k => dict[k])} data={datosProyectados} containerClass={containerClass} />
        </Panel>

        <Panel title="Mora Vencida" icon={ShieldAlert} action={<ExportActions control={t6} onExport={(f) => exportar(t6.order, 'Mora_Vencida', f)} />}>
          <DraggableTable control={t6} columns={t6.order.map(k => dict[k])} data={datosProyectados} containerClass={containerClass} />
        </Panel>
      </div>

      {/* 4. RESUMEN DE BONIFICACIÓN */}
      <SectionBand tone="blue">Resumen de Bonificación</SectionBand>
      <Panel title="Indicadores de Bonificación" icon={Users} eyebrow="Bonos condicionados a Candado y Multiplicadores" action={<ExportActions control={t7} onExport={(f) => exportar(t7.order, 'Resumen_Bonificacion', f)} />}>
        <DraggableTable control={t7} columns={t7.order.map(k => dict[k])} data={datosProyectados} containerClass={containerClass} />
      </Panel>
    </div>
  );
}