// components/SystemDashboard.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Cpu, HardDrive, Thermometer, Zap, Activity, MemoryStick } from 'lucide-react';
import { SystemMetrics } from '../types';

interface SystemDashboardProps {
  metrics: SystemMetrics[];
  className?: string;
}

const SystemDashboard: React.FC<SystemDashboardProps> = ({ metrics, className = '' }) => {
  const latestMetrics = metrics[metrics.length - 1];
  
  if (!latestMetrics) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            System Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500">No system metrics available</div>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data (last 20 data points)
  const chartData = metrics.slice(-20).map((metric, index) => ({
    index,
    time: metric.time.split('.')[0], // Remove milliseconds
    cpu: metric.cpu_usage_percent,
    gpu: metric.gpu_usage_percent,
    memory: metric.memory_usage_percent,
    cpuTemp: metric.cpu_temp_celsius,
    gpuTemp: metric.gpu_temp_celsius,
    power: metric.power_total_watts
  }));

  const getStatusColor = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return 'bg-red-500';
    if (value >= thresholds.warning) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes: number, unit: string = 'MB') => {
    if (unit === 'GB') return `${(bytes / 1024).toFixed(1)} GB`;
    return `${bytes.toFixed(0)} MB`;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* CPU Usage */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Cpu className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium">CPU</span>
                </div>
                <div className="text-2xl font-bold">{latestMetrics.cpu_usage_percent.toFixed(1)}%</div>
              </div>
              <div className={`w-3 h-3 rounded-full ${getStatusColor(latestMetrics.cpu_usage_percent, { warning: 70, critical: 90 })}`} />
            </div>
            <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${Math.min(latestMetrics.cpu_usage_percent, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* GPU Usage */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium">GPU</span>
                </div>
                <div className="text-2xl font-bold">{latestMetrics.gpu_usage_percent.toFixed(1)}%</div>
              </div>
              <div className={`w-3 h-3 rounded-full ${getStatusColor(latestMetrics.gpu_usage_percent, { warning: 80, critical: 95 })}`} />
            </div>
            <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${Math.min(latestMetrics.gpu_usage_percent, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Memory Usage */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <MemoryStick className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-medium">Memory</span>
                </div>
                <div className="text-2xl font-bold">{latestMetrics.memory_usage_percent.toFixed(1)}%</div>
                <div className="text-xs text-gray-500">
                  {formatBytes(latestMetrics.memory_used_mb)} / {formatBytes(latestMetrics.memory_total_mb)}
                </div>
              </div>
              <div className={`w-3 h-3 rounded-full ${getStatusColor(latestMetrics.memory_usage_percent, { warning: 80, critical: 95 })}`} />
            </div>
            <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-purple-500 transition-all duration-300"
                style={{ width: `${Math.min(latestMetrics.memory_usage_percent, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Power Consumption */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm font-medium">Power</span>
                </div>
                <div className="text-2xl font-bold">{latestMetrics.power_total_watts.toFixed(1)}W</div>
                <div className="text-xs text-gray-500">
                  CPU: {latestMetrics.power_cpu_watts.toFixed(1)}W | GPU: {latestMetrics.power_gpu_watts.toFixed(1)}W
                </div>
              </div>
              <div className={`w-3 h-3 rounded-full ${getStatusColor(latestMetrics.power_total_watts, { warning: 20, critical: 30 })}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CPU/GPU Usage Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">CPU & GPU Usage Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="time" 
                  fontSize={10}
                  tick={{ fontSize: 10 }}
                />
                <YAxis 
                  domain={[0, 100]}
                  fontSize={10}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    `${value.toFixed(1)}%`, 
                    name === 'cpu' ? 'CPU' : 'GPU'
                  ]}
                />
                <Line type="monotone" dataKey="cpu" stroke="#3B82F6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="gpu" stroke="#10B981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Temperature Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Temperature Monitoring</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="time" 
                  fontSize={10}
                  tick={{ fontSize: 10 }}
                />
                <YAxis 
                  domain={[0, 100]}
                  fontSize={10}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    `${value.toFixed(1)}°C`, 
                    name === 'cpuTemp' ? 'CPU' : 'GPU'
                  ]}
                />
                <Area type="monotone" dataKey="cpuTemp" stackId="1" stroke="#EF4444" fill="#EF4444" fillOpacity={0.3} />
                <Area type="monotone" dataKey="gpuTemp" stackId="2" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            System Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* Storage */}
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <HardDrive className="w-4 h-4" />
                Storage
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Used:</span>
                  <span>{formatBytes(latestMetrics.disk_used_gb, 'GB')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total:</span>
                  <span>{formatBytes(latestMetrics.disk_total_gb, 'GB')}</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500"
                    style={{ width: `${Math.min(latestMetrics.disk_usage_percent, 100)}%` }}
                  />
                </div>
                <div className="text-xs text-center">{latestMetrics.disk_usage_percent.toFixed(1)}% used</div>
              </div>
            </div>

            {/* Temperature */}
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Thermometer className="w-4 h-4" />
                Temperature
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>CPU:</span>
                  <Badge variant={latestMetrics.cpu_temp_celsius > 80 ? 'destructive' : 'secondary'}>
                    {latestMetrics.cpu_temp_celsius.toFixed(1)}°C
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>GPU:</span>
                  <Badge variant={latestMetrics.gpu_temp_celsius > 85 ? 'destructive' : 'secondary'}>
                    {latestMetrics.gpu_temp_celsius.toFixed(1)}°C
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Thermal:</span>
                  <Badge variant={latestMetrics.thermal_temp_celsius > 85 ? 'destructive' : 'secondary'}>
                    {latestMetrics.thermal_temp_celsius.toFixed(1)}°C
                  </Badge>
                </div>
              </div>
            </div>

            {/* Memory Details */}
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <MemoryStick className="w-4 h-4" />
                Memory
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>RAM:</span>
                  <span>{latestMetrics.memory_usage_percent.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Swap:</span>
                  <span>{latestMetrics.swap_usage_percent.toFixed(1)}%</span>
                </div>
                <div className="text-xs text-gray-500">
                  Swap: {formatBytes(latestMetrics.swap_used_mb)} / {formatBytes(latestMetrics.swap_total_mb)}
                </div>
              </div>
            </div>

            {/* System Info */}
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                System
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Fan:</span>
                  <span>{latestMetrics.fan_speed_percent.toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Uptime:</span>
                  <span className="text-xs">{formatUptime(latestMetrics.uptime_seconds)}</span>
                </div>
                <div className="text-xs text-gray-500">
                  Last updated: {latestMetrics.time.split('.')[0]}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemDashboard;