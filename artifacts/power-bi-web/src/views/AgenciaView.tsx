import { useQuery } from '@tanstack/react-query';
import { Filters } from '../utils/constants';
import { money, number } from '../utils/formatters';
import { LoadingState } from '../components/ui/LoadingState';
import { SectionBand } from '../components/ui/SectionBand';
import { Panel } from '../components/ui/Panel';
import { KpiCard } from '../components/ui/KpiCard';
import { CompletionBar } from '../components/ui/CompletionBar';
import { MiniMetric } from '../components/ui/MiniMetric';

export function AgenciaView({ filters }: { filters: Filters }) {
  const { data: agenciaBD, isLoading, error } = useQuery({
    queryKey: ['indicadores-agencia', filters.period],
    queryFn: async () => {
      if (!filters.period || filters.period === 'Cargando...') return null;
      const res = await fetch(`http://localhost:3000/api/agencia/${filters.period}`);
      if (!res.ok) throw new Error('Error al cargar agencia');
      return res.json();
    },
    enabled: !!filters.period && filters.period !== 'Cargando...'
  });

  if (isLoading || !agenciaBD) return <LoadingState />;
  if (error) return <div className="p-5 text-red-500 font-bold border border-red-200 bg-red-50 rounded-xl">Error de conexión.</div>;

  const agenciaNombre = filters.agency === 'Todas' ? 'TODA LA RED' : filters.agency.toUpperCase();
  const filterByAgency = (arr: any[]) => filters.agency === 'Todas' ? arr : arr.filter((r: any) => r.agency === filters.agency);
  
  let dataComercial = filterByAgency(agenciaBD.comercial || []);
  const dataResumen = filterByAgency(agenciaBD.resumen || []);

  if (filters.advisor !== 'Todos') {
    dataComercial = dataComercial.filter((r: any) => r.asesor === filters.advisor);
  }

  const sum = (arr: any[], key: string) => arr.reduce((acc, row) => acc + Number(row[key] || 0), 0);
  const totCrecNeto = sum(dataComercial, 'crecimientoNeto150');
  const totColocacion = sum(dataComercial, 'amountAchieved');
  const totCartera = sum(dataComercial, 'cartera');
  const totMoraCppAct = sum(dataComercial, 'moraCppActual');
  const totMoraCppMax = sum(dataComercial, 'moraCppMax');
  const totOpAchieved = sum(dataComercial, 'opAchieved');
  const totOpTarget = sum(dataResumen, 'opTarget');
  const totRepagos = sum(dataComercial, 'repagos');
  const totSociosAct = sum(dataComercial, 'sociosActual');

  return (
    <div className="space-y-6 animate-in fade-in" key={`${filters.period}-${filters.agency}-${filters.advisor}`}>
      <SectionBand tone="blue">{agenciaNombre} · PARTE COMERCIAL</SectionBand>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Crecimiento neto 150" value={money(totCrecNeto)} note="Variación real" icon={TrendingUp} tone={totCrecNeto >= 0 ? 'teal' : 'red'} />
        <KpiCard label="Colocación" value={money(totColocacion)} note={`${number(totOpAchieved)} oper.`} icon={Target} tone="gold" />
        <KpiCard label="Cartera" value={money(totCartera)} note="Saldo vigente" icon={Building2} tone="blue" />
        <KpiCard label="Mora CPP Real" value={money(totMoraCppAct)} note={`Meta ${money(totMoraCppMax)}`} icon={AlertTriangle} tone={totMoraCppAct > totMoraCppMax ? 'red' : 'teal'} />
      </div>
      <Panel title={agenciaNombre} eyebrow="Detalle comercial">
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <MiniMetric label="Repagos" value={money(totRepagos)} />
          <MiniMetric label="Nro. operaciones" value={number(totOpAchieved)} />
          <MiniMetric label="Nro. socios" value={number(totSociosAct)} />
        </div>
        <CompletionBar achieved={totOpAchieved} target={totOpTarget} />
      </Panel>
    </div>
  );
}