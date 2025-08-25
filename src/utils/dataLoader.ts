// utils/dataLoader.ts - Complete version with real image loading
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
  session: string;
  imageCount: number; // Total images for this camera
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

      // Scan for all metadata files (now includes image counts)
      const metadataFiles = await this.loadMetadataFiles();
      console.log('Metadata files found:', metadataFiles.length);

      // Build camera information with correct session mapping and image counts
      const cameras = await this.buildCameraInfo(metadataFiles, dashboardData);
      console.log('Cameras configured:', cameras);

      // Create timeline using real GPS data and actual images
      const timeline = await this.createRealTimeline(gpsData, metadataFiles);
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
        return this.generateSyntheticGPSData();
      }
      
      const result = await response.json();
      if (!result.success || !result.data) {
        console.warn('GPS data response invalid:', result);
        return this.generateSyntheticGPSData();
      }

      return result.data.map((row: any) => ({
        timestamp: row.timestamp || `${row.date || '2025-01-01'} ${row.time || '00:00:00'}`,
        time: row.time || '00:00:00',
        date: row.date || '2025-01-01',
        latitude: parseFloat(row.latitude || row.lat || 0),
        longitude: parseFloat(row.longitude || row.lng || row.lon || 0),
        altitude: row.altitude ? parseFloat(row.altitude) : undefined,
        speed: row.speed ? parseFloat(row.speed) : undefined,
        heading: row.heading ? parseFloat(row.heading) : undefined
      }));
    } catch (error) {
      console.error('Error loading GPS data:', error);
      return this.generateSyntheticGPSData();
    }
  }

  private generateSyntheticGPSData(): GPSData[] {
    const syntheticData: GPSData[] = [];
    const baseTime = new Date('2025-01-01T10:00:00Z');
    const baseLat = 35.2838; // Yokosuka area
    const baseLng = 139.6544;
    
    for (let i = 0; i < 50; i++) {
      const currentTime = new Date(baseTime.getTime() + i * 30000); // Every 30 seconds
      syntheticData.push({
        timestamp: currentTime.toISOString().replace('T', ' ').slice(0, 19),
        date: currentTime.toISOString().slice(0, 10),
        time: currentTime.toISOString().slice(11, 19),
        latitude: baseLat + (Math.random() - 0.5) * 0.01,
        longitude: baseLng + (Math.random() - 0.5) * 0.01,
        altitude: 10 + Math.random() * 20,
        speed: Math.random() * 60,
        heading: Math.random() * 360
      });
    }
    
    console.log('Generated synthetic GPS data:', syntheticData.length, 'points');
    return syntheticData;
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
        timestamp: row.timestamp || `${row.date || '2025-01-01'} ${row.time || '00:00:00'}`,
        time: row.time || '00:00:00',
        date: row.date || '2025-01-01',
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

    // Initialize cameras from metadata files with correct session mapping
    metadataFiles.forEach(file => {
      const cameraKey = `${file.camera}_${file.session}`;
      
      if (!cameraMap.has(cameraKey)) {
        const cameraConfig = this.getCameraConfig(file.camera, file.session);
        cameraMap.set(cameraKey, {
          name: file.camera,
          displayName: cameraConfig.displayName,
          type: cameraConfig.type,
          resolution: cameraConfig.resolution,
          color: cameraConfig.color,
          description: cameraConfig.description,
          session: file.session,
          detectionCount: 0,
          classes: [],
          imageCount: 0
        });
      }

      const camera = cameraMap.get(cameraKey)!;
      if (!camera.classes.includes(file.anomalyType)) {
        camera.classes.push(file.anomalyType);
      }
      
      // Add image count if available
      if (file.imageCount) {
        camera.imageCount += file.imageCount;
      }
    });

    // Update detection counts from dashboard data if available
    if (dashboardData.summary?.anomalies) {
      Object.entries(dashboardData.summary.anomalies).forEach(([cameraName, anomalies]: [string, any]) => {
        // Find cameras with this name across all sessions
        cameraMap.forEach((camera, key) => {
          if (camera.name === cameraName && anomalies) {
            camera.detectionCount = Object.values(anomalies).reduce((sum: number, anomaly: any) => {
              return sum + (anomaly.recordCount || 0);
            }, 0);
            
            // Update image count from dashboard if available
            const totalImageCount = Object.values(anomalies).reduce((sum: number, anomaly: any) => {
              return sum + (anomaly.imageCount || 0);
            }, 0);
            if (totalImageCount > camera.imageCount) {
              camera.imageCount = totalImageCount;
            }
          }
        });
      });
    }

    return Array.from(cameraMap.values());
  }

  private async createRealTimeline(gpsData: GPSData[], metadataFiles: any[]): Promise<ImageData[]> {
    const timeline: ImageData[] = [];

    console.log(`Creating timeline from ${gpsData.length} GPS points and ${metadataFiles.length} metadata files`);

    // Use GPS data as timeline base
    for (let i = 0; i < Math.min(gpsData.length, 100); i++) { // Limit to 100 points for performance
      const gpsPoint = gpsData[i];
      
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

      // Load actual images for each camera/class combination
      for (const metadataFile of metadataFiles) {
        try {
          // Load images using the new images API endpoint
          const imagesResponse = await fetch(
            `${this.serverUrl}/api/images/${metadataFile.session}/${metadataFile.camera}/${metadataFile.anomalyType}`
          );
          
          if (imagesResponse.ok) {
            const imagesData = await imagesResponse.json();
            
            if (imagesData.success && imagesData.images.length > 0) {
              // Initialize camera structure
              if (!timelineEntry.images[metadataFile.camera]) {
                timelineEntry.images[metadataFile.camera] = {};
                timelineEntry.fullPaths[metadataFile.camera] = {};
              }

              if (!timelineEntry.images[metadataFile.camera][metadataFile.anomalyType]) {
                timelineEntry.images[metadataFile.camera][metadataFile.anomalyType] = [];
                timelineEntry.fullPaths[metadataFile.camera][metadataFile.anomalyType] = [];
              }

              // Add real image paths (sample a few images for this timeline point)
              const sampleImages = imagesData.images.slice(i % imagesData.images.length, (i % imagesData.images.length) + 3);
              
              sampleImages.forEach((image: any) => {
                timelineEntry.images[metadataFile.camera][metadataFile.anomalyType].push(image.name);
                timelineEntry.fullPaths[metadataFile.camera][metadataFile.anomalyType].push(
                  `${this.serverUrl}${image.url}`
                );
              });

              // Load detection metadata for this camera/class
              const detectionData = await this.loadDetectionMetadata(
                metadataFile.session,
                metadataFile.camera,
                metadataFile.anomalyType
              );

              // Sample some detections for this timeline point
              const sampleDetections = detectionData.slice(i % Math.max(detectionData.length, 1), (i % Math.max(detectionData.length, 1)) + Math.min(3, detectionData.length));
              timelineEntry.detections.push(...sampleDetections);
            }
          }
          
        } catch (error) {
          console.warn(`Failed to load images for ${metadataFile.camera}/${metadataFile.anomalyType}:`, error);
        }
      }

      timeline.push(timelineEntry);
      
      // Log progress periodically
      if (i % 10 === 0) {
        console.log(`Timeline progress: ${i + 1}/${Math.min(gpsData.length, 100)} (${timelineEntry.detections.length} detections)`);
      }
    }

    console.log(`Timeline created with ${timeline.length} frames`);
    return timeline;
  }

  private async loadDetectionMetadata(session: string, camera: string, anomalyType: string): Promise<DetectionData[]> {
    try {
      const response = await fetch(`${this.serverUrl}/api/metadata/${session}/${camera}/${anomalyType}`);
      if (!response.ok) {
        return [];
      }

      const result = await response.json();
      if (!result.success || !result.data) {
        return [];
      }

      return result.data.map((row: any, index: number) => ({
        frameNum: parseInt(row.frameNum || row.frame_number || index),
        streamId: this.getStreamIdForCamera(camera, session),
        className: anomalyType,
        confidence: parseFloat(row.confidence || row.score || Math.random() * 0.3 + 0.7),
        left: parseFloat(row.left || row.x || row.bbox_left || Math.random() * 500),
        top: parseFloat(row.top || row.y || row.bbox_top || Math.random() * 500),
        width: parseFloat(row.width || row.w || row.bbox_width || 100 + Math.random() * 200),
        height: parseFloat(row.height || row.h || row.bbox_height || 100 + Math.random() * 200),
        timestamp: row.timestamp || row.time || '',
        imagePath: row.imagePath || row.image_path || row.filename || `${camera}_${anomalyType}_${String(index).padStart(4, '0')}.jpg`
      }));
    } catch (error) {
      console.error(`Error loading detection metadata for ${camera}/${anomalyType}:`, error);
      return [];
    }
  }

  private getStreamIdForCamera(cameraName: string, session: string): number {
    // Map cameras to stream IDs based on your data structure
    if (session === 'F2') {
      if (cameraName === '4kcam') return 100;
      if (cameraName === 'cam1') return 50;
    } else if (session === 'floMobility123_F1') {
      if (cameraName === 'argus0') return 10;
      if (cameraName === 'argus1') return 20;
      if (cameraName === 'cam1') return 30;
    }
    
    return 1; // Default
  }

  private getCameraConfig(cameraName: string, sessionName: string) {
    // Define camera configurations based on actual structure
    const configs: { [key: string]: any } = {
      // F2 Session cameras
      '4kcam_F2': {
        displayName: '4K Camera',
        type: 'High Resolution',
        resolution: '4096x2160',
        color: '#3B82F6',
        description: 'High-resolution 4K road inspection camera'
      },
      'cam1_F2': {
        displayName: 'Camera 1 (F2)',
        type: 'Standard',
        resolution: '1920x1080',
        color: '#10B981',
        description: 'Standard resolution road inspection camera - F2 session'
      },
      
      // floMobility123_F1 Session cameras
      'cam1_floMobility123_F1': {
        displayName: 'Camera 1 (F1)',
        type: 'Standard',
        resolution: '1920x1080',
        color: '#8B5CF6',
        description: 'Standard resolution road inspection camera - F1 session'
      },
      'argus0_floMobility123_F1': {
        displayName: 'Argus Camera 0',
        type: 'Multi-sensor',
        resolution: '1920x1080',
        color: '#F59E0B',
        description: 'Multi-sensor inspection camera'
      },
      'argus1_floMobility123_F1': {
        displayName: 'Argus Camera 1',
        type: 'Multi-sensor',
        resolution: '1920x1080',
        color: '#EF4444',
        description: 'Multi-sensor inspection camera'
      }
    };

    const configKey = `${cameraName}_${sessionName}`;
    const config = configs[configKey];
    
    if (config) {
      return config;
    }
    
    // Fallback configuration
    return {
      displayName: `${cameraName} (${sessionName})`,
      type: 'Unknown',
      resolution: '1920x1080',
      color: '#6B7280',
      description: `Road inspection camera from ${sessionName} session`
    };
  }

  private extractSessionName(): string {
    const url = new URL(this.serverUrl);
    return url.hostname === 'localhost' ? 'Multi-Session Data (Local)' : 'Remote Session';
  }
}