"use client";

import React from "react";
import { TrendingUp, TrendingDown, Activity, BarChart3, Target } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

// Fixed chart data with proper property names
const chartData = [
  {
    anomaly: "Pole",
    previousMonth: 2386,
    currentMonth: 1089,
    change: -54.3,
  },
  {
    anomaly: "Crack",
    previousMonth: 1503,
    currentMonth: 796,
    change: -47.0,
  },
  {
    anomaly: "Crosswalk Blur",
    previousMonth: 237,
    currentMonth: 120,
    change: -49.4,
  },
  {
    anomaly: "Lane Blur",
    previousMonth: 2373,
    currentMonth: 1290,
    change: -45.6,
  },
  {
    anomaly: "Pothole",
    previousMonth: 109,
    currentMonth: 130,
    change: 19.3,
  },
];

// Blue color scheme configuration
const chartConfig: ChartConfig = {
  previousMonth: {
    label: "Previous Month",
    color: "#3b82f6", // Blue-500
  },
  currentMonth: {
    label: "Current Month",
    color: "#93c5fd", // Blue-300 (Light Blue)
  },
};

// Calculate totals for summary
const totalPrevious = chartData.reduce(
  (sum, item) => sum + item.previousMonth,
  0
);
const totalCurrent = chartData.reduce(
  (sum, item) => sum + item.currentMonth,
  0
);
const overallChange = ((totalCurrent - totalPrevious) / totalPrevious) * 100;

export function ChartBarMultiple() {
  return (
    <div className="flex flex-col p-6 bg-slate-700/65 rounded-2xl shadow-xl w-full space-y-6">
      {/* Enhanced Header */}
      <div className="text-center mb-2">
        <h2 className="text-2xl font-bold text-gray-200 mb-2 flex items-center justify-center gap-2">
          <BarChart3 className="h-6 w-6 text-gray-200" />
          Anomaly Detection Dashboard
        </h2>
        <p className="text-gray-400 text-sm">Real-time monitoring and analysis of road infrastructure anomalies</p>
      </div>

      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-blue-500 bg-white/80 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">
              Previous Month
            </CardTitle>
            <div className="p-2 bg-blue-100 rounded-full">
              <Activity className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {totalPrevious.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500">Total anomalies detected</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-300 bg-white/80 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">
              Current Month
            </CardTitle>
            <div className="p-2 bg-blue-100 rounded-full">
              <Target className="h-4 w-4 text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {totalCurrent.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500">Total anomalies detected</p>
          </CardContent>
        </Card>

        <Card className={`border-l-4 ${overallChange > 0 ? 'border-l-red-500' : 'border-l-green-500'} bg-white/80 backdrop-blur`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">
              Overall Change
            </CardTitle>
            <div className={`p-2 rounded-full ${overallChange > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
              {overallChange > 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                overallChange > 0 ? "text-red-600" : "text-green-600"
              }`}
            >
              {overallChange > 0 ? "+" : ""}
              {overallChange.toFixed(1)}%
            </div>
            <p className="text-xs text-gray-500">
              {overallChange > 0 ? "Increase" : "Decrease"} from last month
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Main Chart - Takes 3 columns */}
        <Card className="xl:col-span-3 bg-white/90 backdrop-blur shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Anomaly Detection Comparison
            </CardTitle>
            <CardDescription className="text-sm text-gray-600">
              Monthly comparison of detected road anomalies by category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 50,
                  }}
                  barGap={8}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-gray-200"
                    opacity={0.6}
                  />
                  <XAxis
                    dataKey="anomaly"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    className="text-xs fill-gray-600"
                    interval={0}
                    angle={-35}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    className="text-xs fill-gray-600"
                    tickFormatter={(value) =>
                      value > 1000
                        ? `${(value / 1000).toFixed(1)}k`
                        : value.toString()
                    }
                  />
                  <ChartTooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-lg border bg-white p-3 shadow-lg">
                            <div className="font-semibold mb-2 text-gray-900">
                              {label}
                            </div>
                            <div className="space-y-2">
                              {payload.map((entry, index) => (
                                <div
                                  key={index}
                                  className="flex items-center gap-2"
                                >
                                  <div
                                    className="h-3 w-3 rounded-full"
                                    style={{ backgroundColor: entry.color }}
                                  />
                                  <span className="text-sm text-gray-700">
                                    {entry.name}:{" "}
                                    <span className="font-semibold">
                                      {entry.value?.toLocaleString()}
                                    </span>
                                  </span>
                                </div>
                              ))}
                              <div
                                className={`text-sm font-semibold pt-1 ${
                                  data.change > 0
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                Change: {data.change > 0 ? "+" : ""}
                                {data.change}%
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="previousMonth"
                    name="Previous Month"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="currentMonth"
                    name="Current Month"
                    fill="#93c5fd"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
          
        </Card>

        {/* Category Performance - Takes 2 columns */}
        <Card className="xl:col-span-2 bg-white/90 backdrop-blur shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-gray-900 flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              Category Performance
            </CardTitle>
            <CardDescription className="text-xs text-gray-600">
              Individual anomaly type changes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {chartData.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border bg-gradient-to-r from-blue-50 to-white hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex flex-col">
                    <div className="font-semibold text-sm text-gray-900">{item.anomaly}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        {item.previousMonth.toLocaleString()}
                      </span>
                      <span>→</span>
                      <span className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-blue-300"></div>
                        {item.currentMonth.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div
                    className={`flex items-center gap-1 font-semibold text-sm px-2 py-1 rounded-full ${
                      item.change > 0
                        ? "text-green-700 bg-green-100"
                        : "text-red-700 bg-red-100"
                    }`}
                  >
                    {item.change > 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {item.change > 0 ? "+" : ""}
                    {item.change}%
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="pt-4">
            <div className="w-full p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 text-xs text-blue-800">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span>Previous Month</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-blue-300"></div>
                  <span>Current Month</span>
                </div>
              </div>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}