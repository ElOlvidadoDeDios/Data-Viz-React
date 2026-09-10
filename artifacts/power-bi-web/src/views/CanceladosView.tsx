//CanceladosView.tsx

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { RefreshCw, Copy, Download, SlidersHorizontal, Ban } from 'lucide-react';
import { money } from '../utils/formatters';
import { LoadingState } from '../components/ui/LoadingState';
import { Panel } from '../components/ui/Panel';

// ============================================================================
// HOOKS MAESTROS DE DRAG & DROP Y EXPORTACIÓN
// ============================================================================
function useColumnOrder(initialOrder: string[], tableId: string, lockedCol: string = 'agencia') {
  const [order, setOrder] = useState(initialOrder);
  const isModified = JSON.stringify(order) !== JSON.stringify(initialOrder);
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

export function CanceladosView({ dbFilters }: { dbFilters: any }) {
  // ==========================================
  // ZONA 1: TODOS LOS HOOKS (Incondicionales)
  // ==========================================
  const [agency, setAgency] = useState('Todas');
  const [advisor, setAdvisor] = useState('Todos');
  const [tipoCancelacion, setTipoCancelacion] = useState('Todas');
  const [frecuencia, setFrecuencia] = useState('Todas');

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

  const { data: canceladosData, isLoading, error } = useQuery({
    queryKey: ['cancelados', agency, advisor, tipoCancelacion, frecuencia],
    queryFn: async () => {
      const params = new URLSearchParams({
        agencia: agency !== 'Todas' ? agency : '',
        asesor: advisor !== 'Todos' ? advisor : '',
        tipo: tipoCancelacion !== 'Todas' ? tipoCancelacion : '',
        frecuencia: frecuencia !== 'Todas' ? frecuencia : ''
      });
      const res = await fetch(`http://localhost:3000/api/cancelados?${params}`);
      if (!res.ok) throw new Error('Error al cargar cancelados');
      return res.json();
    }
  });

  const COL_KEYS = ['agencia', 'fechaCancelacion', 'asesor', 'cuenta', 'socio', 'pagare', 'producto', 'tipoFrecuencia', 'prestamo', 'saldoCancelacion', 'fechaOtorgamiento', 'tipoCancelacion', 'diferenciaDias', 'celular1', 'celular2', 'telefonoFijo1', 'telefonoFijo2'];
  const cTable = useColumnOrder(COL_KEYS, 'cancelados', 'agencia');

  // ==========================================
  // ZONA 2: LÓGICA Y FUNCIONES
  // ==========================================
  const tableData = canceladosData || [];
  
  const t_prestamo = tableData.reduce((acc: number, r: any) => acc + (r.Prestamo || 0), 0);
  const t_saldo = tableData.reduce((acc: number, r: any) => acc + (r.SaldoCancelacion || 0), 0);

  const defCols = [
    { id: 'agencia', header: 'Agencia', align: 'left', cell: (r:any) => <span className="font-semibold">{r.Agencia}</span>, raw: (r:any) => r.Agencia, footer: () => `${tableData.length} Créditos` },
    { id: 'fechaCancelacion', header: 'Fecha Cancelación', align: 'left', cell: (r:any) => <span className="font-mono text-muted-foreground">{r.FechaCancelacion}</span>, raw: (r:any) => r.FechaCancelacion, footer: () => '' },
    { id: 'asesor', header: 'Asesor', align: 'left', cell: (r:any) => r.Asesor, raw: (r:any) => r.Asesor, footer: () => '' },
    { id: 'cuenta', header: 'Cuenta', align: 'left', cell: (r:any) => <span className="font-mono text-[10px]">{r.Cuenta}</span>, raw: (r:any) => r.Cuenta, footer: () => '' },
    { id: 'socio', header: 'Socio', align: 'left', cell: (r:any) => <span className="truncate max-w-[200px]" title={r.Socio}>{r.Socio}</span>, raw: (r:any) => r.Socio, footer: () => '' },
    { id: 'pagare', header: 'Pagaré', align: 'left', cell: (r:any) => <span className="font-mono text-[10px]">{r.Pagare}</span>, raw: (r:any) => r.Pagare, footer: () => '' },
    { id: 'producto', header: 'Producto', align: 'left', cell: (r:any) => <span className="text-[10px] uppercase text-muted-foreground">{r.Producto}</span>, raw: (r:any) => r.Producto, footer: () => '' },
    { id: 'tipoFrecuencia', header: 'Frecuencia', align: 'center', cell: (r:any) => <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-semibold">{r.TipoFrecuencia}</span>, raw: (r:any) => r.TipoFrecuencia, footer: () => '' },
    { id: 'prestamo', header: 'Préstamo S/', align: 'right', cell: (r:any) => <span className="font-mono">{money(r.Prestamo)}</span>, raw: (r:any) => r.Prestamo, footer: () => <span className="font-mono text-foreground">{money(t_prestamo)}</span> },
    { id: 'saldoCancelacion', header: 'Saldo Cancelación S/', align: 'right', cell: (r:any) => <span className="font-mono">{money(r.SaldoCancelacion)}</span>, raw: (r:any) => r.SaldoCancelacion, footer: () => <span className="font-mono text-foreground">{money(t_saldo)}</span> },
    { id: 'fechaOtorgamiento', header: 'Otorgamiento', align: 'left', cell: (r:any) => <span className="font-mono text-muted-foreground">{r.FechaOtorgamiento}</span>, raw: (r:any) => r.FechaOtorgamiento, footer: () => '' },
    { id: 'tipoCancelacion', header: 'Tipo Cancelación', align: 'center', cell: (r:any) => (
      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${r.TipoCancelacion === 'Cancelado con Anticipación' ? 'bg-emerald-500/20 text-emerald-700' : r.TipoCancelacion === 'Cancelado con Retraso' ? 'bg-rose-500/20 text-rose-700' : 'bg-blue-500/20 text-blue-700'}`}>
        {r.TipoCancelacion}
      </span>
    ), raw: (r:any) => r.TipoCancelacion, footer: () => '' },
    { id: 'diferenciaDias', header: 'Dif. Días', align: 'right', cell: (r:any) => <span className="font-mono font-bold">{r.DiferenciaDias}</span>, raw: (r:any) => r.DiferenciaDias, footer: () => '' },
    { id: 'celular1', header: 'Celular 1', align: 'left', cell: (r:any) => <span className="font-mono text-[10px]">{r.Celular1}</span>, raw: (r:any) => r.Celular1, footer: () => '' },
    { id: 'celular2', header: 'Celular 2', align: 'left', cell: (r:any) => <span className="font-mono text-[10px]">{r.Celular2}</span>, raw: (r:any) => r.Celular2, footer: () => '' },
    { id: 'telefonoFijo1', header: 'Teléfono Fijo 1', align: 'left', cell: (r:any) => <span className="font-mono text-[10px]">{r.TelefonoFijo1}</span>, raw: (r:any) => r.TelefonoFijo1, footer: () => '' },
    { id: 'telefonoFijo2', header: 'Teléfono Fijo 2', align: 'left', cell: (r:any) => <span className="font-mono text-[10px]">{r.TelefonoFijo2}</span>, raw: (r:any) => r.TelefonoFijo2, footer: () => '' }
  ];

  const colRender = cTable.order.map(id => defCols.find(c => c.id === id)!);

  const exportar = (formato: 'excel' | 'clipboard') => {
    if (tableData.length === 0) return;
    const headers = colRender.map(c => c.header);
    const rows = tableData.map((r:any) => colRender.map(col => col.raw(r)));
    if (formato === 'clipboard') {
      const contenido = [headers.join('\t'), ...rows.map(row => row.join('\t'))].join('\n');
      navigator.clipboard.writeText(contenido).then(() => alert('✅ Datos copiados al portapapeles.'));
    } else {
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Cancelados_No_Renovados");
      XLSX.writeFile(workbook, `Cancelados_No_Renovados_${agency}_${new Date().getTime()}.xlsx`);
    }
  };

  // ==========================================
  // ZONA 3: RETORNOS ANTICIPADOS (Carga y Error)
  // ==========================================
  if (!dbFilters || isLoading) return <LoadingState />;
  if (error) return <div className="p-5 text-destructive font-semibold border border-destructive/20 bg-destructive/10 rounded-xl">Error al cargar datos históricos de cancelaciones.</div>;

  // ==========================================
  // ZONA 4: RENDERIZADO PRINCIPAL
  // ==========================================
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* PANEL DE FILTROS EXCLUSIVO */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
          <SlidersHorizontal size={16} className="text-[hsl(var(--primary))]" />
          <h3 className="text-sm font-bold text-foreground">Filtros de Búsqueda</h3>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground">Agencia</label>
            <select value={agency} onChange={e => { setAgency(e.target.value); setAdvisor('Todos'); }} className="rounded-lg border-0 bg-muted/50 px-3 py-2 text-xs font-semibold">
              <option value="Todas">Todas</option>
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
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground">Tipo de Cancelación</label>
            <select value={tipoCancelacion} onChange={e => setTipoCancelacion(e.target.value)} className="rounded-lg border-0 bg-muted/50 px-3 py-2 text-xs font-semibold">
              <option value="Todas">Todas</option>
              <option value="Cancelado con Anticipación">Cancelado con Anticipación</option>
              <option value="Cancelado a Tiempo">Cancelado a Tiempo</option>
              <option value="Cancelado con Retraso">Cancelado con Retraso</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground">Frecuencia de Pago</label>
            <select value={frecuencia} onChange={e => setFrecuencia(e.target.value)} className="rounded-lg border-0 bg-muted/50 px-3 py-2 text-xs font-semibold">
              <option value="Todas">Todas</option>
              <option value="SEMANAS">Semanas</option>
              <option value="MESES">Meses</option>
              <option value="DIAS">Días</option>
            </select>
          </div>
        </div>
      </div>

      <Panel title="Créditos Cancelados No Renovados (Últimos 6 meses)" icon={Ban} eyebrow="Oportunidades de retención y seguimiento" action={<ExportActions control={cTable} onExport={exportar} />}>
        <div className="overflow-x-auto pb-4 max-h-[600px]">
          <table className="w-full text-left text-[11px] whitespace-nowrap">
            <thead>
              <tr className="border-b border-border text-muted-foreground sticky top-0 bg-card z-10 shadow-sm">
                {colRender.map(col => (
                  <th key={col.id} draggable={col.id !== cTable.lockedCol} onDragStart={(e) => cTable.handleDragStart(e, col.id)} onDragOver={cTable.handleDragOver} onDrop={(e) => cTable.handleDrop(e, col.id)} 
                      className={`px-3 pt-2 pb-2.5 font-semibold transition-colors ${col.id !== cTable.lockedCol ? 'cursor-grab active:cursor-grabbing hover:bg-muted/50 hover:text-foreground rounded-t-md' : ''} ${col.align === 'left' ? 'text-left' : col.align === 'center' ? 'text-center' : 'text-right'}`}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {tableData.length > 0 ? tableData.map((row: any, i: number) => (
                <tr key={i} className="hover:bg-muted/30 transition-colors">
                  {colRender.map(col => (
                    <td key={`${i}-${col.id}`} className={`px-3 py-2.5 ${col.align === 'left' ? 'text-left' : col.align === 'center' ? 'text-center' : 'text-right'}`}>{col.cell(row)}</td>
                  ))}
                </tr>
              )) : (
                <tr><td colSpan={colRender.length} className="py-8 text-center text-muted-foreground italic">No se encontraron créditos con estos filtros.</td></tr>
              )}
            </tbody>
            {/* 🚀 STICKY FOOTER PARA TOTALES */}
            <tfoot className="sticky bottom-0 z-20 bg-card shadow-[0_-2px_4px_rgba(0,0,0,0.05)]">
              <tr className="border-t-2 border-border font-bold bg-muted/40">
                {colRender.map(col => (
                  <td key={`foot-${col.id}`} className={`px-3 py-2.5 ${col.align === 'left' ? 'text-left' : col.align === 'center' ? 'text-center' : 'text-right'}`}>
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