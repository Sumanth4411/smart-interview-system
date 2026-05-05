export default function VolumeBars({ level, active }: { level: number; active: boolean }) {
  const bars = 14;
  return (
    <div className="flex items-end gap-1 h-10" aria-label="Microphone volume level">
      {Array.from({ length: bars }).map((_, i) => {
        const threshold = (i + 1) / bars;
        const on = active && level >= threshold * 0.6;
        const heightPct = on ? 30 + (1 - threshold) * 70 + level * 30 : 18;
        const color =
          threshold > 0.8 ? "bg-destructive" :
          threshold > 0.5 ? "bg-warning" :
          "bg-success";
        return (
          <div
            key={i}
            className={`w-1.5 rounded-full transition-all duration-75 ${on ? color : "bg-muted"}`}
            style={{ height: `${Math.min(100, heightPct)}%` }}
          />
        );
      })}
    </div>
  );
}
