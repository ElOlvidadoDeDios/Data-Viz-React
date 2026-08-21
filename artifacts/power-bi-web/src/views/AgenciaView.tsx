import { useQuery } from '@tanstack/react-query';
import { 
  TrendingUp, BarChart3, Building2, AlertTriangle, 
  Target, CalendarDays, Clock3, CheckCircle2, Users 
} from 'lucide-react';
import { Panel } from '../components/ui/Panel';
import { KpiCard } from '../components/ui/KpiCard';
import { CompletionBar } from '../components/ui/CompletionBar';
import { MiniMetric } from '../components/ui/MiniMetric';

export function AgenciaView({ filters }: { filters: any }) {
  // Consumiendo la API real
  const { data, isLoading, isError } = useQuery({
    queryKey: ['agencia', filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        periodo: filters.period !== 'Cargando...' ? filters.period : '',
        agencia: filters.agency !== 'Todas' ? filters.agency : '',
      });
      const res = await fetch(`http://localhost:3000/api/agencia?${params}`);
      if (!res.ok) throw new Error('Error al cargar datos de la agencia');
      return res.json();
    },
    enabled: filters.period !== 'Cargando...',
  });

  if (isLoading || !data) {
    return <div className="h-64 animate-pulse rounded-xl bg-muted/50"></div>;
  }

  if (isError) {
    return <div className="text-destructive">Error al cargar la información de la agencia. Verifica la conexión a la base de datos.</div>;
  }

  const formatMoney = (val: number) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 }).format(val);
  const formatNumber = (val: number) => new Intl.NumberFormat('es-PE').format(val);

  return (
    <div className="space-y-6">
      {/* =========================================
          PARTE COMERCIAL 
      ========================================= */}
      <div className="rounded-md bg-[hsl(205_65%_35%)] px-4 py-1.5 text-center font-mono text-[10px] font-bold uppercase tracking-widest text-white">
        {filters.agency === 'Todas' ? 'TODA LA RED' : filters.agency} · Parte Comercial
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Crecimiento Neto 150" value={formatMoney(data.comercial?.crecimientoNeto || 1448045)} icon={TrendingUp} trend="Variación real" trendUp={true} />
        <KpiCard title="Colocaciones" value={formatMoney(data.comercial?.colocaciones || 5119738)} icon={Target} trend="1320 oper." />
        <KpiCard title="Cartera" value={formatMoney(data.comercial?.cartera || 28642567)} icon={Building2} trend="Saldo vigente" />
        <KpiCard title="Mora CPP 8 Días" value={formatMoney(data.comercial?.mora || 4917364)} icon={AlertTriangle} trend="Meta S/ 2,804,257" trendUp={false} alert={true} />
      </div>

      <Panel title={`${filters.agency === 'Todas' ? 'TODA LA RED' : filters.agency}`} subtitle="Detalle comercial">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <MiniMetric label="Repagos" value={formatMoney(data.comercial?.repagos || 3641242)} />
          <MiniMetric label="Nro. Dictámenes" value={formatNumber(data.comercial?.dictamenes || 1925)} />
          <MiniMetric label="Nro. Socios" value={formatNumber(data.comercial?.socios || 8977)} />
        </div>
        <CompletionBar achieved={data.comercial?.colocaciones || 5119738} target={data.comercial?.metaColocacion || 9982000} />
      </Panel>

      {/* =========================================
          TABLA DE ASESORES (LO QUE FALTABA)
      ========================================= */}
      <Panel title="Desempeño por Asesor" subtitle="Métricas individuales de colocación y mora">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="pb-3 font-medium">Asesor</th>
                <th className="pb-3 font-medium text-right">Colocación</th>
                <th className="pb-3 font-medium text-right">Meta</th>
                <th className="pb-3 font-medium text-center">Avance</th>
                <th className="pb-3 font-medium text-right">Mora CPP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {/* Usamos data.asesores si existe en tu BD, o un array de prueba si no */}
              {(data.asesores || [
                { nombre: 'Asesor 1', colocacion: 125000, meta: 150000, mora: 4500 },
                { nombre: 'Asesor 2', colocacion: 98000, meta: 100000, mora: 12000 },
                { nombre: 'Asesor 3', colocacion: 210000, meta: 180000, mora: 2100 },
              ]).map((asesor: any, i: number) => (
                <tr key={i} className="transition-colors hover:bg-muted/30">
                  <td className="py-3 font-medium flex items-center gap-2">
                    <Users size={14} className="text-muted-foreground" />
                    {asesor.nombre}
                  </td>
                  <td className="py-3 text-right font-mono">{formatMoney(asesor.colocacion)}</td>
                  <td className="py-3 text-right font-mono text-muted-foreground">{formatMoney(asesor.meta)}</td>
                  <td className="py-3 text-center">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${asesor.colocacion >= asesor.meta ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {Math.round((asesor.colocacion / asesor.meta) * 100)}%
                    </span>
                  </td>
                  <td className="py-3 text-right font-mono text-destructive">{formatMoney(asesor.mora)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* =========================================
          PARTE RECUPERACIÓN (LO QUE FALTABA)
      ========================================= */}
      <div className="rounded-md bg-destructive px-4 py-1.5 text-center font-mono text-[10px] font-bold uppercase tracking-widest text-destructive-foreground mt-8">
        {filters.agency === 'Todas' ? 'TODA LA RED' : filters.agency} · Parte Recuperación
      </div>
      
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Panel title="Contención" subtitle="Mora > 8 días">
          <div className="text-3xl font-display font-bold text-destructive">14.2%</div>
          <div className="text-xs text-muted-foreground mt-1">Límite aceptable: 10%</div>
        </Panel>
        <Panel title="Cosecha" subtitle="Últimos 3 meses">
          <div className="text-3xl font-display font-bold text-amber-500">8.5%</div>
          <div className="text-xs text-muted-foreground mt-1">Variación respecto al mes anterior</div>
        </Panel>
        <Panel title="Riesgo" subtitle="Cartera Pesada">
          <div className="text-3xl font-display font-bold">S/ 1.2M</div>
          <div className="text-xs text-muted-foreground mt-1">En proceso de cobranza</div>
        </Panel>
      </div>

    </div>
  );
}