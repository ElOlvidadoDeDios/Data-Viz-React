//TableShell.tsx

import { ReactNode } from 'react';

export function TableShell({ children, minWidth = '900px' }: { children: ReactNode; minWidth?: string }) {
  return (
    <div className="mobile-scroll overflow-x-auto rounded-xl border border-border">
      <div style={{ minWidth }}>{children}</div>
    </div>
  );
}