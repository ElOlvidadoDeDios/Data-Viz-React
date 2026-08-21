export function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/70 p-3">
      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 font-display text-lg font-bold">{value}</div>
    </div>
  );
}