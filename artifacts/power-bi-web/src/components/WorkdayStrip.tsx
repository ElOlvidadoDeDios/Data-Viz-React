//WorkdayStrip.tsx

import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Clock3, Target } from 'lucide-react';

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

  if (isLoading || !dias) {
    return <div className="h-16 rounded-xl bg-muted animate-pulse mb-6" />;
  }

  const pctTranscurrido = dias.totales > 0 ? Math.round((dias.transcurridos / dias.totales) * 100) : 0;
  const pctRestante = dias.totales > 0 ? Math.round((dias.restantes / dias.totales) * 100) : 0;

  return (
    <div className="mb-6 rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
      {/* Cabecera compacta con los 3 valores */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-[hsl(202_76%_45%/.1)] p-2 text-[hsl(202_76%_45%)]">
            <CalendarDays size={16} />
          </div>
          <div>
            <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Total Periodo</span>
            <span className="font-display font-bold text-foreground text-sm">{dias.totales} días</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-[hsl(160_60%_40%/.1)] p-2 text-[hsl(160_60%_40%)]">
            <Clock3 size={16} />
          </div>
          <div>
            <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Transcurridos ({pctTranscurrido}%)</span>
            <span className="font-display font-bold text-foreground text-sm">{dias.transcurridos} días</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-[hsl(0_72%_51%/.1)] p-2 text-[hsl(0_72%_51%)]">
            <Target size={16} />
          </div>
          <div>
            <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Restantes ({pctRestante}%)</span>
            <span className="font-display font-bold text-rose-600 text-sm">{dias.restantes} días</span>
          </div>
        </div>
      </div>

      {/* Barra de progreso integrada */}
      <div className="flex h-4 w-full overflow-hidden rounded-md shadow-inner border border-border/40">
        <div 
          className="bg-[#0284c7] flex items-center justify-center text-[10px] font-bold text-white transition-all duration-1000 ease-out" 
          style={{ width: `${pctTranscurrido}%` }} 
        >
          {pctTranscurrido > 15 && `${pctTranscurrido}% transcurrido`}
        </div>
        <div 
          className="bg-[#1e3a8a] flex items-center justify-center text-[10px] font-bold text-white/90 transition-all duration-1000 ease-out" 
          style={{ width: `${pctRestante}%` }} 
        >
          {pctRestante > 15 && `${pctRestante}% restante`}
        </div>
      </div>
    </div>
  );
}