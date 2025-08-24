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
  Monitor
} from 'lucide-react';

// Import our custom components
import CameraViewer from '../components/CameraViewer';
import SystemDashboard from '../components/SystemDashboard';
import GPSViewer from '../components/GPSViewer';
import ControlPanel from '../components/ControlPanel';

// Import utilities and types
import { DataLoader } from '../utils/dataLoader';
import { SessionData, CAMERA_CONFIGS } from '../types';

export default function MultiCameraViewer() {
  // State management
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataLoader] = useState(() => new DataLoader('/home/shanks/Music/01-01-70-01-10-47-835'));
  const [visibleCameras, setVisibleCameras] = useState<{[key: string]: boolean}>({});
  const [activeTab, setActiveTab] = useState('cameras');
  
  // Refs for interval management
  const playbackIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  // Current frame data
  const currentData = sessionData?.timeline[currentIndex];

  // Load initial session data
  useEffect(() => {
    loadSessionData();
  }, []);

  // Auto-play functionality
  useEffect(() => {
    if (isPlaying && sessionData) {
      const interval = 1000 / playbackSpeed; // Convert speed to interval
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

  const loadSessionData = async (customPath?: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (customPath) {
        dataLoader.setBasePath(customPath);
      }
      
      console.log('Loading session data...');
      const data = await dataLoader.loadSession();
      
      if (data.timeline.length === 0) {
        throw new Error('No timeline data found. Please check if the session directory contains valid data.');
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

  const handleLoadSession = useCallback((path: string) => {
    loadSessionData(path);
  }, []);

  const handleRefresh = useCallback(() => {
    loadSessionData();
  }, []);

  const toggleCameraVisibility = useCallback((cameraName: string) => {
    setVisibleCameras(prev => ({
      ...prev,
      [cameraName]: !prev[cameraName]
    }));
  }, []);

  const toggleAllCameras = useCallback((visible: boolean) => {
    if (sessionData) {
      const newVisibility: {[key: string]: boolean} = {};
      sessionData.cameras.forEach(camera => {
        newVisibility[camera.name] = visible;
      });
      setVisibleCameras(newVisibility);
    }
  }, [sessionData]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-blue-500" />
          <h2 className="text-xl font-semibold mb-2">Loading Session Data</h2>
          <p className="text-gray-600">Please wait while we load your multi-camera inference data...</p>
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
              <Button onClick={() => loadSessionData()} variant="outline">
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
              No session data found. Please load a valid session directory.
            </p>
            <Button onClick={() => loadSessionData()} variant="outline">
              Try Loading Default Session
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Camera className="w-6 h-6" />
                Multi-Camera Inference Viewer
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                Real-time visualization of road inspection data from multiple camera sources
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="px-3 py-1">
                <Monitor className="w-4 h-4 mr-2" />
                {sessionData.cameras.length} Cameras Active
              </Badge>
              <Badge variant="secondary" className="px-3 py-1">
                Frame {currentIndex + 1} / {sessionData.timeline.length}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
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
            />
          </div>

          {/* Main Content Area */}
          <div className="xl:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              
              {/* Tab Navigation */}
              <div className="flex items-center justify-between">
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

                {/* Camera Visibility Controls */}
                {activeTab === 'cameras' && (
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => toggleAllCameras(true)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Show All
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => toggleAllCameras(false)}
                    >
                      <EyeOff className="w-4 h-4 mr-2" />
                      Hide All
                    </Button>
                  </div>
                )}
              </div>

              {/* Cameras Tab */}
              <TabsContent value="cameras" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {sessionData.cameras.map(camera => {
                    const cameraConfig = CAMERA_CONFIGS.find(c => c.name === camera.name);
                    return (
                      <CameraViewer
                        key={camera.name}
                        cameraName={camera.name}
                        data={currentData}
                        isVisible={visibleCameras[camera.name] || false}
                        onToggleVisibility={() => toggleCameraVisibility(camera.name)}
                        className="h-fit"
                      />
                    );
                  })}
                </div>

                {/* Camera Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Camera className="w-5 h-5" />
                      Camera Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {sessionData.cameras.map(camera => {
                        const config = CAMERA_CONFIGS.find(c => c.name === camera.name);
                        const currentDetections = currentData.detections.filter(d => {
                          if (camera.name === '4kcam') return d.streamId >= 100;
                          return d.streamId < 100;
                        });
                        
                        return (
                          <div key={camera.name} className="p-3 border rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: config?.color }}
                              />
                              <span className="font-medium text-sm">{config?.displayName}</span>
                            </div>
                            <div className="space-y-1 text-xs text-gray-600">
                              <div className="flex justify-between">
                                <span>Type:</span>
                                <Badge variant="outline" className="text-xs">
                                  {config?.type}
                                </Badge>
                              </div>
                              <div className="flex justify-between">
                                <span>Resolution:</span>
                                <span>{config?.resolution}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Current:</span>
                                <span>{currentDetections.length} detections</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Total:</span>
                                <span>{camera.detectionCount} detections</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Classes:</span>
                                <span>{camera.classes.length}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* GPS Tab */}
              <TabsContent value="gps">
                <GPSViewer
                  currentData={currentData}
                  allData={sessionData.timeline}
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
              <span>Session: {sessionData.sessionName}</span>
              <span>•</span>
              <span>
                {sessionData.timeline.reduce((sum, data) => sum + data.detections.length, 0)} total detections
              </span>
              <span>•</span>
              <span>{sessionData.gpsData.length} GPS points</span>
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

      {/* Global Styles */}
      <style jsx global>{`
        .slider {
          background: linear-gradient(to right, #3B82F6 0%, #3B82F6 ${(currentIndex / Math.max(sessionData.timeline.length - 1, 1)) * 100}%, #E5E7EB ${(currentIndex / Math.max(sessionData.timeline.length - 1, 1)) * 100}%, #E5E7EB 100%);
        }
        
        .text-shadow {
          text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
        }
        
        /* Custom scrollbar for better UX */
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        
        ::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 3px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
        
        /* Animation for smooth transitions */
        .camera-transition {
          transition: all 0.3s ease-in-out;
        }
        
        /* Loading shimmer effect */
        @keyframes shimmer {
          0% {
            background-position: -468px 0;
          }
          100% {
            background-position: 468px 0;
          }
        }
        
        .shimmer {
          animation: shimmer 1.5s ease-in-out infinite;
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 468px 100%;
        }
      `}</style>
    </div>
  );
}