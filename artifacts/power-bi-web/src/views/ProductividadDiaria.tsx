import { useQuery } from '@tanstack/react-query';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, Cell } from 'recharts';
import { Filters } from '../utils/constants';
import { money, number } from '../utils/formatters';
import { LoadingState } from '../components/ui/LoadingState';
import { SectionBand } from '../components/ui/SectionBand';
import { Panel } from '../components/ui/Panel';
import { TableShell } from '../components/ui/TableShell';
import { WorkdayStrip } from '../components/WorkdayStrip';
import { ShieldAlert, TrendingUp } from 'lucide-react';

// ============================================================================
// 1. VISTA PREVENTIVA (Gestión Preventiva)
// ============================================================================
export function PreventivaView({ filters }: { filters: Filters }) {
  const { data: creditos, isLoading, error } = useQuery({
    queryKey: ['gestion-preventiva'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3000/api/gestion-preventiva');
      if (!res.ok) throw new Error('Error de red');
      return res.json();
    }
  });

  if (isLoading) return <LoadingState />;
  if (error) return <div className="p-4 text-destructive font-semibold">Error al cargar datos del DWH. Verifica la conexión a SQL Server.</div>;

  const datosFiltrados = filters.agency === 'Todas' 
    ? creditos 
    : creditos.filter((c: any) => c.agencia === filters.agency);

  const totalSaldo = datosFiltrados?.reduce((acc: number, curr: any) => acc + Number(curr.saldo_formateado || 0), 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500" key={`${filters.period}-${filters.agency}`}>
      <WorkdayStrip periodo={filters.period} />

      <SectionBand tone="coral">Próximos a Vencer (5 Días)</SectionBand>
      <Panel title="Gestión Preventiva" icon={ShieldAlert} eyebrow="Cartera en riesgo inminente">
        <div className="overflow-x-auto pb-4">
          <table className="w-full text-left text-[11px] whitespace-nowrap">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="px-3 pb-2 font-semibold">Agencia</th>
                <th className="px-3 pb-2 font-semibold">Socio</th>
                <th className="px-3 pb-2 font-semibold">Teléfono</th>
                <th className="px-3 pb-2 font-semibold">Producto</th>
                <th className="px-3 pb-2 font-semibold">Analista</th>
                <th className="px-3 pb-2 font-semibold">Vencimiento</th>
                <th className="px-3 pb-2 font-semibold text-center">Días Faltantes</th>
                <th className="px-3 pb-2 font-semibold text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {datosFiltrados?.map((row: any, i: number) => (
                <tr key={i} className="hover:bg-muted/30">
                  <td className="px-3 py-2.5 font-medium">{row.agencia}</td>
                  <td className="px-3 py-2.5 truncate max-w-[200px]" title={row.socio}>{row.socio}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{row.telefono}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{row.producto}</td>
                  <td className="px-3 py-2.5">{row.analista}</td>
                  <td className="px-3 py-2.5 font-mono">{row.fecha_vencimiento}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      row.dias_para_vencimiento === 0 ? 'bg-rose-500/20 text-rose-700' :
                      row.dias_para_vencimiento <= 2 ? 'bg-amber-500/20 text-amber-800' :
                      'bg-sky-500/20 text-sky-700'
                    }`}>
                      {row.dias_para_vencimiento === 0 ? 'HOY' : `${row.dias_para_vencimiento} días`}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold text-rose-600">S/ {row.saldo_formateado}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border font-bold bg-muted/20">
                <td className="px-3 py-2.5" colSpan={7}>Total General</td>
                <td className="px-3 py-2.5 text-right font-mono text-rose-600">{money(totalSaldo)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>
    </div>
  );
}

// ============================================================================
// 2. VISTA MOCK DE PRODUCTIVIDAD DIARIA
// ============================================================================
const dailyRows = [
  { agency: 'Wanchaq', targetCount: 12, projectionCount: 11, achievedCount: 4, targetAmount: 39036, projectionAmount: 40500, achievedAmount: 22680 },
  { agency: 'Tica Tica', targetCount: 10, projectionCount: 9, achievedCount: 1, targetAmount: 34490, projectionAmount: 35000, achievedAmount: 6230 },
];

export function ProductividadDiaria({ filters }: any) {
  const countData = dailyRows.map((row) => ({ agency: row.agency, value: Math.round((row.achievedCount / row.targetCount) * 100) }));
  const amountData = dailyRows.map((row) => ({ agency: row.agency, value: Math.round((row.achievedAmount / row.targetAmount) * 100) }));
  
  return (
    <div className="space-y-8 animate-in fade-in duration-500" key={`${filters.period}-${filters.agency}`}>
      <WorkdayStrip periodo={filters.period} />

      <SectionBand tone="blue">Productividad Diaria</SectionBand>
      <div className="grid gap-5 xl:grid-cols-2">
        <DailyTable title="Respecto a la cantidad de colocaciones" mode="count" />
        <DailyTable title="Respecto al monto de colocaciones" mode="amount" />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <ComplianceChart title="Cumplimiento porcentual de la meta · Cantidad" data={countData} />
        <ComplianceChart title="Cumplimiento porcentual de la meta · Monto" data={amountData} />
      </div>
    </div>
  );
}

function DailyTable({ title, mode }: { title: string; mode: 'count' | 'amount' }) {
  const t_target = dailyRows.reduce((acc, r) => acc + (mode === 'count' ? r.targetCount : r.targetAmount), 0);
  const t_projection = dailyRows.reduce((acc, r) => acc + (mode === 'count' ? r.projectionCount : r.projectionAmount), 0);
  const t_achieved = dailyRows.reduce((acc, r) => acc + (mode === 'count' ? r.achievedCount : r.achievedAmount), 0);
  const t_faltanteProj = t_projection - t_achieved;
  const t_faltanteMeta = t_target - t_achieved;

  return (
    <Panel title={title} icon={TrendingUp} eyebrow="Metas, proyecciones y colocaciones logradas">
      <div className="overflow-x-auto pb-4">
        <table className="w-full text-left text-[11px] whitespace-nowrap">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="px-3 pb-2 font-semibold">Agencia</th>
              <th className="px-3 pb-2 font-semibold text-right">{mode === 'count' ? '# Meta' : 'S/ Meta'}</th>
              <th className="px-3 pb-2 font-semibold text-right">{mode === 'count' ? '# Proyección' : 'S/ Proyección'}</th>
              <th className="px-3 pb-2 font-semibold text-right">{mode === 'count' ? '# Logrado' : 'S/ Logrado'}</th>
              <th className="px-3 pb-2 font-semibold text-right">Faltante Proyección</th>
              <th className="px-3 pb-2 font-semibold text-right">Faltante Meta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {dailyRows.map((row) => { 
              const target = mode === 'count' ? row.targetCount : row.targetAmount; 
              const projection = mode === 'count' ? row.projectionCount : row.projectionAmount; 
              const achieved = mode === 'count' ? row.achievedCount : row.achievedAmount; 
              return (
                <tr key={row.agency} className="hover:bg-muted/30">
                  <td className="px-3 py-2.5 font-medium">{row.agency}</td>
                  <td className="px-3 py-2.5 text-right font-mono bg-accent/10">{mode === 'count' ? target : money(target)}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{mode === 'count' ? projection : money(projection)}</td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-600">{mode === 'count' ? achieved : money(achieved)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-rose-600">-{mode === 'count' ? number(projection - achieved) : money(projection - achieved)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-rose-600 font-bold">-{mode === 'count' ? number(target - achieved) : money(target - achieved)}</td>
                </tr>
              ); 
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border font-bold bg-muted/20">
              <td className="px-3 py-2.5">Total</td>
              <td className="px-3 py-2.5 text-right font-mono bg-accent/10">{mode === 'count' ? t_target : money(t_target)}</td>
              <td className="px-3 py-2.5 text-right font-mono">{mode === 'count' ? t_projection : money(t_projection)}</td>
              <td className="px-3 py-2.5 text-right font-mono text-emerald-600">{mode === 'count' ? t_achieved : money(t_achieved)}</td>
              <td className="px-3 py-2.5 text-right font-mono text-rose-600">-{mode === 'count' ? number(t_faltanteProj) : money(t_faltanteProj)}</td>
              <td className="px-3 py-2.5 text-right font-mono text-rose-600">{mode === 'count' ? number(t_faltanteMeta) : money(t_faltanteMeta)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Panel>
  );
}

function ComplianceChart({ title, data }: { title: string; data: { agency: string; value: number }[] }) {
  return (
    <Panel title={title} eyebrow="% avanzado · % faltante">
      <div className="h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.slice().sort((a, b) => a.value - b.value)} layout="vertical" margin={{ left: 22, right: 10 }}>
            <CartesianGrid horizontal={false} stroke="#e2e8f0" strokeDasharray="3 3" />
            <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="agency" width={96} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(value: number) => `${value}%`} />
            <Bar dataKey="value" name="Avanzado" radius={[0, 4, 4, 0]} barSize={17}>
              {data.map((item) => <Cell key={item.agency} fill={item.value >= 75 ? '#16a34a' : item.value >= 30 ? '#0284c7' : '#e11d48'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}