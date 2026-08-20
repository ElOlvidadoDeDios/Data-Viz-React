export function LoadingState() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="h-28 rounded-2xl bg-muted" />
        <div className="h-28 rounded-2xl bg-muted" />
        <div className="h-28 rounded-2xl bg-muted" />
      </div>
      <div className="h-[420px] rounded-2xl bg-muted" />
      <div className="h-[300px] rounded-2xl bg-muted" />
    </div>
  );
}