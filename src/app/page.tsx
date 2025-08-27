// src/app/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Camera as CameraIcon,
  FolderOpen,
  Navigation,
} from "lucide-react";

// Import your existing SystemDashboard component
import SystemDashboard from "@/components/SystemDashboard";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Panels / viewers
import ControlPanel from "@/components/ControlPanel";
import GPSViewer from "@/components/GPSViewer";
import CameraAnomalyExplorer from "@/components/CameraAnomalyExplorer";
import GPSControlPanel from "@/components/GPSControlPanel";

// ---- Types to match your DataLoader & components ----
interface DetectionData {
  frameNum: number;
  streamId: number;
  className: string;
  confidence: number;
  left: number;
  top: number;
  width: number;
  height: number;
  timestamp?: string;
  imagePath?: string;
}

interface ImageData {
  timestamp: string;
  date: string;
  time: string;
  latitude: number;
  longitude: number;
  detections: DetectionData[];
  images: { [cameraName: string]: { [className: string]: string[] } };
  fullPaths: { [cameraName: string]: { [className: string]: string[] } };
}

interface CameraInfo {
  name: string;
  displayName: string;
  type: string;
  resolution: string;
  color: string;
  description?: string;
  detectionCount: number;
  classes: string[];
  session: string;
  imageCount: number;
}

interface SystemMetrics {
  timestamp: string;
  time: string;
  date: string;
  cpu_usage_percent: number;
  gpu_usage_percent: number;
  memory_usage_percent: number;
  memory_used_mb: number;
  memory_total_mb: number;
  swap_usage_percent: number;
  swap_used_mb: number;
  swap_total_mb: number;
  disk_usage_percent: number;
  disk_used_gb: number;
  disk_total_gb: number;
  cpu_temp_celsius: number;
  gpu_temp_celsius: number;
  thermal_temp_celsius: number;
  fan_speed_percent: number;
  power_total_watts: number;
  power_cpu_watts: number;
  power_gpu_watts: number;
  uptime_seconds: number;
}

export interface GPSData {
  timestamp: string;
  time: string;
  date: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  speed?: number;
  heading?: number;
}

interface SessionData {
  sessionName: string;
  sessionPath: string;
  cameras: CameraInfo[];
  timeline: ImageData[];
  gpsData: GPSData[];
  systemMetrics: SystemMetrics[];
}

// Import your existing SystemDashboard component

// ---- Helper: GPSData[] -> ImageData[] so GPSViewer gets the right shape ----
const gpsToImageData = (gpsData: GPSData[]): ImageData[] =>
  gpsData.map((g) => ({
    timestamp: g.timestamp,
    date: g.date,
    time: g.time,
    latitude: g.latitude,
    longitude: g.longitude,
    detections: [],
    images: {},
    fullPaths: {},
  }));

// ---- Demo loader fallback (replace with your DataLoader instance) ----
async function fetchSession(serverUrl: string): Promise<SessionData> {
  try {
    const dash = await fetch(`${serverUrl}/api/dashboard`).then((r) => r.json());
    const gps = await fetch(`${serverUrl}/api/gps-data`)
      .then((r) => r.json())
      .catch(() => ({ success: false, data: [] }));
    const sys = await fetch(`${serverUrl}/api/system-metrics`)
      .then((r) => r.json())
      .catch(() => ({ success: false, data: [] }));

    console.log('System metrics response:', sys); // Debug log

    // Build minimal session shape so page renders right away
    const gpsData: GPSData[] = (gps?.success ? gps.data : []).map((row: any) => ({
      timestamp:
        row.timestamp || `${row.date ?? "2025-01-01"} ${row.time ?? "00:00:00"}`,
      date: row.date ?? "2025-01-01",
      time: row.time ?? "00:00:00",
      latitude: parseFloat(row.latitude ?? row.lat ?? 0),
      longitude: parseFloat(row.longitude ?? row.lng ?? row.lon ?? 0),
      altitude: row.altitude ? parseFloat(row.altitude) : undefined,
      speed: row.speed ? parseFloat(row.speed) : undefined,
      heading: row.heading ? parseFloat(row.heading) : undefined,
    }));

    // Process system metrics
    const systemMetrics: SystemMetrics[] = (sys?.success ? sys.data : []).map((row: any) => ({
      timestamp: row.timestamp || `${row.date ?? "2025-01-01"} ${row.time ?? "00:00:00"}`,
      time: row.time ?? "00:00:00",
      date: row.date ?? "2025-01-01",
      cpu_usage_percent: parseFloat(row.cpu_usage_percent ?? 0),
      gpu_usage_percent: parseFloat(row.gpu_usage_percent ?? 0),
      memory_usage_percent: parseFloat(row.memory_usage_percent ?? 0),
      memory_used_mb: parseFloat(row.memory_used_mb ?? 0),
      memory_total_mb: parseFloat(row.memory_total_mb ?? 0),
      swap_usage_percent: parseFloat(row.swap_usage_percent ?? 0),
      swap_used_mb: parseFloat(row.swap_used_mb ?? 0),
      swap_total_mb: parseFloat(row.swap_total_mb ?? 0),
      disk_usage_percent: parseFloat(row.disk_usage_percent ?? 0),
      disk_used_gb: parseFloat(row.disk_used_gb ?? 0),
      disk_total_gb: parseFloat(row.disk_total_gb ?? 0),
      cpu_temp_celsius: parseFloat(row.cpu_temp_celsius ?? 0),
      gpu_temp_celsius: parseFloat(row.gpu_temp_celsius ?? 0),
      thermal_temp_celsius: parseFloat(row.thermal_temp_celsius ?? 0),
      fan_speed_percent: parseFloat(row.fan_speed_percent ?? 0),
      power_total_watts: parseFloat(row.power_total_watts ?? 0),
      power_cpu_watts: parseFloat(row.power_cpu_watts ?? 0),
      power_gpu_watts: parseFloat(row.power_gpu_watts ?? 0),
      uptime_seconds: parseFloat(row.uptime_seconds ?? 0),
    }));

    // Create a tiny timeline aligned with GPS to show something initially
    const timeline: ImageData[] = gpsToImageData(gpsData);

    const cameras: CameraInfo[] = Object.entries(
      dash?.summary?.anomalies ?? {}
    ).flatMap(([camName, classes]: [string, any]) => {
      const imgCount = Object.values(classes ?? {}).reduce(
        (s: number, c: any) => s + (c?.imageCount ?? 0),
        0
      );
      const detCount = Object.values(classes ?? {}).reduce(
        (s: number, c: any) => s + (c?.recordCount ?? 0),
        0
      );
      const sessions = new Set<string>();
      Object.values(classes ?? {}).forEach(
        (c: any) => c?.session && sessions.add(c.session)
      );
      const session = Array.from(sessions)[0] ?? "F2";
      return [
        {
          name: camName,
          displayName: camName,
          type: "Unknown",
          resolution: "1920x1080",
          color: "#6B7280",
          description: `Auto from dashboard`,
          detectionCount: detCount,
          classes: Object.keys(classes ?? {}),
          session,
          imageCount: imgCount,
        },
      ];
    });

    return {
      sessionName: dash?.success ? "Surveillance Session" : "Local Session",
      sessionPath: serverUrl,
      cameras,
      timeline,
      gpsData,
      systemMetrics,
    };
  } catch (error) {
    console.error('Failed to fetch session data:', error);
    return {
      sessionName: "Error Loading Session",
      sessionPath: serverUrl,
      cameras: [],
      timeline: [],
      gpsData: [],
      systemMetrics: [],
    };
  }
}

export default function Page() {
  // ---- Config ----
  const [serverUrl, setServerUrl] = useState("http://localhost:8081");

  // ---- Data ----
  const [sessionData, setSessionData] = useState<SessionData>({
    sessionName: "Loading…",
    sessionPath: serverUrl,
    cameras: [],
    timeline: [],
    gpsData: [],
    systemMetrics: [],
  });

  // ---- Global timeline playback (ControlPanel drives this) ----
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Tabs
  const [activeTab, setActiveTab] = useState<"explorer" | "gps" | "system">(
    "explorer"
  );

  // Derived
  const currentData: ImageData =
    sessionData.timeline[currentIndex] ||
    ({
      timestamp: "N/A",
      date: "N/A",
      time: "N/A",
      latitude: 0,
      longitude: 0,
      detections: [],
      images: {},
      fullPaths: {},
    } as ImageData);

  // ---- Load session on mount / server change ----
  useEffect(() => {
    (async () => {
      const data = await fetchSession(serverUrl);
      setSessionData(data);
      setCurrentIndex(0);
    })();
  }, [serverUrl]);

  // ---- Playback tick ----
  useEffect(() => {
    if (!isPlaying) return;
    if (!sessionData.timeline.length) return;
    const id = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % sessionData.timeline.length);
    }, Math.max(50, 1000 / playbackSpeed));
    return () => clearInterval(id);
  }, [isPlaying, playbackSpeed, sessionData.timeline.length]);

  // ---- Control handlers for ControlPanel ----
  const handleIndexChange = (i: number) =>
    setCurrentIndex(Math.max(0, Math.min(sessionData.timeline.length - 1, i)));
  const handlePlayPause = () => setIsPlaying((p) => !p);
  const handleSpeedChange = (s: number) => setPlaybackSpeed(s);

  const handleLoadSession = (url: string) => {
    setServerUrl(url || "http://localhost:8081");
  };

  const handleRefresh = async () => {
    const data = await fetchSession(serverUrl);
    setSessionData(data);
    setCurrentIndex(0);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Retrofit Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">
                Session: {sessionData.sessionName} • Server: {serverUrl}
              </p>
            </div>
            <div className="text-right text-sm text-gray-500">
              <div>Timeline: {sessionData.timeline.length} frames</div>
              <div>GPS: {sessionData.gpsData.length} points</div>
              <div>Cameras: {sessionData.cameras.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <Tabs
          value={activeTab}
          onValueChange={(v: any) => setActiveTab(v)}
          className="w-full"
        >
          {/* Tab Navigation */}
          <div className="flex justify-center mb-6">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger
                value="explorer"
                className="flex items-center gap-2"
              >
                <CameraIcon className="w-4 h-4" />
                Cameras
              </TabsTrigger>
              <TabsTrigger value="gps" className="flex items-center gap-2">
                <Navigation className="w-4 h-4" />
                GPS
              </TabsTrigger>
              <TabsTrigger value="system" className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                System
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab Content */}
          <div className="w-full">
            {/* Camera Explorer Tab */}
            <TabsContent value="explorer" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FolderOpen className="w-5 h-5 text-blue-500" />
                    Camera / Anomaly Explorer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CameraAnomalyExplorer serverUrl={serverUrl} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* GPS Tab */}
            <TabsContent value="gps" className="mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1">
                  {typeof GPSControlPanel === "function" && (
                    <GPSControlPanel
                      gpsData={sessionData.gpsData}
                      currentIndex={currentIndex}
                      isPlaying={isPlaying}
                      playbackSpeed={playbackSpeed}
                      onIndexChange={handleIndexChange}
                      onPlayPause={handlePlayPause}
                      onSpeedChange={handleSpeedChange}
                    />
                  )}
                </div>
                <div className="lg:col-span-3">
                  <GPSViewer
                    currentData={
                      gpsToImageData(sessionData.gpsData)[currentIndex] ??
                      gpsToImageData(sessionData.gpsData)[0]
                    }
                    allData={gpsToImageData(sessionData.gpsData)}
                    gpsData={sessionData.gpsData}
                  />
                </div>
              </div>
            </TabsContent>

            {/* System Metrics Tab */}
            <TabsContent value="system" className="mt-0">
              <SystemDashboard metrics={sessionData.systemMetrics} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}