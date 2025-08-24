// utils/dataLoader.ts - Updated to use server API endpoints
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

export class DataLoader {
  private serverUrl: string;

  constructor(serverUrl: string = 'http://localhost:8081') {
    this.serverUrl = serverUrl;
  }

  setBasePath(serverUrl: string) {
    this.serverUrl = serverUrl;
  }

  async loadSession(): Promise<SessionData> {
    try {
      console.log('Loading session data from server API...');

      // Get dashboard summary first to understand the data structure
      const dashboardResponse = await fetch(`${this.serverUrl}/api/dashboard`);
      if (!dashboardResponse.ok) {
        throw new Error(`Dashboard API failed: ${dashboardResponse.statusText}`);
      }
      const dashboardData = await dashboardResponse.json();
      console.log('Dashboard data:', dashboardData);

      // Load GPS data from F2/gps_log.csv
      const gpsData = await this.loadGPSData();
      console.log('GPS data loaded:', gpsData.length, 'points');

      // Load system metrics from floMobility123_F1/system_metrics.csv
      const systemMetrics = await this.loadSystemMetrics();
      console.log('System metrics loaded:', systemMetrics.length, 'records');

      // Scan for all metadata files
      const metadataFiles = await this.loadMetadataFiles();
      console.log('Metadata files found:', metadataFiles);

      // Build camera information
      const cameras = await this.buildCameraInfo(metadataFiles, dashboardData);
      console.log('Cameras configured:', cameras);

      // Create timeline by combining GPS data with detection metadata
      const timeline = await this.createTimeline(gpsData, metadataFiles);
      console.log('Timeline created:', timeline.length, 'frames');

      const sessionData: SessionData = {
        sessionName: this.extractSessionName(),
        sessionPath: this.serverUrl,
        cameras,
        timeline,
        gpsData,
        systemMetrics
      };

      return sessionData;
    } catch (error) {
      console.error('Failed to load session data:', error);
      throw error;
    }
  }

  private async loadGPSData(): Promise<GPSData[]> {
    try {
      const response = await fetch(`${this.serverUrl}/api/gps-data`);
      if (!response.ok) {
        console.warn('GPS data not available:', response.statusText);
        return [];
      }
      
      const result = await response.json();
      if (!result.success || !result.data) {
        console.warn('GPS data response invalid:', result);
        return [];
      }

      return result.data.map((row: any) => ({
        timestamp: row.timestamp || `${row.date} ${row.time}`,
        time: row.time || '00:00:00',
        date: row.date || new Date().toISOString().split('T')[0],
        latitude: parseFloat(row.latitude || row.lat || 0),
        longitude: parseFloat(row.longitude || row.lng || row.lon || 0),
        altitude: row.altitude ? parseFloat(row.altitude) : undefined,
        speed: row.speed ? parseFloat(row.speed) : undefined,
        heading: row.heading ? parseFloat(row.heading) : undefined
      }));
    } catch (error) {
      console.error('Error loading GPS data:', error);
      return [];
    }
  }

  private async loadSystemMetrics(): Promise<SystemMetrics[]> {
    try {
      const response = await fetch(`${this.serverUrl}/api/system-metrics`);
      if (!response.ok) {
        console.warn('System metrics not available:', response.statusText);
        return [];
      }

      const result = await response.json();
      if (!result.success || !result.data) {
        console.warn('System metrics response invalid:', result);
        return [];
      }

      return result.data.map((row: any) => ({
        timestamp: row.timestamp || `${row.date} ${row.time}`,
        time: row.time || '00:00:00',
        date: row.date || new Date().toISOString().split('T')[0],
        cpu_usage_percent: parseFloat(row.cpu_usage_percent || 0),
        gpu_usage_percent: parseFloat(row.gpu_usage_percent || 0),
        memory_usage_percent: parseFloat(row.memory_usage_percent || 0),
        memory_used_mb: parseFloat(row.memory_used_mb || 0),
        memory_total_mb: parseFloat(row.memory_total_mb || 8192),
        swap_usage_percent: parseFloat(row.swap_usage_percent || 0),
        swap_used_mb: parseFloat(row.swap_used_mb || 0),
        swap_total_mb: parseFloat(row.swap_total_mb || 2048),
        disk_usage_percent: parseFloat(row.disk_usage_percent || 0),
        disk_used_gb: parseFloat(row.disk_used_gb || 0),
        disk_total_gb: parseFloat(row.disk_total_gb || 500),
        cpu_temp_celsius: parseFloat(row.cpu_temp_celsius || 45),
        gpu_temp_celsius: parseFloat(row.gpu_temp_celsius || 50),
        thermal_temp_celsius: parseFloat(row.thermal_temp_celsius || 48),
        fan_speed_percent: parseFloat(row.fan_speed_percent || 30),
        power_total_watts: parseFloat(row.power_total_watts || 15),
        power_cpu_watts: parseFloat(row.power_cpu_watts || 8),
        power_gpu_watts: parseFloat(row.power_gpu_watts || 7),
        uptime_seconds: parseFloat(row.uptime_seconds || 3600)
      }));
    } catch (error) {
      console.error('Error loading system metrics:', error);
      return [];
    }
  }

  private async loadMetadataFiles(): Promise<any[]> {
    try {
      const response = await fetch(`${this.serverUrl}/api/metadata/scan`);
      if (!response.ok) {
        throw new Error(`Metadata scan failed: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success || !result.files) {
        throw new Error('Metadata scan response invalid');
      }

      return result.files;
    } catch (error) {
      console.error('Error scanning metadata files:', error);
      throw error;
    }
  }

  private async buildCameraInfo(metadataFiles: any[], dashboardData: any): Promise<CameraInfo[]> {
    const cameraMap = new Map<string, CameraInfo>();

    // Initialize cameras from metadata files
    metadataFiles.forEach(file => {
      const cameraName = file.camera;
      
      if (!cameraMap.has(cameraName)) {
        const cameraConfig = this.getCameraConfig(cameraName);
        cameraMap.set(cameraName, {
          name: cameraName,
          displayName: cameraConfig.displayName,
          type: cameraConfig.type,
          resolution: cameraConfig.resolution,
          color: cameraConfig.color,
          description: cameraConfig.description,
          detectionCount: 0,
          classes: []
        });
      }

      const camera = cameraMap.get(cameraName)!;
      if (!camera.classes.includes(file.anomalyType)) {
        camera.classes.push(file.anomalyType);
      }
    });

    // Update detection counts from dashboard data if available
    if (dashboardData.summary?.anomalies) {
      Object.entries(dashboardData.summary.anomalies).forEach(([cameraName, anomalies]: [string, any]) => {
        const camera = cameraMap.get(cameraName);
        if (camera && anomalies) {
          camera.detectionCount = Object.values(anomalies).reduce((sum: number, anomaly: any) => {
            return sum + (anomaly.recordCount || 0);
          }, 0);
        }
      });
    }

    return Array.from(cameraMap.values());
  }

  private async createTimeline(gpsData: GPSData[], metadataFiles: any[]): Promise<ImageData[]> {
    const timeline: ImageData[] = [];

    // For each GPS point, create a timeline entry
    for (const gpsPoint of gpsData) {
      const timelineEntry: ImageData = {
        timestamp: gpsPoint.timestamp,
        date: gpsPoint.date,
        time: gpsPoint.time,
        latitude: gpsPoint.latitude,
        longitude: gpsPoint.longitude,
        detections: [],
        images: {},
        fullPaths: {}
      };

      // Load detection data for each camera/class combination
      for (const metadataFile of metadataFiles) {
        try {
          const detectionData = await this.loadDetectionMetadata(
            metadataFile.session,
            metadataFile.camera,
            metadataFile.anomalyType
          );

          // Find detections that match this timestamp (approximately)
          const matchingDetections = this.findMatchingDetections(detectionData, gpsPoint.timestamp);
          
          if (matchingDetections.length > 0) {
            // Add detections to timeline
            timelineEntry.detections.push(...matchingDetections);

            // Initialize camera images structure
            if (!timelineEntry.images[metadataFile.camera]) {
              timelineEntry.images[metadataFile.camera] = {};
              timelineEntry.fullPaths[metadataFile.camera] = {};
            }

            if (!timelineEntry.images[metadataFile.camera][metadataFile.anomalyType]) {
              timelineEntry.images[metadataFile.camera][metadataFile.anomalyType] = [];
              timelineEntry.fullPaths[metadataFile.camera][metadataFile.anomalyType] = [];
            }

            // Add image paths for these detections
            matchingDetections.forEach(detection => {
              if (detection.imagePath) {
                const fullPath = `${this.serverUrl}/data/${metadataFile.session}/${metadataFile.camera}/${metadataFile.anomalyType}/${detection.imagePath}`;
                timelineEntry.images[metadataFile.camera][metadataFile.anomalyType].push(detection.imagePath);
                timelineEntry.fullPaths[metadataFile.camera][metadataFile.anomalyType].push(fullPath);
              }
            });
          }
        } catch (error) {
          if (error instanceof Error) {
            console.warn(`Failed to load metadata for ${metadataFile.camera}/${metadataFile.anomalyType}:`, error.message);
          } else {
            console.warn(`Failed to load metadata for ${metadataFile.camera}/${metadataFile.anomalyType}:`, error);
          }
        }
      }

      timeline.push(timelineEntry);
    }

    return timeline;
  }

  private async loadDetectionMetadata(session: string, camera: string, anomalyType: string): Promise<any[]> {
    try {
      const response = await fetch(`${this.serverUrl}/api/metadata/${session}/${camera}/${anomalyType}`);
      if (!response.ok) {
        throw new Error(`Metadata API failed: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success || !result.data) {
        throw new Error('Invalid metadata response');
      }

      // Convert metadata CSV data to detection format
      return result.data.map((row: any) => ({
        frameNum: parseInt(row.frameNum || row.frame_number || 0),
        streamId: parseInt(row.streamId || row.stream_id || (camera === '4kcam' ? 100 : 1)),
        className: anomalyType,
        confidence: parseFloat(row.confidence || row.score || 1.0),
        left: parseFloat(row.left || row.x || row.bbox_left || 0),
        top: parseFloat(row.top || row.y || row.bbox_top || 0),
        width: parseFloat(row.width || row.w || row.bbox_width || 100),
        height: parseFloat(row.height || row.h || row.bbox_height || 100),
        timestamp: row.timestamp || row.time || '',
        imagePath: row.imagePath || row.image_path || row.filename || `frame_${row.frameNum || 0}.jpg`
      }));
    } catch (error) {
      console.error(`Error loading detection metadata for ${camera}/${anomalyType}:`, error);
      return [];
    }
  }

  private findMatchingDetections(detections: any[], targetTimestamp: string): any[] {
    // Simple time-based matching - you may want to improve this based on your data structure
    const targetTime = new Date(targetTimestamp).getTime();
    const timeThreshold = 5000; // 5 seconds tolerance

    return detections.filter(detection => {
      if (!detection.timestamp) return false;
      
      const detectionTime = new Date(detection.timestamp).getTime();
      return Math.abs(detectionTime - targetTime) <= timeThreshold;
    });
  }

  private getCameraConfig(cameraName: string) {
    const configs = {
      '4kcam': {
        displayName: '4K Camera',
        type: 'High Resolution',
        resolution: '4096x2160',
        color: '#3B82F6',
        description: 'High-resolution 4K road inspection camera'
      },
      'cam1': {
        displayName: 'Camera 1',
        type: 'Standard',
        resolution: '1920x1080',
        color: '#10B981',
        description: 'Standard resolution road inspection camera'
      },
      'argus0': {
        displayName: 'Argus Camera 0',
        type: 'Multi-sensor',
        resolution: '1920x1080',
        color: '#F59E0B',
        description: 'Multi-sensor inspection camera'
      },
      'argus1': {
        displayName: 'Argus Camera 1',
        type: 'Multi-sensor',
        resolution: '1920x1080',
        color: '#EF4444',
        description: 'Multi-sensor inspection camera'
      }
    };

    return configs[cameraName as keyof typeof configs] || {
      displayName: cameraName,
      type: 'Unknown',
      resolution: '1920x1080',
      color: '#6B7280',
      description: 'Road inspection camera'
    };
  }

  private extractSessionName(): string {
    const url = new URL(this.serverUrl);
    return url.hostname === 'localhost' ? '01-01-70-01-10-47-835' : 'Remote Session';
  }
}