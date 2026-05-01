interface FitnessProgressBarProps {
  value: number; // 0–100
  height?: number;
}

export function FitnessProgressBar({ value, height = 4 }: FitnessProgressBarProps) {
  const color =
    value >= 70 ? "#14B8BB" : value >= 40 ? "#F59E0B" : "#EF4444";

  return (
    <div
      className="w-full rounded-full"
      style={{ height: `${height}px`, backgroundColor: "#EEEEEE" }}
    >
      <div
        className="rounded-full transition-all"
        style={{ height: `${height}px`, width: `${value}%`, backgroundColor: color }}
      />
    </div>
  );
}
