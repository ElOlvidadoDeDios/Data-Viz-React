import { useQuery } from '@tanstack/react-query';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, Cell } from 'recharts';
import { Filters } from '../utils/constants';
import { money, number } from '../utils/formatters';
import { LoadingState } from '../components/ui/LoadingState';
import { SectionBand } from '../components/ui/SectionBand';
import { Panel } from '../components/ui/Panel';
import { TableShell } from '../components/ui/TableShell';

// ============================================================================
// 1. VISTA PREVENTIVA (La que usa la API real y se muestra en el Dashboard)
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
  if (error) return <div className="p-4 text-red-500">Error al cargar datos del DWH. Verifica la conexión a SQL Server.</div>;

  const datosFiltrados = filters.agency === 'Todas' 
    ? creditos 
    : creditos.filter((c: any) => c.agencia === filters.agency);

  return (
    <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
      <SectionBand tone="coral">Próximos a Vencer (5 Días)</SectionBand>
      <Panel title="Gestión Preventiva" eyebrow="Cartera en riesgo inminente">
        <TableShell minWidth="1000px">
          <table className="w-full text-[13px] whitespace-nowrap text-left">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 font-semibold text-muted-foreground">Agencia</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">Socio</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">Teléfono</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">Producto</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">Analista</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">Vencimiento</th>
                <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Días Faltantes</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {datosFiltrados?.map((row: any, i: number) => (
                <tr key={i} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-semibold">{row.agencia}</td>
                  <td className="px-4 py-3 truncate max-w-[200px]" title={row.socio}>{row.socio}</td>
                  <td className="px-4 py-3 font-mono text-xs">{row.telefono}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{row.producto}</td>
                  <td className="px-4 py-3">{row.analista}</td>
                  <td className="px-4 py-3 font-mono">{row.fecha_vencimiento}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      row.dias_para_vencimiento === 0 ? 'bg-red-100 text-red-700' :
                      row.dias_para_vencimiento <= 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {row.dias_para_vencimiento === 0 ? 'HOY' : `${row.dias_para_vencimiento} días`}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-[hsl(var(--destructive))]">S/ {row.saldo_formateado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      </Panel>
    </div>
  );
}

// ============================================================================
// 2. VISTA MOCK (Opcional: Respaldada con los datos en duro originales)
// ============================================================================
const dailyRows = [
  { agency: 'Wanchaq', targetCount: 12, projectionCount: 11, achievedCount: 4, targetAmount: 39036, projectionAmount: 40500, achievedAmount: 22680 },
  { agency: 'Tica Tica', targetCount: 10, projectionCount: 9, achievedCount: 1, targetAmount: 34490, projectionAmount: 35000, achievedAmount: 6230 },
  // ... (Agrega el resto de los mocks si alguna vez usas esta vista en lugar de Preventiva)
];

export function ProductividadDiariaView() {
  const countData = dailyRows.map((row) => ({ agency: row.agency, value: Math.round((row.achievedCount / row.targetCount) * 100) }));
  const amountData = dailyRows.map((row) => ({ agency: row.agency, value: Math.round((row.achievedAmount / row.targetAmount) * 100) }));
  
  return (
    <div className="space-y-5 animate-in fade-in">
      <SectionBand tone="blue">Productividad diaria</SectionBand>
      <div className="grid gap-5 xl:grid-cols-2">
        <DailyTable title="Respecto a la cantidad de colocaciones" mode="count" />
        <DailyTable title="Respecto al monto de colocaciones" mode="amount" />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <ComplianceChart title="Cumplimiento porcentual de la meta · cantidad" data={countData} />
        <ComplianceChart title="Cumplimiento porcentual de la meta · monto" data={amountData} />
      </div>
    </div>
  );
}

function DailyTable({ title, mode }: { title: string; mode: 'count' | 'amount' }) {
  return (
    <Panel title={title} eyebrow="Metas, proyecciones y colocaciones logradas">
      <TableShell minWidth="760px">
        <table className="w-full text-[13px] text-right whitespace-nowrap">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">Agencia</th>
              <th className="px-3 py-2.5 font-semibold text-muted-foreground">{mode === 'count' ? '# Meta' : 'S/ Meta'}</th>
              <th className="px-3 py-2.5 font-semibold text-muted-foreground">{mode === 'count' ? '# Proyección' : 'S/ Proyección'}</th>
              <th className="px-3 py-2.5 font-semibold text-muted-foreground">{mode === 'count' ? '# Logrado' : 'S/ Logrado'}</th>
              <th className="px-3 py-2.5 font-semibold text-muted-foreground">Faltante a proyección</th>
              <th className="px-3 py-2.5 font-semibold text-muted-foreground">Faltante a meta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {dailyRows.map((row) => { 
              const target = mode === 'count' ? row.targetCount : row.targetAmount; 
              const projection = mode === 'count' ? row.projectionCount : row.projectionAmount; 
              const achieved = mode === 'count' ? row.achievedCount : row.achievedAmount; 
              return (
                <tr key={row.agency} className="hover:bg-muted/20">
                  <td className="px-3 py-2 font-semibold text-left">{row.agency}</td>
                  <td className="px-3 py-2 bg-[hsl(var(--accent)/.22)] font-mono">{mode === 'count' ? target : money(target)}</td>
                  <td className="px-3 py-2 font-mono">{mode === 'count' ? projection : money(projection)}</td>
                  <td className="px-3 py-2 text-[hsl(var(--primary))] font-bold font-mono">{mode === 'count' ? achieved : money(achieved)}</td>
                  <td className="px-3 py-2 text-[hsl(var(--destructive))] font-mono">-{mode === 'count' ? number(projection - achieved) : money(projection - achieved)}</td>
                  <td className="px-3 py-2 text-[hsl(var(--destructive))] font-mono font-bold">-{mode === 'count' ? number(target - achieved) : money(target - achieved)}</td>
                </tr>
              ); 
            })}
          </tbody>
        </table>
      </TableShell>
    </Panel>
  );
}

function ComplianceChart({ title, data }: { title: string; data: { agency: string; value: number }[] }) {
  return (
    <Panel title={title} eyebrow="% avanzado · % faltante">
      <div className="h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.slice().sort((a, b) => a.value - b.value)} layout="vertical" margin={{ left: 22, right: 10 }}>
            <CartesianGrid horizontal={false} stroke="#e7e0d4" />
            <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fontSize: 10, fill: '#8b8a84' }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="agency" width={96} tick={{ fontSize: 10, fill: '#5b5f66' }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(value: number) => `${value}%`} />
            <Bar dataKey="value" name="Avanzado" fill="#0f5b9a" radius={[0, 4, 4, 0]} barSize={17}>
              {data.map((item) => <Cell key={item.agency} fill={item.value >= 75 ? '#087f73' : item.value >= 30 ? '#0f5b9a' : '#f29a76'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}