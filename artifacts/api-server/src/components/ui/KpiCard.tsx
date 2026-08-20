import { ArrowDownRight, ArrowUpRight, LucideIcon } from 'lucide-react';

export function KpiCard({ label, value, note, icon: Icon, tone = 'teal', delta }: { label: string; value: string; note: string; icon: LucideIcon; tone?: 'teal' | 'gold' | 'blue' | 'red'; delta?: string }) {
  const toneClass = { 
    teal: 'bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]', 
    gold: 'bg-[hsl(var(--accent)/.17)] text-[hsl(35_70%_35%)]', 
    blue: 'bg-[hsl(202_62%_45%/.12)] text-[hsl(202_62%_35%)]', 
    red: 'bg-[hsl(var(--destructive)/.1)] text-[hsl(var(--destructive))]' 
  }[tone];
  
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] transition duration-300 hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-start justify-between">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneClass}`}>
          <Icon size={17} />
        </div>
        {delta && (
          <span className={`flex items-center gap-1 rounded-full px-2 py-1 font-mono text-[10px] font-bold ${delta.startsWith('-') ? 'bg-[hsl(var(--destructive)/.1)] text-[hsl(var(--destructive))]' : 'bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]'}`}>
            {delta.startsWith('-') ? <ArrowDownRight size={11} /> : <ArrowUpRight size={11} />}
            {delta}
          </span>
        )}
      </div>
      <div className="mt-5 font-mono text-[10px] uppercase tracking-[.12em] text-muted-foreground">{label}</div>
      <div className="metric-number mt-1 text-[29px] font-bold text-foreground">{value}</div>
      <div className="mt-2 text-[11px] text-muted-foreground">{note}</div>
      <div className="absolute -bottom-6 -right-5 h-24 w-24 rounded-full border-[12px] border-[hsl(var(--primary)/.035)]" />
    </article>
  );
}