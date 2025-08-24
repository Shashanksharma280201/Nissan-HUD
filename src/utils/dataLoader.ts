// utils/dataLoader.ts - Fixed version with better error handling and HTTP server integration
import { SessionData, DetectionData, GPSData, SystemMetrics, ImageData, CameraData } from '../types';

export class DataLoader {
  private basePath: string;
  private baseUrl: string;
  private isHttpMode: boolean;

  constructor(basePath: string = '/home/shanks/Music/01-01-70-01-10-47-835') {
    this.basePath = basePath;
    // Always use HTTP mode in browser environment
    this.isHttpMode = typeof window !== 'undefined';
    
    if (this.isHttpMode) {
      // Use HTTP server for file access - adjust port if needed
      this.baseUrl = 'http://localhost:8081/data';
      console.log('DataLoader: Using HTTP mode via localhost:8080/data');
    } else {
      // Node.js environment fallback
      this.baseUrl = basePath;
      console.log('DataLoader: Using direct file access');
    }
  }

  setBasePath(path: string) {
    this.basePath = path;
    if (this.isHttpMode) {
      this.baseUrl = 'http://localhost:8081/data';
    } else {
      this.baseUrl = path;
    }
  }

  /**
   * Parse CSV content into array of objects with better error handling
   */
  private parseCSV(content: string): any[] {
    try {
      const lines = content.split('\n').filter(line => line.trim());
      if (lines.length === 0) {
        console.warn('CSV file is empty');
        return [];
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      console.log('CSV headers found:', headers);

      return lines.slice(1).map((line, index) => {
        try {
          // Handle CSV parsing with quotes and commas
          const values = this.parseCSVLine(line);
          const row: any = {};
          headers.forEach((header, headerIndex) => {
            row[header] = values[headerIndex] || '';
          });
          return row;
        } catch (error) {
          console.warn(`Error parsing CSV line ${index + 2}:`, error);
          return null;
        }
      }).filter(row => row !== null);
    } catch (error) {
      console.error('Error parsing CSV:', error);
      return [];
    }
  }

  /**
   * Parse a single CSV line handling quotes and escaped commas
   */
  private parseCSVLine(line: string): string[] {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  /**
   * Enhanced fetch with better error handling and timeout
   */
  private async safeFetch(url: string, timeout: number = 10000): Promise<string | null> {
    try {
      console.log(`Attempting to fetch: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        signal: controller.signal,
        headers: {
          'Accept': 'text/plain,text/csv,application/csv,*/*',
          'Cache-Control': 'no-cache',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`HTTP ${response.status} for ${url}: ${response.statusText}`);
        if (response.status === 404) {
          console.log(`File not found: ${url}`);
        }
        return null;
      }

      const content = await response.text();
      console.log(`Successfully fetched ${url} (${content.length} characters)`);
      return content;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error(`Request timeout for ${url}`);
        } else if (error.message.includes('CORS')) {
          console.error(`CORS error for ${url}. Make sure your HTTP server has CORS enabled.`);
        } else if (error.message.includes('Failed to fetch')) {
          console.error(`Network error for ${url}. Make sure your HTTP server is running on localhost:8080`);
        } else {
          console.error(`Failed to fetch ${url}:`, error.message);
        }
      } else {
        console.error(`Failed to fetch ${url}:`, error);
      }
      return null;
    }
  }

  /**
   * Test connection to HTTP server
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(this.baseUrl.replace('/data', '/health'), {
        method: 'GET',
        mode: 'cors',
      });
      return response.ok;
    } catch (error) {
      console.error('HTTP server connection test failed:', error);
      return false;
    }
  }

  /**
   * Load detection data from a camera's metadata.csv file
   */
  async loadDetectionData(cameraName: string, className: string): Promise<DetectionData[]> {
    const paths = [
      `${this.baseUrl}/floMobility123_F1/${cameraName}/${className}/metadata.csv`,
      `${this.baseUrl}/F2/${cameraName}/${className}/metadata.csv`
    ];

    for (const url of paths) {
      const content = await this.safeFetch(url);
      if (content) {
        const csvData = this.parseCSV(content);
        console.log(`Loaded ${csvData.length} detections from ${cameraName}/${className}`);
        
        return csvData.map(row => ({
          timestamp: row.timestamp || '',
          date: row.date || '',
          time: row.time || '',
          streamId: parseInt(row.stream_id) || 0,
          frameNum: parseInt(row.frame_num) || 0,
          objId: row.obj_id || '',
          classId: parseInt(row.class_id) || 0,
          className: row.class_name || className,
          left: parseFloat(row.left) || 0,
          top: parseFloat(row.top) || 0,
          width: parseFloat(row.width) || 0,
          height: parseFloat(row.height) || 0,
          confidence: parseFloat(row.confidence) || 0,
          latitude: row.latitude ? parseFloat(row.latitude) : undefined,
          longitude: row.longitude ? parseFloat(row.longitude) : undefined
        }));
      }
    }
    
    console.log(`No detection data found for ${cameraName}/${className}`);
    return [];
  }

  /**
   * Load GPS data from F2/gps_log.csv
   */
  async loadGPSData(): Promise<GPSData[]> {
    const url = `${this.baseUrl}/F2/gps_log.csv`;
    const content = await this.safeFetch(url);
    
    if (!content) {
      console.log('No GPS data file found, creating mock GPS data');
      return this.createMockGPSData();
    }

    const csvData = this.parseCSV(content);
    console.log(`Loaded ${csvData.length} GPS points`);

    return csvData.map(row => ({
      timestamp: row.timestamp || '',
      date: row.date || '',
      time: row.time || '',
      latitude: parseFloat(row.latitude) || 0,
      longitude: parseFloat(row.longitude) || 0,
      altitude: row.altitude ? parseFloat(row.altitude) : undefined,
      speed_knots: row.speed_knots ? parseFloat(row.speed_knots) : undefined,
      fix_quality: row.fix_quality ? parseInt(row.fix_quality) : undefined,
      satellites_used: row.satellites_used ? parseInt(row.satellites_used) : undefined,
      hdop: row.hdop ? parseFloat(row.hdop) : undefined,
      gps_timestamp: row.gps_timestamp || undefined
    }));
  }

  /**
   * Create mock GPS data when GPS file is not available
   */
  private createMockGPSData(): GPSData[] {
    const baseTime = new Date('2025-01-01T01:10:47.835Z');
    const mockData: GPSData[] = [];
    
    // Yokosuka, Kanagawa, JP coordinates
    const baseLat = 35.433;
    const baseLng = 139.328;
    
    for (let i = 0; i < 100; i++) {
      const timestamp = new Date(baseTime.getTime() + i * 1000);
      const lat = baseLat + (Math.random() - 0.5) * 0.01;
      const lng = baseLng + (Math.random() - 0.5) * 0.01;
      
      mockData.push({
        timestamp: timestamp.toISOString().replace('T', ' ').slice(0, -1),
        date: timestamp.toISOString().slice(0, 10),
        time: timestamp.toISOString().slice(11, -1),
        latitude: lat,
        longitude: lng,
        altitude: 50 + Math.random() * 20,
        speed_knots: Math.random() * 10,
        fix_quality: 1,
        satellites_used: 8 + Math.floor(Math.random() * 4),
        hdop: 1.0 + Math.random() * 2.0,
      });
    }
    
    console.log(`Created ${mockData.length} mock GPS points`);
    return mockData;
  }

  /**
   * Load system metrics from floMobility123_F1/system_metrics.csv
   */
  async loadSystemMetrics(): Promise<SystemMetrics[]> {
    const url = `${this.baseUrl}/floMobility123_F1/system_metrics.csv`;
    const content = await this.safeFetch(url);
    
    if (!content) {
      console.log('No system metrics file found, creating mock data');
      return this.createMockSystemMetrics();
    }

    const csvData = this.parseCSV(content);
    console.log(`Loaded ${csvData.length} system metrics`);

    return csvData.map(row => ({
      timestamp: row.timestamp || '',
      date: row.date || '',
      time: row.time || '',
      cpu_usage_percent: parseFloat(row.cpu_usage_percent) || 0,
      gpu_usage_percent: parseFloat(row.gpu_usage_percent) || 0,
      memory_used_mb: parseFloat(row.memory_used_mb) || 0,
      memory_total_mb: parseFloat(row.memory_total_mb) || 16000,
      memory_usage_percent: parseFloat(row.memory_usage_percent) || 0,
      swap_used_mb: parseFloat(row.swap_used_mb) || 0,
      swap_total_mb: parseFloat(row.swap_total_mb) || 4000,
      swap_usage_percent: parseFloat(row.swap_usage_percent) || 0,
      disk_used_gb: parseFloat(row.disk_used_gb) || 100,
      disk_total_gb: parseFloat(row.disk_total_gb) || 500,
      disk_usage_percent: parseFloat(row.disk_usage_percent) || 20,
      cpu_temp_celsius: parseFloat(row.cpu_temp_celsius) || 45,
      gpu_temp_celsius: parseFloat(row.gpu_temp_celsius) || 50,
      thermal_temp_celsius: parseFloat(row.thermal_temp_celsius) || 47,
      power_total_watts: parseFloat(row.power_total_watts) || 15,
      power_cpu_watts: parseFloat(row.power_cpu_watts) || 8,
      power_gpu_watts: parseFloat(row.power_gpu_watts) || 7,
      fan_speed_percent: parseFloat(row.fan_speed_percent) || 30,
      uptime_seconds: parseFloat(row.uptime_seconds) || 86400
    }));
  }

  /**
   * Create mock system metrics when file is not available
   */
  private createMockSystemMetrics(): SystemMetrics[] {
    const baseTime = new Date('2025-01-01T01:10:47.835Z');
    const mockData: SystemMetrics[] = [];
    
    for (let i = 0; i < 20; i++) {
      const timestamp = new Date(baseTime.getTime() + i * 60000);
      
      mockData.push({
        timestamp: timestamp.toISOString().replace('T', ' ').slice(0, -1),
        date: timestamp.toISOString().slice(0, 10),
        time: timestamp.toISOString().slice(11, -1),
        cpu_usage_percent: 30 + Math.random() * 40,
        gpu_usage_percent: 20 + Math.random() * 60,
        memory_used_mb: 8000 + Math.random() * 4000,
        memory_total_mb: 16000,
        memory_usage_percent: 50 + Math.random() * 25,
        swap_used_mb: Math.random() * 1000,
        swap_total_mb: 4000,
        swap_usage_percent: Math.random() * 25,
        disk_used_gb: 100 + Math.random() * 50,
        disk_total_gb: 500,
        disk_usage_percent: 20 + Math.random() * 10,
        cpu_temp_celsius: 40 + Math.random() * 20,
        gpu_temp_celsius: 45 + Math.random() * 25,
        thermal_temp_celsius: 42 + Math.random() * 18,
        power_total_watts: 10 + Math.random() * 10,
        power_cpu_watts: 5 + Math.random() * 5,
        power_gpu_watts: 4 + Math.random() * 6,
        fan_speed_percent: 20 + Math.random() * 40,
        uptime_seconds: 86400 + i * 60
      });
    }
    
    console.log(`Created ${mockData.length} mock system metrics`);
    return mockData;
  }

  /**
   * Scan directory structure to find available cameras and classes
   */
  async scanCameras(): Promise<CameraData[]> {
    const cameras: CameraData[] = [];
    
    // Test connection first
    const isConnected = await this.testConnection();
    if (!isConnected) {
      console.warn('HTTP server not accessible, using mock data');
      return this.createMockCameras();
    }
    
    // Define expected camera structure
    const expectedCameras = [
      { name: 'argus0', type: 'argus' as const },
      { name: 'argus2', type: 'argus' as const },
      { name: 'cam1', type: 'cam' as const },
      { name: '4kcam', type: '4kcam' as const }
    ];

    for (const camera of expectedCameras) {
      const classes: string[] = [];
      let imageCount = 0;
      let detectionCount = 0;

      // Check floMobility123_F1 structure
      const f1Classes = ['crack', 'pole', 'pothole', 'crosswalk_blur'];
      for (const className of f1Classes) {
        const detections = await this.loadDetectionData(camera.name, className);
        if (detections.length > 0) {
          classes.push(className);
          detectionCount += detections.length;
          imageCount += detections.length;
        }
      }

      // Check F2 structure
      const f2Classes = camera.name === 'cam1' ? ['white_line_blur'] : 
                       camera.name === '4kcam' ? ['pole'] : [];
      
      for (const className of f2Classes) {
        const detections = await this.loadDetectionData(camera.name, className);
        if (detections.length > 0) {
          classes.push(className);
          detectionCount += detections.length;
          imageCount += detections.length;
        }
      }

      // Only add camera if it has data or if we want to show empty cameras
      if (classes.length > 0) {
        cameras.push({
          name: camera.name,
          type: camera.type,
          classes,
          imageCount,
          detectionCount
        });
      }
    }

    console.log(`Found ${cameras.length} cameras:`, cameras.map(c => c.name));
    return cameras.length > 0 ? cameras : this.createMockCameras();
  }

  /**
   * Create mock camera data for testing
   */
  private createMockCameras(): CameraData[] {
    return [
      {
        name: 'argus2',
        type: 'argus',
        classes: ['pole'],
        imageCount: 10,
        detectionCount: 10
      }
    ];
  }

  /**
   * Create timeline data by merging detections with GPS data
   */
  async createTimeline(cameras: CameraData[]): Promise<ImageData[]> {
    const timeline: ImageData[] = [];
    const timelineMap: { [timestamp: string]: ImageData } = {};

    // Load GPS data first
    const gpsData = await this.loadGPSData();
    console.log(`Loaded ${gpsData.length} GPS points for timeline`);

    // If no real detection data, create mock timeline
    let hasRealDetections = false;
    
    // Load all detections and group by timestamp
    for (const camera of cameras) {
      for (const className of camera.classes) {
        const detections = await this.loadDetectionData(camera.name, className);
        
        if (detections.length > 0) {
          hasRealDetections = true;
          
          for (const detection of detections) {
            const timestamp = detection.timestamp;
            
            if (!timelineMap[timestamp]) {
              // Find corresponding GPS data
              const gps = gpsData.find(g => g.timestamp === timestamp) || gpsData[0] || {
                latitude: 35.433, longitude: 139.328, timestamp, date: detection.date, time: detection.time
              };
              
              timelineMap[timestamp] = {
                timestamp,
                date: detection.date,
                time: detection.time,
                latitude: gps.latitude,
                longitude: gps.longitude,
                detections: [],
                images: {},
                fullPaths: {}
              };
            }

            timelineMap[timestamp].detections.push(detection);

            // Initialize camera structure
            if (!timelineMap[timestamp].images[camera.name]) {
              timelineMap[timestamp].images[camera.name] = {};
              timelineMap[timestamp].fullPaths[camera.name] = {};
            }
            if (!timelineMap[timestamp].images[camera.name][className]) {
              timelineMap[timestamp].images[camera.name][className] = [];
              timelineMap[timestamp].fullPaths[camera.name][className] = [];
            }

            // Generate image paths (using HTTP server paths)
            const fileTimestamp = timestamp.replace(' ', '_').replace(/:/g, '-');
            const frameNum = detection.frameNum;
            const objId = detection.objId;
            
            const isF2 = (camera.name === 'cam1' && className === 'white_line_blur') ||
                        (camera.name === '4kcam' && className === 'pole');
            
            const extension = camera.name === '4kcam' ? 'png' : 'jpg';
            const imageFilename = `${fileTimestamp}_${frameNum}_${objId}.${extension}`;
            
            const basePath = isF2 ? 'F2' : 'floMobility123_F1';
            const fullPath = `${this.baseUrl}/${basePath}/${camera.name}/${className}/images/${imageFilename}`;

            timelineMap[timestamp].images[camera.name][className].push(imageFilename);
            timelineMap[timestamp].fullPaths[camera.name][className].push(fullPath);
          }
        }
      }
    }

    // If no real detections found, create mock timeline from GPS data
    if (!hasRealDetections && gpsData.length > 0) {
      console.log('No real detections found, creating mock timeline');
      
      for (let i = 0; i < Math.min(gpsData.length, 20); i++) {
        const gps = gpsData[i];
        const mockDetection: DetectionData = {
          timestamp: gps.timestamp,
          date: gps.date,
          time: gps.time,
          streamId: 0,
          frameNum: i,
          objId: `mock_${i}`,
          classId: 5,
          className: 'pole',
          left: 100 + Math.random() * 200,
          top: 100 + Math.random() * 200,
          width: 50 + Math.random() * 100,
          height: 100 + Math.random() * 200,
          confidence: 0.7 + Math.random() * 0.3,
          latitude: gps.latitude,
          longitude: gps.longitude
        };

        timelineMap[gps.timestamp] = {
          timestamp: gps.timestamp,
          date: gps.date,
          time: gps.time,
          latitude: gps.latitude,
          longitude: gps.longitude,
          detections: [mockDetection],
          images: {
            'argus2': {
              'pole': [`mock_pole_${i}.jpg`]
            }
          },
          fullPaths: {
            'argus2': {
              'pole': [`${this.baseUrl}/mock/images/pole_${i}.jpg`]
            }
          }
        };
      }
    }

    // Convert to array and sort by timestamp
    timeline.push(...Object.values(timelineMap));
    timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    console.log(`Created timeline with ${timeline.length} data points`);
    return timeline;
  }

  /**
   * Load complete session data
   */
  async loadSession(): Promise<SessionData> {
    console.log(`Loading session data from: ${this.baseUrl}`);
    
    const sessionName = this.basePath.split('/').pop() || 'Session';
    
    try {
      // Load all data with error handling
      const [cameras, gpsData, systemMetrics] = await Promise.allSettled([
        this.scanCameras(),
        this.loadGPSData(),
        this.loadSystemMetrics()
      ]);

      const camerasResult = cameras.status === 'fulfilled' ? cameras.value : [];
      const gpsResult = gpsData.status === 'fulfilled' ? gpsData.value : [];
      const metricsResult = systemMetrics.status === 'fulfilled' ? systemMetrics.value : [];

      console.log(`Session loaded: ${camerasResult.length} cameras, ${gpsResult.length} GPS points, ${metricsResult.length} metrics`);

      // Create timeline
      const timeline = await this.createTimeline(camerasResult);

      return {
        sessionPath: this.basePath,
        sessionName,
        cameras: camerasResult,
        gpsData: gpsResult,
        systemMetrics: metricsResult,
        timeline
      };
    } catch (error) {
      console.error('Error loading session:', error);
      throw new Error(`Failed to load session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}