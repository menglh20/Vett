"use client";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

interface RadarDataPoint {
  dimension: string;
  selfAssessed: number;
  observed: number;
}

interface ProfileRadarChartProps {
  data: RadarDataPoint[];
  height?: number;
}

export function ProfileRadarChart({ data, height = 280 }: ProfileRadarChartProps) {
  return (
    <>
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart data={data}>
          <PolarGrid stroke="#DDDDDD" />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fill: "#888888", fontSize: 12, fontFamily: "var(--font-outfit)" }}
            tickLine={false}
          />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name="Self-assessed"
            dataKey="selfAssessed"
            stroke="#CCCCCC"
            fill="#E5E5E5"
            fillOpacity={0.6}
            strokeWidth={2}
          />
          <Radar
            name="Observed behavior"
            dataKey="observed"
            stroke="#14B8BB"
            fill="#14B8BB"
            fillOpacity={0.15}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-center gap-6 mt-2">
        <div className="flex items-center gap-2">
          <div className="rounded-sm" style={{ width: "12px", height: "12px", backgroundColor: "#CCCCCC" }} />
          <span style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", color: "#888888" }}>Self-assessed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-sm" style={{ width: "12px", height: "12px", backgroundColor: "#14B8BB" }} />
          <span style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", color: "#888888" }}>Observed behavior</span>
        </div>
      </div>
    </>
  );
}
