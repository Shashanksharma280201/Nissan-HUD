// utils/dataLoader.ts - Enhanced version with comprehensive GPS support
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
  gpsData?: GPSPoint; // GPS data associated with detection
}

export interface GPSPoint {
  latitude: number;
  longitude: number;
  timestamp?: string;
  session: string;
  camera: string;
  anomalyType: string;
  recordIndex: number;
  source: 'gps_log.csv' | 'metadata.csv';
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
  gpsPoints?: GPSPoint[]; // Additional GPS points for this timestamp
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
  imageCount: number;
  gpsCount: number; // Number of GPS points from this camera
  hasGPS: boolean; // Whether this camera has GPS data
  gpsStats?: {
    latRange: [number, number];
    lngRange: [number, number];
    firstTimestamp?: string;
    lastTimestamp?: string;
  };
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
  source?: 'gps_log.csv' | 'metadata.csv';
  session?: string;
  camera?: string;
  anomalyType?: string;
}

export interface SessionData {
  sessionName: string;
  sessionPath: string;
  cameras: CameraInfo[];
  timeline: ImageData[];
  gpsData: GPSData[];
  systemMetrics: SystemMetrics[];
  gpsStats: {
    totalPoints: number;
    sources: { source: string; count: number; type: string }[];
    coverage: string;
    bounds?: {
      latRange: [number, number];
      lngRange: [number, number];
    };
  };
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
      console.log('Loading enhanced session data with GPS from server API...');

      // Get dashboard summary first to understand the data structure
      const dashboardResponse = await fetch(`${this.serverUrl}/api/dashboard`);
      if (!dashboardResponse.ok) {
        throw new Error(`Dashboard API failed: ${dashboardResponse.statusText}`);
      }
      const dashboardData = await dashboardResponse.json();
      console.log('Dashboard data:', dashboardData);

      // Load combined GPS data from all sources (log + metadata)
      const gpsData = await this.loadCombinedGPSData();
      console.log('Combined GPS data loaded:', gpsData.length, 'points');

      // Load system metrics
      const systemMetrics = await this.loadSystemMetrics();
      console.log('System metrics loaded:', systemMetrics.length, 'records');

      // Scan for all metadata files with GPS information
      const metadataFiles = await this.loadMetadataFiles();
      console.log('Metadata files found:', metadataFiles.length);

      // Build enhanced camera information with GPS statistics
      const cameras = await this.buildEnhancedCameraInfo(metadataFiles, dashboardData);
      console.log('Enhanced cameras configured:', cameras);

      // Create timeline using combined GPS data and actual images
      const timeline = await this.createEnhancedTimeline(gpsData, metadataFiles);
      console.log('Enhanced timeline created:', timeline.length, 'frames');

      // Calculate GPS statistics
      const gpsStats = this.calculateGPSStats(gpsData, cameras);

      const sessionData: SessionData = {
        sessionName: this.extractSessionName(),
        sessionPath: this.serverUrl,
        cameras,
        timeline,
        gpsData,
        systemMetrics,
        gpsStats
      };

      return sessionData;
    } catch (error) {
      console.error('Failed to load enhanced session data:', error);
      throw error;
    }
  }

  private async loadCombinedGPSData(): Promise<GPSData[]> {
    try {
      // Try to load combined GPS data first
      const response = await fetch(`${this.serverUrl}/api/gps-data/combined`);
      if (!response.ok) {
        console.warn('Combined GPS data not available, trying individual sources');
        return this.loadFallbackGPSData();
      }
      
      const result = await response.json();
      if (!result.success || !result.data) {
        console.warn('Combined GPS data response invalid:', result);
        return this.loadFallbackGPSData();
      }

      console.log('GPS sources:', result.sources);

      return result.data.map((point: any) => ({
        timestamp: point.timestamp || `${point.date || '2025-01-01'} ${point.time || '00:00:00'}`,
        time: point.timestamp ? point.timestamp.split(' ')[1] || '00:00:00' : '00:00:00',
        date: point.timestamp ? point.timestamp.split(' ')[0] || '2025-01-01' : '2025-01-01',
        latitude: parseFloat(point.latitude || 0),
        longitude: parseFloat(point.longitude || 0),
        altitude: point.altitude ? parseFloat(point.altitude) : undefined,
        speed: point.speed ? parseFloat(point.speed) : undefined,
        heading: point.heading ? parseFloat(point.heading) : undefined,
        source: point.source || 'unknown',
        session: point.session,
        camera: point.camera,
        anomalyType: point.anomalyType
      }));
    } catch (error) {
      console.error('Error loading combined GPS data:', error);
      return this.loadFallbackGPSData();
    }
  }

  private async loadFallbackGPSData(): Promise<GPSData[]> {
    // Try to load GPS from log file first
    try {
      const response = await fetch(`${this.serverUrl}/api/gps-data`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          return result.data.map((row: any) => ({
            timestamp: row.timestamp || `${row.date || '2025-01-01'} ${row.time || '00:00:00'}`,
            time: row.time || '00:00:00',
            date: row.date || '2025-01-01',
            latitude: parseFloat(row.latitude || row.lat || 0),
            longitude: parseFloat(row.longitude || row.lng || row.lon || 0),
            altitude: row.altitude ? parseFloat(row.altitude) : undefined,
            speed: row.speed ? parseFloat(row.speed) : undefined,
            heading: row.heading ? parseFloat(row.heading) : undefined,
            source: 'gps_log.csv' as const
          }));
        }
      }
    } catch (error) {
      console.error('Error loading GPS log data:', error);
    }

    // Try to load GPS from metadata files
    try {
      const response = await fetch(`${this.serverUrl}/api/gps-data/metadata`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          return result.data.map((point: any) => ({
            timestamp: point.timestamp || `${point.date || '2025-01-01'} ${point.time || '00:00:00'}`,
            time: point.timestamp ? point.timestamp.split(' ')[1] || '00:00:00' : '00:00:00',
            date: point.timestamp ? point.timestamp.split(' ')[0] || '2025-01-01' : '2025-01-01',
            latitude: point.latitude,
            longitude: point.longitude,
            source: 'metadata.csv' as const,
            session: point.session,
            camera: point.camera,
            anomalyType: point.anomalyType
          }));
        }
      }
    } catch (error) {
      console.error('Error loading metadata GPS data:', error);
    }

    // Final fallback - synthetic data
    console.warn('No GPS data available, generating synthetic data');
    return this.generateSyntheticGPSData();
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
        heading: Math.random() * 360,
        source: 'synthetic' as any
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

      console.log('Metadata scan summary:', result.summary);
      return result.files;
    } catch (error) {
      console.error('Error scanning metadata files:', error);
      throw error;
    }
  }

  private async buildEnhancedCameraInfo(metadataFiles: any[], dashboardData: any): Promise<CameraInfo[]> {
    const cameraMap = new Map<string, CameraInfo>();

    // Initialize cameras from metadata files with GPS information
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
          imageCount: 0,
          gpsCount: 0,
          hasGPS: false
        });
      }

      const camera = cameraMap.get(cameraKey)!;
      if (!camera.classes.includes(file.anomalyType)) {
        camera.classes.push(file.anomalyType);
      }
      
      // Add image and GPS counts
      if (file.imageCount) {
        camera.imageCount += file.imageCount;
      }
      if (file.gpsCount) {
        camera.gpsCount += file.gpsCount;
        camera.hasGPS = true;
      }

      // Add GPS statistics if available
      if (file.gpsStats) {
        camera.gpsStats = {
          latRange: file.gpsStats.latRange,
          lngRange: file.gpsStats.lngRange,
          firstTimestamp: file.gpsStats.firstTimestamp,
          lastTimestamp: file.gpsStats.lastTimestamp
        };
      }
    });

    // Update detection counts from dashboard data if available
    if (dashboardData.summary?.anomalies) {
      Object.entries(dashboardData.summary.anomalies).forEach(([cameraName, anomalies]: [string, any]) => {
        cameraMap.forEach((camera, key) => {
          if (camera.name === cameraName && anomalies) {
            camera.detectionCount = Object.values(anomalies).reduce((sum: number, anomaly: any) => {
              return sum + (anomaly.recordCount || 0);
            }, 0);
            
            // Update counts from dashboard if they're higher
            const totalImageCount = Object.values(anomalies).reduce((sum: number, anomaly: any) => {
              return sum + (anomaly.imageCount || 0);
            }, 0);
            if (totalImageCount > camera.imageCount) {
              camera.imageCount = totalImageCount;
            }

            const totalGPSCount = Object.values(anomalies).reduce((sum: number, anomaly: any) => {
              return sum + (anomaly.gpsCount || 0);
            }, 0);
            if (totalGPSCount > camera.gpsCount) {
              camera.gpsCount = totalGPSCount;
              camera.hasGPS = totalGPSCount > 0;
            }
          }
        });
      });
    }

    return Array.from(cameraMap.values());
  }

  private async createEnhancedTimeline(gpsData: GPSData[], metadataFiles: any[]): Promise<ImageData[]> {
    const timeline: ImageData[] = [];

    console.log(`Creating enhanced timeline from ${gpsData.length} GPS points and ${metadataFiles.length} metadata files`);

    // Use GPS data as timeline base, but limit for performance
    const maxTimelinePoints = Math.min(gpsData.length, 100);
    
    for (let i = 0; i < maxTimelinePoints; i++) {
      const gpsPoint = gpsData[i];
      
      const timelineEntry: ImageData = {
        timestamp: gpsPoint.timestamp,
        date: gpsPoint.date,
        time: gpsPoint.time,
        latitude: gpsPoint.latitude,
        longitude: gpsPoint.longitude,
        detections: [],
        images: {},
        fullPaths: {},
        gpsPoints: [] // Additional GPS points for this timestamp
      };

      // Find other GPS points near this timestamp (within 1 minute)
      const nearbyGPS = gpsData.filter(point => {
        if (!point.timestamp || !gpsPoint.timestamp) return false;
        const pointTime = new Date(point.timestamp).getTime();
        const baseTime = new Date(gpsPoint.timestamp).getTime();
        return Math.abs(pointTime - baseTime) <= 60000; // 1 minute
      });

      timelineEntry.gpsPoints = nearbyGPS.map(point => ({
        latitude: point.latitude,
        longitude: point.longitude,
        timestamp: point.timestamp,
        session: point.session || 'unknown',
        camera: point.camera || 'unknown',
        anomalyType: point.anomalyType || 'general',
        recordIndex: gpsData.indexOf(point),
        source: point.source === 'gps_log.csv' ? 'gps_log.csv' : 'metadata.csv'
      }));

      // Load actual images and enhanced detection data for each camera/class combination
      for (const metadataFile of metadataFiles) {
        try {
          // Load metadata with GPS information
          const metadataResponse = await fetch(
            `${this.serverUrl}/api/metadata-with-images/${metadataFile.session}/${metadataFile.camera}/${metadataFile.anomalyType}`
          );
          
          if (metadataResponse.ok) {
            const metadataData = await metadataResponse.json();
            
            if (metadataData.success) {
              // Initialize camera structure
              if (!timelineEntry.images[metadataFile.camera]) {
                timelineEntry.images[metadataFile.camera] = {};
                timelineEntry.fullPaths[metadataFile.camera] = {};
              }

              if (!timelineEntry.images[metadataFile.camera][metadataFile.anomalyType]) {
                timelineEntry.images[metadataFile.camera][metadataFile.anomalyType] = [];
                timelineEntry.fullPaths[metadataFile.camera][metadataFile.anomalyType] = [];
              }

              // Add real image paths (sample images for this timeline point)
              if (metadataData.images.data.length > 0) {
                const sampleImages = metadataData.images.data.slice(
                  i % metadataData.images.data.length, 
                  (i % metadataData.images.data.length) + 3
                );
                
                sampleImages.forEach((image: any) => {
                  timelineEntry.images[metadataFile.camera][metadataFile.anomalyType].push(image.name);
                  timelineEntry.fullPaths[metadataFile.camera][metadataFile.anomalyType].push(
                    `${this.serverUrl}${image.url}`
                  );
                });
              }

              // Create enhanced detections with GPS data
              if (metadataData.metadata.data.length > 0) {
                const sampleDetections = metadataData.metadata.data.slice(
                  i % Math.max(metadataData.metadata.data.length, 1), 
                  (i % Math.max(metadataData.metadata.data.length, 1)) + Math.min(3, metadataData.metadata.data.length)
                );

                const enhancedDetections = sampleDetections.map((row: any, index: number) => {
                  // Find corresponding GPS data for this detection
                  let detectionGPS: GPSPoint | undefined;
                  if (metadataData.gps.data.length > 0) {
                    const gpsIndex = (i + index) % metadataData.gps.data.length;
                    const gpsPoint = metadataData.gps.data[gpsIndex];
                    if (gpsPoint) {
                      detectionGPS = {
                        latitude: gpsPoint.latitude,
                        longitude: gpsPoint.longitude,
                        timestamp: gpsPoint.timestamp,
                        session: gpsPoint.session,
                        camera: gpsPoint.camera,
                        anomalyType: gpsPoint.anomalyType,
                        recordIndex: gpsPoint.recordIndex,
                        source: 'metadata.csv'
                      };
                    }
                  }

                  return {
                    frameNum: parseInt(row.frameNum || row.frame_number || index),
                    streamId: this.getStreamIdForCamera(metadataFile.camera, metadataFile.session),
                    className: metadataFile.anomalyType,
                    confidence: parseFloat(row.confidence || row.score || Math.random() * 0.3 + 0.7),
                    left: parseFloat(row.left || row.x || row.bbox_left || Math.random() * 500),
                    top: parseFloat(row.top || row.y || row.bbox_top || Math.random() * 500),
                    width: parseFloat(row.width || row.w || row.bbox_width || 100 + Math.random() * 200),
                    height: parseFloat(row.height || row.h || row.bbox_height || 100 + Math.random() * 200),
                    timestamp: row.timestamp || row.time || '',
                    imagePath: row.imagePath || row.image_path || row.filename || `${metadataFile.camera}_${metadataFile.anomalyType}_${String(index).padStart(4, '0')}.jpg`,
                    gpsData: detectionGPS
                  };
                });

                timelineEntry.detections.push(...enhancedDetections);
              }
            }
          }
          
        } catch (error) {
          console.warn(`Failed to load enhanced data for ${metadataFile.camera}/${metadataFile.anomalyType}:`, error);
        }
      }

      timeline.push(timelineEntry);
      
      // Log progress periodically
      if (i % 10 === 0) {
        console.log(`Enhanced timeline progress: ${i + 1}/${maxTimelinePoints} (${timelineEntry.detections.length} detections, ${timelineEntry.gpsPoints?.length || 0} GPS points)`);
      }
    }

    console.log(`Enhanced timeline created with ${timeline.length} frames`);
    return timeline;
  }

  private calculateGPSStats(gpsData: GPSData[], cameras: CameraInfo[]) {
    const sources = new Map<string, { count: number; type: string }>();
    
    gpsData.forEach(point => {
      const sourceKey = point.source || 'unknown';
      if (!sources.has(sourceKey)) {
        sources.set(sourceKey, { 
          count: 0, 
          type: sourceKey === 'gps_log.csv' ? 'GPS tracking log' : 
                sourceKey === 'metadata.csv' ? 'Anomaly detection metadata' : 'Unknown'
        });
      }
      sources.get(sourceKey)!.count++;
    });

    const camerasWithGPS = cameras.filter(c => c.hasGPS).length;
    const coverage = cameras.length > 0 ? `${((camerasWithGPS / cameras.length) * 100).toFixed(1)}%` : '0%';

    let bounds: { latRange: [number, number]; lngRange: [number, number] } | undefined;
    if (gpsData.length > 0) {
      const latitudes = gpsData.map(p => p.latitude).filter(lat => lat !== 0);
      const longitudes = gpsData.map(p => p.longitude).filter(lng => lng !== 0);
      
      if (latitudes.length > 0 && longitudes.length > 0) {
        bounds = {
          latRange: [Math.min(...latitudes), Math.max(...latitudes)],
          lngRange: [Math.min(...longitudes), Math.max(...longitudes)]
        };
      }
    }

    return {
      totalPoints: gpsData.length,
      sources: Array.from(sources.entries()).map(([source, data]) => ({
        source,
        count: data.count,
        type: data.type
      })),
      coverage,
      bounds
    };
  }

  // ... rest of the helper methods remain the same ...

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
        description: 'High-resolution 4K road inspection camera with GPS tracking'
      },
      'cam1_F2': {
        displayName: 'Camera 1 (F2)',
        type: 'Standard',
        resolution: '1920x1080',
        color: '#10B981',
        description: 'Standard resolution road inspection camera - F2 session with GPS'
      },
      
      // floMobility123_F1 Session cameras
      'cam1_floMobility123_F1': {
        displayName: 'Camera 1 (F1)',
        type: 'Standard',
        resolution: '1920x1080',
        color: '#8B5CF6',
        description: 'Standard resolution road inspection camera - F1 session with GPS'
      },
      'argus0_floMobility123_F1': {
        displayName: 'Argus Camera 0',
        type: 'Multi-sensor',
        resolution: '1920x1080',
        color: '#F59E0B',
        description: 'Multi-sensor inspection camera with GPS tracking'
      },
      'argus1_floMobility123_F1': {
        displayName: 'Argus Camera 1',
        type: 'Multi-sensor',
        resolution: '1920x1080',
        color: '#EF4444',
        description: 'Multi-sensor inspection camera with GPS tracking'
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
      description: `Road inspection camera from ${sessionName} session with potential GPS data`
    };
  }

  private extractSessionName(): string {
    const url = new URL(this.serverUrl);
    return url.hostname === 'localhost' ? 'Multi-Session GPS-Enhanced Data (Local)' : 'Remote GPS-Enhanced Session';
  }

  // NEW: Additional GPS-specific methods for the frontend

  async loadGPSHeatmapData(filters?: { session?: string; camera?: string; anomalyType?: string; precision?: number }) {
    try {
      const params = new URLSearchParams();
      if (filters?.session) params.append('session', filters.session);
      if (filters?.camera) params.append('camera', filters.camera);
      if (filters?.anomalyType) params.append('anomalyType', filters.anomalyType);
      if (filters?.precision) params.append('precision', filters.precision.toString());

      const response = await fetch(`${this.serverUrl}/api/gps/heatmap?${params}`);
      if (!response.ok) {
        throw new Error(`Heatmap API failed: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error('Heatmap data invalid');
      }

      return result.data;
    } catch (error) {
      console.error('Error loading GPS heatmap data:', error);
      return [];
    }
  }

  async loadSpecificGPSData(session: string, camera: string, anomalyType: string) {
    try {
      const response = await fetch(`${this.serverUrl}/api/gps/${session}/${camera}/${anomalyType}`);
      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`No GPS data found for ${session}/${camera}/${anomalyType}`);
          return null;
        }
        throw new Error(`GPS API failed: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        return null;
      }

      return {
        session: result.session,
        camera: result.camera,
        anomalyType: result.anomalyType,
        count: result.count,
        data: result.data,
        bounds: result.bounds
      };
    } catch (error) {
      console.error(`Error loading GPS data for ${session}/${camera}/${anomalyType}:`, error);
      return null;
    }
  }

  async searchWithGPSFilter(filters: {
    session?: string;
    camera?: string;
    anomalyType?: string;
    hasGPS?: boolean;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }) {
    try {
      const params = new URLSearchParams();
      if (filters.session) params.append('session', filters.session);
      if (filters.camera) params.append('camera', filters.camera);
      if (filters.anomalyType) params.append('anomalyType', filters.anomalyType);
      if (filters.hasGPS !== undefined) params.append('hasGPS', filters.hasGPS.toString());
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.limit) params.append('limit', filters.limit.toString());

      const response = await fetch(`${this.serverUrl}/api/search?${params}`);
      if (!response.ok) {
        throw new Error(`Search API failed: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error('Search failed');
      }

      return {
        resultCount: result.resultCount,
        totalRecords: result.totalRecords,
        totalImages: result.totalImages,
        totalGPSPoints: result.totalGPSPoints,
        resultsWithGPS: result.resultsWithGPS,
        results: result.results
      };
    } catch (error) {
      console.error('Error performing GPS-enabled search:', error);
      throw error;
    }
  }

  async getCameraGPSData(camera: string) {
    try {
      const response = await fetch(`${this.serverUrl}/api/camera/${camera}/anomalies`);
      if (!response.ok) {
        throw new Error(`Camera API failed: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error('Camera data invalid');
      }

      return {
        camera: result.camera,
        anomalyCount: result.anomalyCount,
        totalGPSPoints: result.totalGPSPoints,
        anomalies: result.anomalies.map((anomaly: any) => ({
          session: anomaly.session,
          anomalyType: anomaly.anomalyType,
          count: anomaly.count,
          imageCount: anomaly.imageCount,
          gpsCount: anomaly.gpsCount,
          hasGPS: anomaly.hasGPS,
          gpsData: anomaly.gps || []
        }))
      };
    } catch (error) {
      console.error(`Error loading GPS data for camera ${camera}:`, error);
      throw error;
    }
  }

  async getAnomalyTypeGPSData(anomalyType: string) {
    try {
      const response = await fetch(`${this.serverUrl}/api/anomalies/${anomalyType}`);
      if (!response.ok) {
        throw new Error(`Anomaly type API failed: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error('Anomaly type data invalid');
      }

      return {
        anomalyType: result.anomalyType,
        cameraCount: result.cameraCount,
        totalDetections: result.totalDetections,
        totalImages: result.totalImages,
        totalGPSPoints: result.totalGPSPoints,
        camerasWithGPS: result.camerasWithGPS,
        cameras: result.cameras.map((camera: any) => ({
          session: camera.session,
          camera: camera.camera,
          count: camera.count,
          imageCount: camera.imageCount,
          gpsCount: camera.gpsCount,
          hasGPS: camera.hasGPS,
          gpsData: camera.gps || []
        }))
      };
    } catch (error) {
      console.error(`Error loading GPS data for anomaly type ${anomalyType}:`, error);
      throw error;
    }
  }

  // Helper method to check server health and GPS capabilities
  async checkServerCapabilities() {
    try {
      const response = await fetch(`${this.serverUrl}/api`);
      if (!response.ok) {
        return { available: false, gpsSupport: false };
      }

      const apiInfo = await response.json();
      const hasGPSEndpoints = apiInfo.endpoints?.gps !== undefined;
      const hasGPSFeatures = apiInfo.gpsFeatures !== undefined;

      return {
        available: true,
        gpsSupport: hasGPSEndpoints && hasGPSFeatures,
        version: apiInfo.version,
        features: apiInfo.gpsFeatures || {}
      };
    } catch (error) {
      console.error('Error checking server capabilities:', error);
      return { available: false, gpsSupport: false };
    }
  }

  // Method to get comprehensive session statistics
  async getSessionStatistics() {
    try {
      const [dashboardResponse, scanResponse] = await Promise.all([
        fetch(`${this.serverUrl}/api/dashboard`),
        fetch(`${this.serverUrl}/api/metadata/scan`)
      ]);

      if (!dashboardResponse.ok || !scanResponse.ok) {
        throw new Error('Failed to fetch session statistics');
      }

      const [dashboard, scan] = await Promise.all([
        dashboardResponse.json(),
        scanResponse.json()
      ]);

      const stats = {
        timestamp: new Date().toISOString(),
        dataFiles: {
          gps: dashboard.summary?.gps || { available: false },
          systemMetrics: dashboard.summary?.systemMetrics || { available: false },
          metadataFiles: scan.summary?.totalFiles || 0
        },
        images: {
          total: scan.summary?.totalImages || 0,
          filesWithImages: scan.summary?.filesWithImages || 0
        },
        gps: {
          total: scan.summary?.totalGPSPoints || 0,
          filesWithGPS: scan.summary?.filesWithGPS || 0,
          coverage: scan.summary?.totalFiles > 0 
            ? `${((scan.summary.filesWithGPS / scan.summary.totalFiles) * 100).toFixed(1)}%`
            : '0%'
        },
        sessions: {},
        cameras: {}
      };

      // Process session and camera statistics
      if (scan.files) {
        const sessionStats = new Map<string, any>();
        const cameraStats = new Map<string, any>();

        scan.files.forEach((file: any) => {
          // Session statistics
          if (!sessionStats.has(file.session)) {
            sessionStats.set(file.session, {
              cameras: new Set(),
              classes: new Set(),
              totalImages: 0,
              totalGPS: 0,
              filesWithGPS: 0
            });
          }
          const sessionStat = sessionStats.get(file.session);
          sessionStat.cameras.add(file.camera);
          sessionStat.classes.add(file.anomalyType);
          sessionStat.totalImages += file.imageCount || 0;
          sessionStat.totalGPS += file.gpsCount || 0;
          if (file.hasGPS) sessionStat.filesWithGPS++;

          // Camera statistics
          const cameraKey = `${file.camera}_${file.session}`;
          if (!cameraStats.has(cameraKey)) {
            cameraStats.set(cameraKey, {
              session: file.session,
              classes: new Set(),
              totalImages: 0,
              totalGPS: 0,
              filesWithGPS: 0
            });
          }
          const cameraStat = cameraStats.get(cameraKey);
          cameraStat.classes.add(file.anomalyType);
          cameraStat.totalImages += file.imageCount || 0;
          cameraStat.totalGPS += file.gpsCount || 0;
          if (file.hasGPS) cameraStat.filesWithGPS++;
        });

        // Convert to final format
        sessionStats.forEach((stat, session) => {
          (stats.sessions as any)[session] = {
            cameras: stat.cameras.size,
            classes: stat.classes.size,
            totalImages: stat.totalImages,
            totalGPS: stat.totalGPS,
            gpsCapableCameras: stat.filesWithGPS
          };
        });

        cameraStats.forEach((stat, cameraKey) => {
          (stats.cameras as any)[cameraKey] = {
            session: stat.session,
            classes: stat.classes.size,
            totalImages: stat.totalImages,
            totalGPS: stat.totalGPS,
            hasGPS: stat.totalGPS > 0
          };
        });
      }

      return stats;
    } catch (error) {
      console.error('Error getting session statistics:', error);
      return null;
    }
  }
}