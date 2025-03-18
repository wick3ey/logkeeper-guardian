
import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";

interface ActivityData {
  name: string;
  keystrokes: number;
  screenshots: number;
  clipboard: number;
}

interface ActivityChartProps {
  data: ActivityData[];
}

const chartConfig = {
  keystrokes: {
    label: "Tangenttryckningar",
    theme: {
      light: "hsl(215, 100%, 50%)",
      dark: "hsl(215, 100%, 60%)",
    },
  },
  screenshots: {
    label: "Skärmdumpar",
    theme: {
      light: "hsl(140, 100%, 40%)",
      dark: "hsl(140, 100%, 50%)",
    },
  },
  clipboard: {
    label: "Klippbord",
    theme: {
      light: "hsl(45, 100%, 50%)",
      dark: "hsl(45, 100%, 60%)",
    },
  },
};

export function ActivityChart({ data }: ActivityChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-80">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-[300px]">
      <AreaChart
        data={data}
        margin={{
          top: 10,
          right: 30,
          left: 0,
          bottom: 0,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip content={<ChartTooltipContent nameKey="name" />} />
        <Legend />
        <Area
          type="monotone"
          dataKey="keystrokes"
          stackId="1"
          stroke="var(--color-keystrokes)"
          fill="var(--color-keystrokes)"
          fillOpacity={0.6}
        />
        <Area
          type="monotone"
          dataKey="screenshots"
          stackId="1"
          stroke="var(--color-screenshots)"
          fill="var(--color-screenshots)"
          fillOpacity={0.6}
        />
        <Area
          type="monotone"
          dataKey="clipboard"
          stackId="1"
          stroke="var(--color-clipboard)"
          fill="var(--color-clipboard)"
          fillOpacity={0.6}
        />
      </AreaChart>
    </ChartContainer>
  );
}
