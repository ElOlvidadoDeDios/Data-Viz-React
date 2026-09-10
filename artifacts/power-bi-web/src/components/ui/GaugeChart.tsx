//GaugeChart.tsx

export function GaugeChart({ pct, color }: { pct: number, color: string }) {
  const radius = 85;
  const strokeWidth = 24;
  const circ = Math.PI * radius; 
  const strokePct = circ * ((100 - Math.min(pct, 100)) / 100);
  
  return (
    <div className="flex flex-col items-center relative w-[240px]">
      <svg width="240" height="120" className="overflow-visible">
        <path d={`M 35 115 A ${radius} ${radius} 0 0 1 205 115`} fill="none" className="stroke-muted" strokeWidth={strokeWidth} strokeLinecap="butt" />
        <path d={`M 35 115 A ${radius} ${radius} 0 0 1 205 115`} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={circ} strokeDashoffset={strokePct} strokeLinecap="butt" className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute bottom-2 left-0 right-0 flex justify-center">
        <span translate="no" className="notranslate text-4xl font-bold tracking-tight text-foreground">
          {pct.toFixed(0)}%
        </span>
      </div>
      <div className="w-full flex justify-between px-8 absolute -bottom-4 text-[10px] font-bold text-muted-foreground/60">
        <span>0%</span>
        <span>100%</span>
      </div>
    </div>
  );
}