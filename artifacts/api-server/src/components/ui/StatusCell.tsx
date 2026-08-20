import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { money } from '../../utils/formatters';

export function StatusCell({ value, threshold = 0 }: { value: number; threshold?: number }) {
  const good = value <= threshold;
  return (
    <span 
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-[13px] font-bold ${
        good 
          ? 'bg-[hsl(138_72%_32%/.15)] text-[hsl(138_72%_25%)]' 
          : 'bg-[hsl(var(--destructive)/.12)] text-[hsl(var(--destructive))]'
      }`}
    >
      {good ? <CheckCircle2 size={15} strokeWidth={2.5} /> : <AlertTriangle size={15} strokeWidth={2.5} />}
      {money(value)}
    </span>
  );
}