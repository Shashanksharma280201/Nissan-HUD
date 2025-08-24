// types/index.ts
export interface BoundingBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface DetectionData {
  timestamp: string;
  date: string;
  time: string;
  streamId: number;
  frameNum: number;
  objId: string;
  classId: number;
  className: string;
  left: number;
  top: number;
  width: number;
  height: number;
  confidence: number;
  latitude?: number;
  longitude?: number;
}

export interface GPSData {
  timestamp: string;
  date: string;
  time: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  speed_knots?: number;
  fix_quality?: number;
  satellites_used?: number;
  hdop?: number;
  gps_timestamp?: string;
}

export interface SystemMetrics {
  timestamp: string;
  date: string;
  time: string;
  cpu_usage_percent: number;
  gpu_usage_percent: number;
  memory_used_mb: number;
  memory_total_mb: number;
  memory_usage_percent: number;
  swap_used_mb: number;
  swap_total_mb: number;
  swap_usage_percent: number;
  disk_used_gb: number;
  disk_total_gb: number;
  disk_usage_percent: number;
  cpu_temp_celsius: number;
  gpu_temp_celsius: number;
  thermal_temp_celsius: number;
  power_total_watts: number;
  power_cpu_watts: number;
  power_gpu_watts: number;
  fan_speed_percent: number;
  uptime_seconds: number;
}

export interface ImageData {
  timestamp: string;
  date: string;
  time: string;
  latitude: number;
  longitude: number;
  detections: DetectionData[];
  images: {
    [cameraName: string]: {
      [className: string]: string[]; // Array of image filenames
    };
  };
  fullPaths: {
    [cameraName: string]: {
      [className: string]: string[]; // Array of full image paths
    };
  };
}

export interface SessionData {
  sessionPath: string;
  sessionName: string;
  cameras: CameraData[];
  gpsData: GPSData[];
  systemMetrics: SystemMetrics[];
  timeline: ImageData[];
}

export interface CameraData {
  name: string; // argus0, argus2, cam1, 4kcam
  type: 'argus' | 'cam' | '4kcam';
  classes: string[]; // Available detection classes
  imageCount: number;
  detectionCount: number;
}

export interface CameraConfig {
  name: string;
  displayName: string;
  type: 'argus' | 'cam' | '4kcam';
  description: string;
  resolution: string;
  supportedClasses: string[];
  color: string;
}

export const CAMERA_CONFIGS: CameraConfig[] = [
  {
    name: 'argus0',
    displayName: 'Argus Camera 0',
    type: 'argus',
    description: 'Primary inference camera',
    resolution: '2432x2048',
    supportedClasses: ['crack', 'pole', 'pothole', 'crosswalk_blur'],
    color: '#3B82F6'
  },
  {
    name: 'argus2',
    displayName: 'Argus Camera 2',
    type: 'argus',
    description: 'Secondary inference camera with priority',
    resolution: '2432x2048',
    supportedClasses: ['crack', 'pole', 'pothole', 'crosswalk_blur'],
    color: '#10B981'
  },
  {
    name: 'cam1',
    displayName: 'Camera 1 (Middle)',
    type: 'cam',
    description: 'Lane detection specialist',
    resolution: '1920x1080',
    supportedClasses: ['white_line_blur'],
    color: '#F59E0B'
  },
  {
    name: '4kcam',
    displayName: '4K Camera',
    type: '4kcam',
    description: 'High-resolution capture for poles/facilities',
    resolution: '4096x2160',
    supportedClasses: ['pole'],
    color: '#EF4444'
  }
];

export const CLASS_COLORS: { [key: string]: string } = {
  crack: '#EF4444',
  pole: '#3B82F6',
  pothole: '#F59E0B',
  crosswalk_blur: '#8B5CF6',
  white_line_blur: '#10B981',
  facility: '#06B6D4'
};