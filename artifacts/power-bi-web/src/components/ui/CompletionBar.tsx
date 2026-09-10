//CompletionBar.tsx

export function CompletionBar({ achieved, target, label = 'Cumplimiento porcentual de la meta mensual' }: { achieved: number; target: number; label?: string }) {
  const value = Math.min(100, Math.round((achieved / target) * 100));
  
  const numberFormat = (val: number) => new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 }).format(val);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <strong className="font-mono">{value}%</strong>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-muted">
        <div 
          className={`h-full rounded-full transition-all ${value >= 100 ? 'bg-[hsl(138_72%_32%)]' : value >= 75 ? 'bg-[hsl(var(--accent))]' : 'bg-[hsl(var(--destructive))]'}`} 
          style={{ width: `${value}%` }} 
        />
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
        <span>Logrado {numberFormat(achieved)}</span>
        <span>Meta {numberFormat(target)}</span>
      </div>
    </div>
  );
}