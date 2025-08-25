"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Camera, 
  Navigation, 
  Activity, 
  Loader2, 
  AlertCircle,
  Eye,
  EyeOff,
  Monitor,
  ServerCrash,
  Database,
  FolderOpen
} from 'lucide-react';

// Import our custom components
import CameraViewer from '../components/CameraViewer';
import SystemDashboard from '../components/SystemDashboard';
import GPSViewer from '../components/GPSViewer';
import ControlPanel from '../components/ControlPanel';

// Import utilities and types
import { DataLoader } from '../utils/dataLoader';
import { SessionData, CameraInfo } from '../types';

// If you're using the types from the artifacts above, use this instead:
// import { SessionData, CameraInfo } from '../types/index';

// Camera configurations for UI - Updated to match actual data structure
export const CAMERA_CONFIGS = [
  // F2 Session - GPS data source (2 cameras)
  {
    name: '4kcam',
    displayName: '4K Camera',
    type: 'High Resolution',
    resolution: '4096x2160',
    color: '#3B82F6',
    description: 'High-resolution 4K road inspection camera',
    session: 'F2'
  },
  {
    name: 'cam1',
    displayName: 'Camera 1 (F2)',
    type: 'Standard',
    resolution: '1920x1080',
    color: '#10B981',
    description: 'Standard resolution road inspection camera - F2 session',
    session: 'F2'
  },
  
  // floMobility123_F1 Session - System metrics source (3 cameras)
  {
    name: 'cam1',
    displayName: 'Camera 1 (F1)',
    type: 'Standard',
    resolution: '1920x1080',
    color: '#8B5CF6',
    description: 'Standard resolution road inspection camera - F1 session',
    session: 'floMobility123_F1'
  },
  {
    name: 'argus0',
    displayName: 'Argus Camera 0',
    type: 'Multi-sensor',
    resolution: '1920x1080',
    color: '#F59E0B',
    description: 'Multi-sensor inspection camera',
    session: 'floMobility123_F1'
  },
  {
    name: 'argus1',
    displayName: 'Argus Camera 1',
    type: 'Multi-sensor',
    resolution: '1920x1080',
    color: '#EF4444',
    description: 'Multi-sensor inspection camera',
    session: 'floMobility123_F1'
  }
];

export default function MultiCameraViewer() {
  // State management
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState('http://localhost:8081');
  const [dataLoader] = useState(() => new DataLoader(serverUrl));
  const [visibleCameras, setVisibleCameras] = useState<{[key: string]: boolean}>({});
  const [activeTab, setActiveTab] = useState('f2');
  const [activeSessionTab, setActiveSessionTab] = useState('f2');
  const [serverStatus, setServerStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  
  // Refs for interval management
  const playbackIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  // Current frame data
  const currentData = sessionData?.timeline[currentIndex];

  // Filter cameras by session - handle cam1 appearing in both sessions
  const f2Cameras = sessionData?.cameras.filter(camera => {
    // For F2: include 4kcam and cam1 from F2 session
    return camera.session === 'F2' || 
           (camera.name === '4kcam') || 
           (camera.name === 'cam1' && camera.session === 'F2');
  }) || [];
  
  const f1Cameras = sessionData?.cameras.filter(camera => {
    // For F1: include argus0, argus1, and cam1 from F1 session
    return camera.session === 'floMobility123_F1' || 
           (camera.name === 'argus0') || 
           (camera.name === 'argus1') ||
           (camera.name === 'cam1' && camera.session === 'floMobility123_F1');
  }) || [];

  // Check server health on mount
  useEffect(() => {
    checkServerHealth();
  }, []);

  // Load initial session data
  useEffect(() => {
    if (serverStatus === 'connected') {
      loadSessionData();
    }
  }, [serverStatus]);

  // Auto-play functionality
  useEffect(() => {
    if (isPlaying && sessionData) {
      const interval = 1000 / playbackSpeed;
      playbackIntervalRef.current = setInterval(() => {
        setCurrentIndex(prev => {
          if (prev >= sessionData.timeline.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, interval);
    } else {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
    }

    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
    };
  }, [isPlaying, playbackSpeed, sessionData]);

  // Initialize camera visibility
  useEffect(() => {
    if (sessionData) {
      const initialVisibility: {[key: string]: boolean} = {};
      sessionData.cameras.forEach(camera => {
        initialVisibility[camera.name] = true;
      });
      setVisibleCameras(initialVisibility);
    }
  }, [sessionData]);

  const checkServerHealth = async () => {
    setServerStatus('checking');
    try {
      const response = await fetch(`${serverUrl}/health`);
      if (response.ok) {
        const data = await response.json();
        console.log('Server health check:', data);
        setServerStatus('connected');
      } else {
        setServerStatus('disconnected');
        setError('Server is not responding properly');
      }
    } catch (error) {
      console.error('Server health check failed:', error);
      setServerStatus('disconnected');
      setError('Cannot connect to surveillance server. Make sure it\'s running on http://localhost:8081');
    }
  };

  const loadSessionData = async (customUrl?: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (customUrl) {
        setServerUrl(customUrl);
        dataLoader.setBasePath(customUrl);
      }
      
      console.log('Loading session data from server...');
      const data = await dataLoader.loadSession();
      
      if (data.timeline.length === 0) {
        throw new Error('No timeline data found. Please check if the server has GPS data and camera metadata.');
      }
      
      setSessionData(data);
      setCurrentIndex(0);
      console.log('Session loaded successfully:', data);
      
    } catch (error) {
      console.error('Failed to load session:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const handleIndexChange = useCallback((newIndex: number) => {
    if (sessionData && newIndex >= 0 && newIndex < sessionData.timeline.length) {
      setCurrentIndex(newIndex);
    }
  }, [sessionData]);

  const handleSpeedChange = useCallback((speed: number) => {
    setPlaybackSpeed(speed);
  }, []);

  const handleLoadSession = useCallback((url: string) => {
    loadSessionData(url);
  }, []);

  const handleRefresh = useCallback(() => {
    checkServerHealth();
    if (serverStatus === 'connected') {
      loadSessionData();
    }
  }, [serverStatus]);

  const toggleCameraVisibility = useCallback((cameraName: string) => {
    setVisibleCameras(prev => ({
      ...prev,
      [cameraName]: !prev[cameraName]
    }));
  }, []);

  const toggleAllCameras = useCallback((visible: boolean, session?: string) => {
    if (sessionData) {
      const newVisibility: {[key: string]: boolean} = { ...visibleCameras };
      const camerasToToggle = session === 'F2' ? f2Cameras : session === 'floMobility123_F1' ? f1Cameras : sessionData.cameras;
      
      camerasToToggle.forEach(camera => {
        newVisibility[camera.name] = visible;
      });
      setVisibleCameras(newVisibility);
    }
  }, [sessionData, visibleCameras, f2Cameras, f1Cameras]);

  // Server disconnected state
  if (serverStatus === 'disconnected') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <ServerCrash className="w-5 h-5" />
              Server Connection Failed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 mb-2">
                Cannot connect to the surveillance data server.
              </p>
              <p className="text-sm text-red-600">
                Make sure your server.js is running on <code className="bg-red-100 px-1 py-0.5 rounded">http://localhost:8081</code>
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">To start the server:</h4>
              <div className="bg-gray-100 p-3 rounded-lg text-sm font-mono">
                <div>cd /path/to/your/server</div>
                <div>node server.js</div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={checkServerHealth} variant="outline">
                <Loader2 className="w-4 h-4 mr-2" />
                Retry Connection
              </Button>
              <Button onClick={() => setServerUrl('http://localhost:8082')} variant="outline">
                Try Port 8082
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (isLoading || serverStatus === 'checking') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-blue-500" />
          <h2 className="text-xl font-semibold mb-2">
            {serverStatus === 'checking' ? 'Connecting to Server' : 'Loading Session Data'}
          </h2>
          <p className="text-gray-600">
            {serverStatus === 'checking' 
              ? 'Checking surveillance server connection...'
              : 'Please wait while we load your multi-camera surveillance data...'
            }
          </p>
          <div className="mt-4 text-sm text-gray-500">
            Server: {serverUrl}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Error Loading Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="flex gap-2">
              <Button onClick={handleRefresh} variant="outline">
                <Loader2 className="w-4 h-4 mr-2" />
                Retry
              </Button>
              <Button onClick={() => setError(null)}>
                Continue Anyway
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No data state
  if (!sessionData || !currentData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              No Data Available
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              No session data found. The server is connected but has no data to display.
            </p>
            <div className="space-y-2">
              <p className="text-sm text-gray-500">
                Expected data files:
              </p>
              <ul className="text-sm text-gray-500 list-disc list-inside space-y-1">
                <li>F2/gps_log.csv - GPS coordinates</li>
                <li>floMobility123_F1/system_metrics.csv - System data</li>
                <li>*/metadata.csv - Camera detections</li>
              </ul>
            </div>
            <Button onClick={handleRefresh} variant="outline" className="mt-4">
              Check Server Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full bg-red-400 h-full">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Camera className="w-6 h-6" />
                Surveillance Data Viewer
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                Multi-session road inspection data from F2 and floMobility123_F1
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="px-3 py-1">
                <Monitor className="w-4 h-4 mr-2" />
                {sessionData.cameras.length} Cameras Total
              </Badge>
              <Badge variant="secondary" className="px-3 py-1">
                Frame {currentIndex + 1} / {sessionData.timeline.length}
              </Badge>
              <Badge variant="outline" className="px-3 py-1 text-green-600">
                Server Connected
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex w-full mx-auto px-6 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          
          {/* Control Panel - Left Sidebar */}
          <div className="xl:col-span-1">
            <ControlPanel
              sessionData={sessionData}
              currentIndex={currentIndex}
              isPlaying={isPlaying}
              playbackSpeed={playbackSpeed}
              onIndexChange={handleIndexChange}
              onPlayPause={handlePlayPause}
              onSpeedChange={handleSpeedChange}
              onLoadSession={handleLoadSession}
              onRefresh={handleRefresh}
              serverUrl={serverUrl}
            />
          </div>

          {/* Main Content Area */}
          <div className="xl:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              
              {/* Main Tab Navigation */}
              <TabsList className="grid w-full max-w-md grid-cols-3">
                <TabsTrigger value="cameras" className="flex items-center gap-2">
                  <Camera className="w-4 h-4" />
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

              {/* Cameras Tab */}
              <TabsContent value="cameras" className="space-y-6">
                {/* Session Tabs for Cameras */}
                <Tabs value={activeSessionTab} onValueChange={setActiveSessionTab} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <TabsList className="grid w-full max-w-md grid-cols-2">
                      <TabsTrigger value="f2" className="flex items-center gap-2">
                        <FolderOpen className="w-4 h-4" />
                        F2 Session ({f2Cameras.length})
                      </TabsTrigger>
                      <TabsTrigger value="f1" className="flex items-center gap-2">
                        <Database className="w-4 h-4" />
                        FloMobility F1 ({f1Cameras.length})
                      </TabsTrigger>
                    </TabsList>

                    {/* Session-specific Camera Controls */}
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => toggleAllCameras(true, activeSessionTab === 'f2' ? 'F2' : 'floMobility123_F1')}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Show All
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => toggleAllCameras(false, activeSessionTab === 'f2' ? 'F2' : 'floMobility123_F1')}
                      >
                        <EyeOff className="w-4 h-4 mr-2" />
                        Hide All
                      </Button>
                    </div>
                  </div>

                  {/* F2 Session Cameras */}
                  <TabsContent value="f2" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FolderOpen className="w-5 h-5 text-blue-500" />
                          F2 Session - GPS & High-Resolution Cameras
                        </CardTitle>
                        <p className="text-sm text-gray-600">
                          GPS data source with 4K camera and standard camera feed
                        </p>
                      </CardHeader>
                    </Card>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {f2Cameras.map(camera => (
                        <CameraViewer
                          key={`${camera.name}_F2`}
                          cameraName={camera.name}
                          data={currentData}
                          isVisible={visibleCameras[camera.name] || false}
                          onToggleVisibility={() => toggleCameraVisibility(camera.name)}
                          serverUrl={serverUrl}
                          cameraSession="F2"
                          className="h-fit"
                        />
                      ))}
                    </div>

                    {f2Cameras.length === 0 && (
                      <Card>
                        <CardContent className="text-center py-8">
                          <Camera className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                          <h3 className="text-lg font-semibold mb-2">No F2 Cameras Available</h3>
                          <p className="text-sm text-gray-600">
                            No camera data found for F2 session. Check server data structure.
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  {/* FloMobility123_F1 Session Cameras */}
                  <TabsContent value="f1" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Database className="w-5 h-5 text-green-500" />
                          FloMobility123_F1 Session - Multi-Sensor Array
                        </CardTitle>
                        <p className="text-sm text-gray-600">
                          System metrics source with Argus cameras and standard camera feed
                        </p>
                      </CardHeader>
                    </Card>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {f1Cameras.map(camera => (
                        <CameraViewer
                          key={`${camera.name}_F1`}
                          cameraName={camera.name}
                          data={currentData}
                          isVisible={visibleCameras[camera.name] || false}
                          onToggleVisibility={() => toggleCameraVisibility(camera.name)}
                          serverUrl={serverUrl}
                          cameraSession="floMobility123_F1"
                          className="h-fit"
                        />
                      ))}
                    </div>

                    {f1Cameras.length === 0 && (
                      <Card>
                        <CardContent className="text-center py-8">
                          <Camera className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                          <h3 className="text-lg font-semibold mb-2">No F1 Cameras Available</h3>
                          <p className="text-sm text-gray-600">
                            No camera data found for floMobility123_F1 session. Check server data structure.
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>
                </Tabs>
              </TabsContent>

              {/* GPS Tab */}
              <TabsContent value="gps">
                <GPSViewer
                  currentData={currentData}
                  allData={sessionData.timeline}
                  gpsData={sessionData.gpsData}
                />
              </TabsContent>

              {/* System Tab */}
              <TabsContent value="system">
                <SystemDashboard
                  metrics={sessionData.systemMetrics}
                />
              </TabsContent>

            </Tabs>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t bg-white mt-8">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <span>Sessions: F2 ({f2Cameras.length} cams) | F1 ({f1Cameras.length} cams)</span>
              <span>•</span>
              <span>
                {sessionData.timeline.reduce((sum, data) => sum + data.detections.length, 0)} total detections
              </span>
              <span>•</span>
              <span>{sessionData.gpsData.length} GPS points</span>
              <span>•</span>
              <span>Server: {serverUrl}</span>
            </div>
            <div className="flex items-center gap-4">
              <span>Current: {currentData.timestamp}</span>
              <span>•</span>
              <span>
                Lat: {currentData.latitude.toFixed(6)}, 
                Lng: {currentData.longitude.toFixed(6)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}