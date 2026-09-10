//Panel.tsx

import { ReactNode } from 'react';

export function Panel({ title, eyebrow, children, action }: { title: string; eyebrow?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-[17px] font-bold tracking-[-.025em]">{title}</h2>
          {eyebrow && <p className="mt-1 font-mono text-[9px] uppercase tracking-[.13em] text-muted-foreground">{eyebrow}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}