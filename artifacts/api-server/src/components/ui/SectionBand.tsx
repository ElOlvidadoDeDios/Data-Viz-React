import { ReactNode } from 'react';

export function SectionBand({ children, tone = 'green' }: { children: ReactNode; tone?: 'green' | 'blue' | 'coral' }) {
  const classes = { 
    green: 'bg-[hsl(138_72%_32%)]', 
    blue: 'bg-[hsl(202_76%_31%)]', 
    coral: 'bg-[hsl(16_75%_72%)] text-[hsl(18_40%_20%)]' 
  }[tone];
  
  return (
    <div className={`rounded-lg px-4 py-2.5 text-center font-display text-[12px] font-bold uppercase tracking-[.08em] text-white shadow-sm ${classes}`}>
      {children}
    </div>
  );
}