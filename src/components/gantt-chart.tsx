"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList
} from "recharts";
import { useMemo } from "react";
import type { GanttHeat } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";

interface GanttChartProps {
  data: GanttHeat[];
}

const UNIT_ORDER = [
  "KR1", "KR2", "BOF1", "BOF2", "BOF3", "BOF4", "BOF5", "LF1", "LF2", "LF3", "LF4", "LF5", "BCM1", "TSC1"
].reverse(); // Reverse for top-to-bottom display in chart

const COLORS = [
  "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd",
  "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const key = payload[0].dataKey;
    const heatIdMatch = key.match(/(.+)_(start|duration)/);
    if (!heatIdMatch) return null;

    const heatId = heatIdMatch[1];
    const heatData = data.tooltips[heatId];

    if (!heatData) return null;

    return (
      <Card>
        <CardContent className="p-3 text-sm">
          <p className="font-bold">Heat ID: {heatData.Heat_ID}</p>
          <p>Steel Grade: {heatData.Steel_Grade}</p>
          <p className="font-semibold mt-2">Operation: {heatData.unit}</p>
          <p>Start: {heatData.startTime.toLocaleTimeString()}</p>
          <p>End: {heatData.endTime.toLocaleTimeString()}</p>
          <p>Duration: {heatData.Duration_min} min</p>
        </CardContent>
      </Card>
    );
  }
  return null;
};

export function GanttChart({ data }: GanttChartProps) {
  const { chartData, heatToColor, earliestTime, latestTime } = useMemo(() => {
    if (data.length === 0) {
      return { chartData: [], heatToColor: new Map(), earliestTime: 0, latestTime: 0 };
    }

    const allTimes = data.flatMap(heat => heat.operations.flatMap(op => [op.startTime.getTime(), op.endTime.getTime()]));
    const earliest = Math.min(...allTimes);
    const latest = Math.max(...allTimes);

    const heatColorMap = new Map<string, string>();
    data.forEach((heat, i) => {
      heatColorMap.set(heat.Heat_ID, COLORS[i % COLORS.length]);
    });

    const transformedData = UNIT_ORDER.map(unit => {
      const entry: any = { unit, tooltips: {} };
      data.forEach(heat => {
        const op = heat.operations.find(o => o.unit === unit);
        if (op) {
          const startOffset = (op.startTime.getTime() - earliest) / (1000 * 60);
          const duration = op.Duration_min;
          entry[`${heat.Heat_ID}_start`] = startOffset;
          entry[`${heat.Heat_ID}_duration`] = duration;
          entry.tooltips[heat.Heat_ID] = { ...op, Heat_ID: heat.Heat_ID, Steel_Grade: heat.Steel_Grade };
        }
      });
      return entry;
    });

    return { chartData: transformedData, heatToColor: heatColorMap, earliestTime: earliest, latestTime: latest };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[600px] text-muted-foreground">
        <p>No valid data to display.</p>
      </div>
    );
  }

  const timeDomain = [0, (latestTime - earliestTime) / (1000 * 60)];
  const tickFormatter = (tick: number) => {
    const date = new Date(earliestTime + tick * 60000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };
  
  return (
    <ResponsiveContainer width="100%" height={600}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        barCategoryGap="20%"
      >
        <XAxis type="number" domain={timeDomain} tickFormatter={tickFormatter} />
        <YAxis type="category" dataKey="unit" width={60} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(206, 206, 206, 0.2)' }}/>
        <Legend />
        {data.map(heat => (
          <Bar
            key={`${heat.Heat_ID}_start`}
            dataKey={`${heat.Heat_ID}_start`}
            stackId="a"
            fill="transparent"
            isAnimationActive={false}
          />
        ))}
        {data.map(heat => (
          <Bar
            key={heat.Heat_ID}
            name={`Heat ${heat.Heat_ID}`}
            dataKey={`${heat.Heat_ID}_duration`}
            stackId="a"
            fill={heatToColor.get(heat.Heat_ID)}
            radius={[4, 4, 4, 4]}
          >
            <LabelList dataKey="tooltips" content={({ value, x, y, width, height }) => {
              const heatId = Object.keys(value).find(k => k === heat.Heat_ID);
              if (!heatId || width < 30) return null;
              return <text x={x + width / 2} y={y + height / 2} fill="#fff" textAnchor="middle" dominantBaseline="middle" fontSize="10">{heat.Heat_ID}</text>
            }} />
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
