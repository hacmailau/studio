
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
  Line,
  ComposedChart
} from "recharts";
import { useMemo } from "react";
import type { GanttHeat } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import _ from 'lodash';

interface GanttChartProps {
  data: GanttHeat[];
}

const UNIT_ORDER = [
  "KR1", "KR2", "BOF1", "BOF2", "BOF3", "BOF4", "BOF5", "LF1", "LF2", "LF3", "LF4", "LF5", "BCM1", "TSC1", "TSC2"
].reverse();

const COLORS = [
  "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd",
  "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"
];

function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}


const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const key = payload[0].dataKey;
    const heatIdMatch = key.match(/(.+)_(start|duration|idle)/);
    if (!heatIdMatch) return null;
    
    const heatId = heatIdMatch[1];
    const heatData = data.tooltips[heatId];

    if (!heatData) return null;

    return (
      <Card>
        <CardContent className="p-3 text-sm">
          <p className="font-bold">Mẻ thép: {heatData.Heat_ID} ({heatData.Steel_Grade})</p>
          <p>Thiết bị: {heatData.unit} ({heatData.group})</p>
          <hr className="my-1"/>
          <p>Bắt đầu: {heatData.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          <p>Kết thúc: {heatData.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          <p>Thời gian: {heatData.Duration_min} phút</p>
          {heatData.idleTimeMinutes > 0 && <p className="text-yellow-600">Chờ: {heatData.idleTimeMinutes} phút</p>}
        </CardContent>
      </Card>
    );
  }
  return null;
};

const ConnectingLine = (props: any) => {
    const { points, heatId, earliestTime, latestTime, domain, range } = props;

    if (points.length < 2) return null;
    
    const scaleX = (time: number) => {
        const timeOffset = (time - earliestTime) / (1000 * 60);
        return domain[0] + (timeOffset / ((latestTime - earliestTime) / (1000 * 60))) * (domain[1] - domain[0]);
    };
    
    const scaleY = (unit: string) => {
      const index = UNIT_ORDER.indexOf(unit);
      const band = (range[1] - range[0]) / UNIT_ORDER.length;
      return range[0] + band * (index + 0.5);
    };

    const pathPoints = [];
    for(let i=0; i<points.length -1; i++){
        const p1 = points[i];
        const p2 = points[i+1];
        
        const x1 = scaleX(p1.time);
        const y1 = scaleY(p1.unit);
        const x2 = scaleX(p2.time);
        const y2 = scaleY(p2.unit);
        
        if (!isNaN(x1) && !isNaN(y1) && !isNaN(x2) && !isNaN(y2)) {
          pathPoints.push(`M${x1},${y1}L${x2},${y2}`);
        }
    }
    
    return <path d={pathPoints.join('')} stroke={props.stroke} strokeDasharray="3 3" fill="none" />;
};


export function GanttChart({ data }: GanttChartProps) {
  const { chartData, heatToColor, earliestTime, latestTime, connectingLines } = useMemo(() => {
    if (data.length === 0) {
      return { chartData: [], heatToColor: new Map(), earliestTime: 0, latestTime: 0, connectingLines: [] };
    }

    const allTimes = data.flatMap(heat => heat.operations.flatMap(op => [op.startTime.getTime(), op.endTime.getTime()]));
    const earliest = Math.min(...allTimes);
    const latest = Math.max(...allTimes);

    const heatColorMap = new Map<string, string>();
    data.forEach((heat, i) => {
      heatColorMap.set(heat.Heat_ID, COLORS[i % COLORS.length]);
    });
    
    const lines: any[] = [];

    const transformedData = UNIT_ORDER.map(unit => {
      const entry: any = { unit, tooltips: {} };
      data.forEach(heat => {
        const op = heat.operations.find(o => o.unit === unit);
        if (op) {
          const idleDuration = op.idleTimeMinutes || 0;
          const idleStart = (op.startTime.getTime() - earliest - idleDuration * 60000) / (1000 * 60);
          const opStart = (op.startTime.getTime() - earliest) / (1000 * 60);

          entry[`${heat.Heat_ID}_idle`] = idleDuration > 0 ? idleDuration : 0;
          entry[`${heat.Heat_ID}_idle_start`] = idleStart;

          entry[`${heat.Heat_ID}_start`] = opStart - (idleDuration > 0 ? idleStart: 0) ; // Transparent bar
          entry[`${heat.Heat_ID}_duration`] = op.Duration_min;
          
          entry.tooltips[heat.Heat_ID] = { ...op, Heat_ID: heat.Heat_ID, Steel_Grade: heat.Steel_Grade };
        }
      });
      return entry;
    });

    data.forEach(heat => {
        const heatOps = _.sortBy(heat.operations, 'startTime');
        const points = heatOps.flatMap(op => [
            {unit: op.unit, time: op.startTime.getTime()},
            {unit: op.unit, time: op.endTime.getTime()},
        ]);
        lines.push({
            heatId: heat.Heat_ID,
            points: points,
            color: heatColorMap.get(heat.Heat_ID)
        })
    });


    return { chartData: transformedData, heatToColor: heatColorMap, earliestTime: earliest, latestTime: latest, connectingLines: lines };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[600px] text-muted-foreground">
        <p>Không có dữ liệu hợp lệ để hiển thị.</p>
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
      <ComposedChart
        data={chartData}
        layout="vertical"
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        barCategoryGap="35%"
      >
        <XAxis type="number" domain={timeDomain} tickFormatter={tickFormatter} axisLine={false} tickLine={false}/>
        <YAxis type="category" dataKey="unit" width={60} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(206, 206, 206, 0.2)' }}/>
        <Legend />
        
        {/* Transparent bars for stacking */}
        {data.map(heat => (
            <Bar key={`${heat.Heat_ID}_start`} dataKey={`${heat.Heat_ID}_start`} stackId="a" fill="transparent" isAnimationActive={false} />
        ))}
        
        {/* Idle time bars */}
        {data.map(heat => (
          <Bar
            key={`${heat.Heat_ID}_idle_bar`}
            dataKey={`${heat.Heat_ID}_idle`}
            stackId="a"
            fill={hexToRgba(heatToColor.get(heat.Heat_ID) || '#000000', 0.4)}
            radius={[4, 0, 0, 4]}
            isAnimationActive={false}
          />
        ))}

        {/* Main operation bars */}
        {data.map(heat => (
          <Bar
            key={`${heat.Heat_ID}_duration_bar`}
            name={`Mẻ ${heat.Heat_ID}`}
            dataKey={`${heat.Heat_ID}_duration`}
            stackId="a"
            fill={heatToColor.get(heat.Heat_ID)}
            radius={[0, 4, 4, 0]}
          >
            <LabelList dataKey="tooltips" content={({ value, x, y, width, height }) => {
              const heatId = Object.keys(value).find(k => k === heat.Heat_ID);
              if (!heatId || width < 40) return null;
              return <text x={x + width / 2} y={y + height / 2} fill="#fff" textAnchor="middle" dominantBaseline="middle" fontSize="10">{heat.Heat_ID}</text>
            }} />
          </Bar>
        ))}

        {/* Connecting Lines */}
        {connectingLines.map(lineInfo => (
            <Line
                key={`line-${lineInfo.heatId}`}
                data={lineInfo.points.map(p => ({
                    unit: p.unit,
                    time: (p.time - earliestTime) / (1000 * 60)
                }))}
                dataKey="time"
                name={lineInfo.heatId}
                stroke={lineInfo.color}
                strokeWidth={1.5}
                strokeDasharray="3 3"
                dot={false}
                isAnimationActive={false}
                connectNulls={false}
                xAxisId={0}
                yAxisId={0}
            />
        ))}


      </ComposedChart>
    </ResponsiveContainer>
  );
}
