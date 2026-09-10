//RankingView.tsx

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { RefreshCw, Copy, Download, SlidersHorizontal, Trophy } from 'lucide-react';
import { money } from '../utils/formatters';
import { LoadingState } from '../components/ui/LoadingState';
import { Panel } from '../components/ui/Panel';

// ============================================================================
// HOOKS MAESTROS DE DRAG & DROP Y EXPORTACIÓN
// ============================================================================
function useColumnOrder(initialOrder: string[], tableId: string, lockedCol: string = 'asesor') {
  const [order, setOrder] = useState(initialOrder);
  const isModified = JSON.stringify(order) !== JSON.stringify(initialOrder);

  // 🚀 FIX FANTASMA: Mantiene sincronizadas las columnas si el initialOrder cambia
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
// VISTA PRINCIPAL
// ============================================================================
export function RankingView({ dbFilters }: { dbFilters: any }) {
  // ==========================================
  // ZONA 0: VALORES INICIALES
  // ==========================================
  const periodosDisponibles = dbFilters?.periodos || [];
  const defaultPeriod = periodosDisponibles[0] || '202608';

  // ==========================================
  // ZONA 1: TODOS LOS HOOKS (Incondicionales)
  // ==========================================
  const [period, setPeriod] = useState(defaultPeriod);
  const [agency, setAgency] = useState('Todas');
  const [advisor, setAdvisor] = useState('Todos');

  const asesoresHistoricos = useMemo(() => {
    if (!dbFilters?.asesores) return [];
    let arr = dbFilters.asesores;
    
    // Filtramos primero por el periodo seleccionado
    if (period && period !== 'Cargando...') {
      arr = arr.filter((a: any) => String(a.Periodo) === String(period));
    }

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
  }, [dbFilters, agency, period]);

  const { data: rankingData, isLoading, error } = useQuery({
    queryKey: ['ranking', period, agency, advisor],
    queryFn: async () => {
      const params = new URLSearchParams({
        periodo: period,
        agencia: agency !== 'Todas' ? agency : '',
        asesor: advisor !== 'Todos' ? advisor : ''
      });
      const res = await fetch(`http://localhost:3000/api/ranking?${params}`);
      if (!res.ok) throw new Error('Error al cargar el ranking');
      return res.json();
    },
    enabled: !!period
  });

  const COL_KEYS = ['asesor', 'operaciones', 'desembolsos', 'agencia', 'admin'];
  const cTable = useColumnOrder(COL_KEYS, 'ranking', 'asesor');

  // ==========================================
  // ZONA 2: LÓGICA Y FUNCIONES
  // ==========================================
  const tableData = rankingData || [];

  // Totales para el Footer
  const t_operaciones = tableData.reduce((acc: number, r: any) => acc + Number(r.Operaciones || 0), 0);
  const t_desembolsos = tableData.reduce((acc: number, r: any) => acc + Number(r.Desembolsos || 0), 0);

  const defCols = [
    { id: 'asesor', header: 'Asesor', align: 'left', cell: (r:any) => <span className="font-semibold text-foreground">{r.Asesor}</span>, raw: (r:any) => r.Asesor, footer: () => <span className="text-foreground">Total general ({tableData.length})</span> },
    { id: 'operaciones', header: 'Oper', align: 'center', cell: (r:any) => <span className="font-mono text-[12px] font-bold text-blue-700">{r.Operaciones}</span>, raw: (r:any) => r.Operaciones, footer: () => <span className="font-mono text-[12px] text-blue-700">{t_operaciones}</span> },
    { id: 'desembolsos', header: 'Desembolsos', align: 'right', cell: (r:any) => <span className="font-mono text-emerald-600 font-medium">{money(r.Desembolsos)}</span>, raw: (r:any) => r.Desembolsos, footer: () => <span className="font-mono text-emerald-700">{money(t_desembolsos)}</span> },
    { id: 'agencia', header: 'Agencia', align: 'center', cell: (r:any) => <span className="text-muted-foreground">{r.Agencia}</span>, raw: (r:any) => r.Agencia, footer: () => '' },
    { id: 'admin', header: 'Admin', align: 'left', cell: (r:any) => <span className="text-[10px] uppercase text-muted-foreground">{r.Admin}</span>, raw: (r:any) => r.Admin, footer: () => '' }
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
      XLSX.utils.book_append_sheet(workbook, worksheet, "Ranking_Asesores");
      XLSX.writeFile(workbook, `Ranking_Asesores_${period}_${agency}_${new Date().getTime()}.xlsx`);
    }
  };

  // ==========================================
  // ZONA 3: RETORNOS ANTICIPADOS (Carga y Error)
  // ==========================================
  if (!dbFilters || isLoading) return <LoadingState />;
  if (error) return <div className="p-5 text-destructive font-semibold border border-destructive/20 bg-destructive/10 rounded-xl">Error al cargar datos del ranking.</div>;

  // ==========================================
  // ZONA 4: RENDERIZADO PRINCIPAL
  // ==========================================
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* PANEL DE FILTROS */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
          <SlidersHorizontal size={16} className="text-[hsl(var(--primary))]" />
          <h3 className="text-sm font-bold text-foreground">Filtros de Ranking</h3>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 max-w-3xl">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground">Periodo</label>
            <select value={period} onChange={e => { setPeriod(e.target.value); setAdvisor('Todos'); }} className="rounded-lg border-0 bg-yellow-500/10 px-3 py-2 text-xs font-semibold text-yellow-700 ring-1 ring-yellow-500/30 focus:ring-yellow-500">
              {periodosDisponibles.map((p: string) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground">Agencia</label>
            <select value={agency} onChange={e => { setAgency(e.target.value); setAdvisor('Todos'); }} className="rounded-lg border-0 bg-yellow-500/10 px-3 py-2 text-xs font-semibold text-yellow-700 ring-1 ring-yellow-500/30 focus:ring-yellow-500">
              <option value="Todas">Todas</option>
              {['Wanchaq', 'San Jerónimo', 'Quillabamba', 'Sicuani', 'Molino', 'Juliaca', 'Lima Los Olivos', 'Tica Tica', 'Magisterio', 'Lima SJL', 'Chiclayo', 'Arequipa', 'Pucallpa'].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground">Asesor</label>
            <select value={advisor} onChange={e => setAdvisor(e.target.value)} className="rounded-lg border-0 bg-yellow-500/10 px-3 py-2 text-xs font-semibold text-yellow-700 ring-1 ring-yellow-500/30 focus:ring-yellow-500">
              <option value="Todos">Todos</option>
              {asesoresHistoricos.map((a: any, i: number) => <option key={i} value={a.valorFiltro}>{a.textoVista}</option>)}
            </select>
          </div>
        </div>
      </div>

      <Panel title="RANKING ASESORES" icon={Trophy} eyebrow="Productividad de asesores por operaciones" action={<ExportActions control={cTable} onExport={exportar} />}>
        <div className="overflow-x-auto pb-4 max-h-[600px]">
          <table className="w-full text-left text-[12px] whitespace-nowrap">
            <thead>
              <tr className="border-b border-border text-muted-foreground sticky top-0 bg-card z-10 shadow-sm">
                {colRender.map(col => (
                  <th key={col.id} draggable={col.id !== cTable.lockedCol} onDragStart={(e) => cTable.handleDragStart(e, col.id)} onDragOver={cTable.handleDragOver} onDrop={(e) => cTable.handleDrop(e, col.id)} 
                      className={`px-4 pt-3 pb-3 font-semibold transition-colors ${col.id !== cTable.lockedCol ? 'cursor-grab active:cursor-grabbing hover:bg-muted/50 hover:text-foreground rounded-t-md' : ''} ${col.align === 'left' ? 'text-left' : col.align === 'center' ? 'text-center' : 'text-right'}`}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {tableData.length > 0 ? tableData.map((row: any, i: number) => (
                <tr key={i} className="hover:bg-muted/30 transition-colors">
                  {colRender.map(col => (
                    <td key={`${i}-${col.id}`} className={`px-4 py-2.5 ${col.align === 'left' ? 'text-left' : col.align === 'center' ? 'text-center' : 'text-right'}`}>{col.cell(row)}</td>
                  ))}
                </tr>
              )) : (
                <tr><td colSpan={colRender.length} className="py-8 text-center text-muted-foreground italic">No se encontraron registros en este periodo.</td></tr>
              )}
            </tbody>
            {/* STICKY FOOTER PARA TOTALES */}
            <tfoot className="sticky bottom-0 z-20 bg-card shadow-[0_-2px_4px_rgba(0,0,0,0.05)]">
              <tr className="border-t-2 border-border font-bold bg-muted/40">
                {colRender.map(col => (
                  <td key={`foot-${col.id}`} className={`px-4 py-3 ${col.align === 'left' ? 'text-left' : col.align === 'center' ? 'text-center' : 'text-right'}`}>
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