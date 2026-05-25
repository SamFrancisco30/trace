"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import type {
  AllocationItem,
  WeeklyTradeItem,
  WeeklySentimentItem,
} from "@/lib/stats";
import { useState } from "react";

/* -------------------------------------------------------------------------- */
/*  Tab definitions                                                           */
/* -------------------------------------------------------------------------- */

const tabs = [
  { key: "allocation", label: "Allocation" },
  { key: "frequency", label: "Trade Frequency" },
  { key: "sentiment", label: "Sentiment Trend" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

/* -------------------------------------------------------------------------- */
/*  Colors                                                                    */
/* -------------------------------------------------------------------------- */

const PIE_COLORS = [
  "#000000",
  "#525252",
  "#a3a3a3",
  "#d4d4d4",
  "#737373",
  "#e5e5e5",
  "#404040",
  "#171717",
];

const SENTIMENT_COLORS: Record<string, string> = {
  bullish: "#000000",
  bearish: "#525252",
  neutral: "#a3a3a3",
  mixed: "#d4d4d4",
};

/* -------------------------------------------------------------------------- */
/*  Props                                                                     */
/* -------------------------------------------------------------------------- */

type StatsChartsProps = {
  allocation: AllocationItem[];
  weeklyTrades: WeeklyTradeItem[];
  weeklySentiment: WeeklySentimentItem[];
};

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/* -------------------------------------------------------------------------- */
/*  Main component                                                            */
/* -------------------------------------------------------------------------- */

export function StatsCharts({
  allocation,
  weeklyTrades,
  weeklySentiment,
}: StatsChartsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("allocation");

  return (
    <section className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-4 py-2 text-sm transition-colors",
              activeTab === tab.key
                ? "border-b-2 border-black font-medium text-black"
                : "text-zinc-500 hover:text-zinc-700",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Chart area */}
      <div className="min-h-[360px]">
        {activeTab === "allocation" && (
          <AllocationChart allocation={allocation} />
        )}
        {activeTab === "frequency" && (
          <FrequencyChart weeklyTrades={weeklyTrades} />
        )}
        {activeTab === "sentiment" && (
          <SentimentChart weeklySentiment={weeklySentiment} />
        )}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Allocation pie chart                                                      */
/* -------------------------------------------------------------------------- */

function AllocationChart({ allocation }: { allocation: AllocationItem[] }) {
  if (allocation.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No portfolio positions yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <ResponsiveContainer width="100%" height={320} maxHeight={320}>
        <PieChart>
          <Pie
            data={allocation}
            dataKey="value"
            nameKey="ticker"
            cx="50%"
            cy="50%"
            outerRadius={110}
            innerRadius={50}
            paddingAngle={2}
          >
            {allocation.map((_, index) => (
              <Cell
                key={index}
                fill={PIE_COLORS[index % PIE_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => formatCurrency(Number(value) || 0)}
            contentStyle={{
              borderRadius: "6px",
              border: "1px solid #e4e4e7",
              fontSize: "13px",
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-2 pt-2 text-sm">
        {allocation.map((item) => (
          <div
            key={item.ticker}
            className="flex items-center gap-2 whitespace-nowrap"
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{
                backgroundColor:
                  PIE_COLORS[allocation.indexOf(item) % PIE_COLORS.length],
              }}
            />
            <span className="font-medium tabular-nums">{item.ticker}</span>
            <span className="tabular-nums text-zinc-500">
              {formatCurrency(item.value)} ({item.percentage.toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Weekly frequency bar chart                                                */
/* -------------------------------------------------------------------------- */

function FrequencyChart({
  weeklyTrades,
}: {
  weeklyTrades: WeeklyTradeItem[];
}) {
  if (weeklyTrades.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No trade events in the past 12 weeks.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={weeklyTrades}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
        <XAxis
          dataKey="weekLabel"
          tick={{ fontSize: 12, fill: "#71717a" }}
          axisLine={{ stroke: "#e4e4e7" }}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 12, fill: "#71717a" }}
          axisLine={{ stroke: "#e4e4e7" }}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            borderRadius: "6px",
            border: "1px solid #e4e4e7",
            fontSize: "13px",
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: "13px" }}
        />
        <Bar dataKey="buys" name="BUY" fill="#000000" radius={[3, 3, 0, 0]} />
        <Bar
          dataKey="sells"
          name="SELL"
          fill="#a3a3a3"
          radius={[3, 3, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* -------------------------------------------------------------------------- */
/*  Weekly sentiment line chart                                               */
/* -------------------------------------------------------------------------- */

function SentimentChart({
  weeklySentiment,
}: {
  weeklySentiment: WeeklySentimentItem[];
}) {
  if (weeklySentiment.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No sentiment data in the past 12 weeks.
      </p>
    );
  }

  const lines: { key: keyof Omit<WeeklySentimentItem, "weekLabel">; label: string }[] =
    [
      { key: "bullish", label: "BULLISH" },
      { key: "bearish", label: "BEARISH" },
      { key: "neutral", label: "NEUTRAL" },
      { key: "mixed", label: "MIXED" },
    ];

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={weeklySentiment}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
        <XAxis
          dataKey="weekLabel"
          tick={{ fontSize: 12, fill: "#71717a" }}
          axisLine={{ stroke: "#e4e4e7" }}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 12, fill: "#71717a" }}
          axisLine={{ stroke: "#e4e4e7" }}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            borderRadius: "6px",
            border: "1px solid #e4e4e7",
            fontSize: "13px",
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: "13px" }}
        />
        {lines.map(({ key, label }) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            name={label}
            stroke={SENTIMENT_COLORS[key]}
            strokeWidth={2}
            dot={{ r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}