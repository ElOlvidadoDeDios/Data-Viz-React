import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Clock3, Target } from 'lucide-react';
import { KpiCard } from './ui/KpiCard';

export function WorkdayStrip({ periodo }: { periodo: string }) {
  const { data: dias, isLoading } = useQuery({
    queryKey: ['dias-laborales', periodo],
    queryFn: async () => {
      if (!periodo || periodo === 'Cargando...') return null;
      const res = await fetch(`http://localhost:3000/api/dias-laborales/${periodo}`);
      return res.json();
    },
    enabled: !!periodo && periodo !== 'Cargando...'
  });

  if (isLoading || !dias) return <div className="grid gap-3 sm:grid-cols-3"><div className="h-28 rounded-2xl bg-muted animate-pulse" /><div className="h-28 rounded-2xl bg-muted animate-pulse" /><div className="h-28 rounded-2xl bg-muted animate-pulse" /></div>;

  const pctTranscurrido = dias.totales > 0 ? Math.round((dias.transcurridos / dias.totales) * 100) : 0;
  const pctRestante = dias.totales > 0 ? Math.round((dias.restantes / dias.totales) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard label="Días laborales TOTALES" value={dias.totales.toString()} note={`Periodo ${periodo}`} icon={CalendarDays} tone="blue" />
        <KpiCard label="Días laborales TRANSCURRIDOS" value={dias.transcurridos.toString()} note={`${pctTranscurrido}% del periodo`} icon={Clock3} tone="teal" />
        <KpiCard label="Días laborales RESTANTES" value={dias.restantes.toString()} note={`${pctRestante}% para cerrar la meta`} icon={Target} tone="red" />
      </div>
      
      <div className="flex h-3.5 w-full overflow-hidden rounded-full shadow-inner">
        <div className="bg-[hsl(202_76%_45%)] transition-all duration-1000 ease-out" style={{ width: `${pctTranscurrido}%` }} title={`${pctTranscurrido}% transcurrido`} />
        <div className="bg-[hsl(220_50%_20%)] transition-all duration-1000 ease-out" style={{ width: `${pctRestante}%` }} title={`${pctRestante}% restante`} />
      </div>
    </div>
  );
}