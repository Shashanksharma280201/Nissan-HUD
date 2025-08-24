// types.ts - Updated types for server API integration
export interface DetectionData {
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

export interface ImageData {
  timestamp: string;
  date: string;
  time: string;
  latitude: number;
  longitude: number;
  detections: DetectionData[];
  images: { [cameraName: string]: { [className: string]: string[] } };
  fullPaths: { [cameraName: string]: { [className: string]: string[] } };
}

export interface CameraInfo {
  name: string;
  displayName: string;
  type: string;
  resolution: string;
  color: string;
  description?: string;
  detectionCount: number;
  classes: string[];
}

export interface SystemMetrics {
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

export interface SessionData {
  sessionName: string;
  sessionPath: string;
  cameras: CameraInfo[];
  timeline: ImageData[];
  gpsData: GPSData[];
  systemMetrics: SystemMetrics[];
}

// API Response interfaces
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface DashboardSummary {
  success: boolean;
  timestamp: string;
  summary: {
    gps: {
      available: boolean;
      recordCount?: number;
      lastRecord?: any;
      error?: string;
    };
    systemMetrics: {
      available: boolean;
      recordCount?: number;
      lastRecord?: any;
      error?: string;
    };
    anomalies: {
      [cameraName: string]: {
        [anomalyType: string]: {
          session: string;
          recordCount: number;
          lastDetection?: any;
        };
      };
    };
    totalMetadataFiles: number;
  };
}

export interface MetadataFile {
  session: string;
  camera: string;
  anomalyType: string;
  path: string;
}

// Camera configurations for UI
export const CAMERA_CONFIGS = [
  {
    name: '4kcam',
    displayName: '4K Camera',
    type: 'High Resolution',
    resolution: '4096x2160',
    color: '#3B82F6',
    description: 'High-resolution 4K road inspection camera'
  },
  {
    name: 'cam1',
    displayName: 'Camera 1',
    type: 'Standard',
    resolution: '1920x1080',
    color: '#10B981',
    description: 'Standard resolution road inspection camera'
  },
  {
    name: 'argus0',
    displayName: 'Argus Camera 0',
    type: 'Multi-sensor',
    resolution: '1920x1080',
    color: '#F59E0B',
    description: 'Multi-sensor inspection camera'
  },
  {
    name: 'argus1',
    displayName: 'Argus Camera 1',
    type: 'Multi-sensor',
    resolution: '1920x1080',
    color: '#EF4444',
    description: 'Multi-sensor inspection camera'
  }
];

// Class color mappings for detections
export const CLASS_COLORS: { [key: string]: string } = {
  'crack': '#EF4444',
  'pothole': '#F59E0B',
  'road_damage': '#EF4444',
  'lane_marking': '#3B82F6',
  'manhole': '#6B7280',
  'patch': '#8B5CF6',
  'general': '#10B981',
  'anomaly': '#F59E0B',
  'damage': '#EF4444',
  'defect': '#DC2626',
  'wear': '#F97316',
  'surface': '#84CC16',
  'marking': '#3B82F6',
  'structure': '#6366F1',
  'debris': '#8B5CF6',
  'water': '#06B6D4',
  'vegetation': '#22C55E',
  'shadow': '#64748B',
  'reflection': '#94A3B8'
};

// Server endpoints
export const SERVER_ENDPOINTS = {
  health: '/health',
  dashboard: '/api/dashboard',
  gpsData: '/api/gps-data',
  systemMetrics: '/api/system-metrics',
  metadataScan: '/api/metadata/scan',
  metadata: (session: string, camera: string, anomalyType: string) => 
    `/api/metadata/${session}/${camera}/${anomalyType}`,
  cameraAnomalies: (camera: string) => `/api/camera/${camera}/anomalies`,
  anomaliesByType: (anomalyType: string) => `/api/anomalies/${anomalyType}`,
  search: '/api/search',
  staticFiles: '/data',
  directoryListing: '/list'
};

// Error types
export enum ErrorType {
  NetworkError = 'NETWORK_ERROR',
  ServerError = 'SERVER_ERROR',
  DataError = 'DATA_ERROR',
  ApiError = 'API_ERROR',
  NotFound = 'NOT_FOUND',
  Unauthorized = 'UNAUTHORIZED',
  RateLimit = 'RATE_LIMIT'
}

export interface AppError {
  type: ErrorType;
  message: string;
  details?: string;
  timestamp: Date;
}

// Utility types
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface LoadingStatus {
  state: LoadingState;
  error?: AppError;
  progress?: number;
}