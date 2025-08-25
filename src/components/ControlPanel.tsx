// components/ControlPanel.tsx - Updated for server API integration
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  RotateCcw, 
  Upload, 
  FolderOpen, 
  Clock,
  Camera,
  MapPin,
  Activity,
  RefreshCw,
  Server,
  Wifi,
  Database
} from 'lucide-react';

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
}

interface SessionData {
  sessionName: string;
  sessionPath: string;
  cameras: CameraInfo[];
  timeline: ImageData[];
  gpsData: any[];
  systemMetrics: any[];
}

interface ControlPanelProps {
  sessionData: SessionData;
  currentIndex: number;
  isPlaying: boolean;
  playbackSpeed: number;
  onIndexChange: (index: number) => void;
  onPlayPause: () => void;
  onSpeedChange: (speed: number) => void;
  onLoadSession: (url: string) => void;
  onRefresh: () => void;
  serverUrl: string;
  className?: string;
}

const CAMERA_CONFIGS = [
  {
    name: '4kcam',
    displayName: '4K Camera',
    color: '#3B82F6'
  },
  {
    name: 'cam1',
    displayName: 'Camera 1',
    color: '#10B981'
  },
  {
    name: 'argus0',
    displayName: 'Argus Camera 0',
    color: '#F59E0B'
  },
  {
    name: 'argus1',
    displayName: 'Argus Camera 1',
    color: '#EF4444'
  }
];

const ControlPanel: React.FC<ControlPanelProps> = ({
  sessionData,
  currentIndex,
  isPlaying,
  playbackSpeed,
  onIndexChange,
  onPlayPause,
  onSpeedChange,
  onLoadSession,
  onRefresh,
  serverUrl,
  className = ''
}) => {
  const [customUrl, setCustomUrl] = useState(serverUrl);
  const [jumpToTime, setJumpToTime] = useState('');

  const currentData = sessionData.timeline[currentIndex];
  const totalFrames = sessionData.timeline.length;

  // Update custom URL when server changes
  useEffect(() => {
    setCustomUrl(serverUrl);
  }, [serverUrl]);

  const handlePrevious = () => {
    onIndexChange(Math.max(0, currentIndex - 1));
  };

  const handleNext = () => {
    onIndexChange(Math.min(totalFrames - 1, currentIndex + 1));
  };

  const handleJumpToStart = () => {
    onIndexChange(0);
  };

  const handleJumpToEnd = () => {
    onIndexChange(totalFrames - 1);
  };

  const handleTimeJump = () => {
    if (!jumpToTime) return;
    
    // Find closest timestamp
    const targetTime = jumpToTime;
    let closestIndex = 0;
    let closestDiff = Infinity;

    sessionData.timeline.forEach((data, index) => {
      const timeDiff = Math.abs(
        new Date(`${data.date} ${targetTime}`).getTime() - 
        new Date(`${data.date} ${data.time}`).getTime()
      );
      if (timeDiff < closestDiff) {
        closestDiff = timeDiff;
        closestIndex = index;
      }
    });

    onIndexChange(closestIndex);
    setJumpToTime('');
  };

  const formatTimestamp = (timestamp: string) => {
    return timestamp.replace(/[_-]/g, ' ').replace(/\.\d+/, '');
  };

  const getSessionStats = () => {
    const totalDetections = sessionData.timeline.reduce((sum, data) => sum + data.detections.length, 0);
    const uniqueClasses = new Set(sessionData.timeline.flatMap(data => 
      data.detections.map(d => d.className)
    ));
    
    return {
      totalDetections,
      uniqueClasses: Array.from(uniqueClasses),
      duration: sessionData.timeline.length > 0 ? 
        new Date(sessionData.timeline[sessionData.timeline.length - 1].timestamp).getTime() - 
        new Date(sessionData.timeline[0].timestamp).getTime() : 0
    };
  };

  const stats = getSessionStats();

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Server Connection Info */}
      {/* <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5" />
              Server Connection
            </CardTitle>
            <Badge variant="outline" className="text-green-600">
              <Wifi className="w-3 h-3 mr-1" />
              Connected
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Server URL:</span>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded">{serverUrl}</code>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Session:</span>
              <span className="font-medium">{sessionData.sessionName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">API Health:</span>
              <Badge variant="outline" className="text-xs">
                <Database className="w-3 h-3 mr-1" />
                Active
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card> */}

      {/* Session Info */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5" />
              Data Summary
            </CardTitle>
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-blue-500" />
              <div className="flex-1">
                <div className="font-medium">{sessionData.cameras.length} Cameras Active</div>
                <div className="text-xs text-gray-600 flex flex-wrap gap-1 mt-1">
                  {sessionData.cameras.map(c => (
                    <Badge key={c.name} variant="outline" className="text-xs">
                      {c.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-green-500" />
              <div className="flex-1">
                <div className="font-medium">{stats.totalDetections} Total Detections</div>
                <div className="text-xs text-gray-600">
                  {stats.uniqueClasses.length} unique classes: {stats.uniqueClasses.slice(0, 3).join(', ')}
                  {stats.uniqueClasses.length > 3 && '...'}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-red-500" />
              <div className="flex-1">
                <div className="font-medium">{sessionData.gpsData.length} GPS Points</div>
                <div className="text-xs text-gray-600">
                  {totalFrames} timeline frames
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-500" />
              <div className="flex-1">
                <div className="font-medium">
                  {Math.round(stats.duration / 1000 / 60)} minutes duration
                </div>
                <div className="text-xs text-gray-600">
                  {sessionData.systemMetrics.length} system metrics
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Playback Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Play className="w-5 h-5" />
            Playback Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main Controls */}
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" size="sm" onClick={handleJumpToStart}>
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrevious} disabled={currentIndex === 0}>
              <SkipBack className="w-4 h-4" />
            </Button>
            <Button onClick={onPlayPause} size="sm" className="px-6">
              {isPlaying ? (
                <Pause className="w-4 h-4 mr-2" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              {isPlaying ? 'Pause' : 'Play'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleNext} disabled={currentIndex === totalFrames - 1}>
              <SkipForward className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleJumpToEnd}>
              <RotateCcw className="w-4 h-4 rotate-180" />
            </Button>
          </div>

          {/* Speed Control */}
          <div className="flex items-center gap-3 justify-center">
            <span className="text-sm font-medium">Speed:</span>
            <Select value={playbackSpeed.toString()} onValueChange={(v) => onSpeedChange(parseFloat(v))}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.25">0.25x</SelectItem>
                <SelectItem value="0.5">0.5x</SelectItem>
                <SelectItem value="1">1x</SelectItem>
                <SelectItem value="2">2x</SelectItem>
                <SelectItem value="4">4x</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Timeline Scrubber */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Frame {currentIndex + 1} of {totalFrames}</span>
              <span>{Math.round((currentIndex / Math.max(totalFrames - 1, 1)) * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max={totalFrames - 1}
              value={currentIndex}
              onChange={(e) => onIndexChange(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{sessionData.timeline[0]?.time.split('.')[0] || '00:00:00'}</span>
              <span>{currentData?.time.split('.')[0] || '00:00:00'}</span>
              <span>{sessionData.timeline[totalFrames - 1]?.time.split('.')[0] || '00:00:00'}</span>
            </div>
          </div>

          {/* Time Jump */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Jump to time:</span>
            <Input
              type="time"
              step="1"
              value={jumpToTime}
              onChange={(e) => setJumpToTime(e.target.value)}
              className="w-32"
              placeholder="HH:MM:SS"
            />
            <Button variant="outline" size="sm" onClick={handleTimeJump} disabled={!jumpToTime}>
              Jump
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Frame Info */}
      {currentData && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Current Frame
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">Timestamp:</span>
                <Badge variant="outline">{formatTimestamp(currentData.timestamp)}</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="font-medium">Location:</span>
                <span className="text-sm font-mono">
                  {currentData.latitude.toFixed(6)}, {currentData.longitude.toFixed(6)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-medium">Detections:</span>
                <div className="flex items-center gap-1">
                  <Badge variant="secondary">{currentData.detections.length}</Badge>
                  {currentData.detections.length > 0 && (
                    <div className="flex gap-1">
                      {[...new Set(currentData.detections.map(d => d.className))].slice(0, 3).map(className => (
                        <Badge key={className} variant="outline" className="text-xs">
                          {className.replace('_', ' ')}
                        </Badge>
                      ))}
                      {[...new Set(currentData.detections.map(d => d.className))].length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{[...new Set(currentData.detections.map(d => d.className))].length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-medium">Cameras:</span>
                <div className="flex gap-1">
                  {Object.keys(currentData.images).map(cameraName => {
                    const config = CAMERA_CONFIGS.find(c => c.name === cameraName);
                    return (
                      <Badge 
                        key={cameraName} 
                        variant="outline" 
                        className="text-xs"
                        style={{ borderColor: config?.color }}
                      >
                        {config?.displayName || cameraName}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Server Connection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Server Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              type="text"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="http://localhost:8081"
              className="flex-1"
            />
            <Button 
              onClick={() => onLoadSession(customUrl)}
              size="sm"
              disabled={!customUrl.trim()}
            >
              Connect
            </Button>
          </div>
          
          <div className="text-xs text-gray-500">
            <div className="font-medium mb-1">Quick Connect Options:</div>
            <div className="space-y-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs w-full justify-start"
                onClick={() => onLoadSession('http://localhost:8081')}
              >
                🔗 Default Server (localhost:8081)
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs w-full justify-start"
                onClick={() => onLoadSession('http://localhost:8082')}
              >
                🔗 Alternative Server (localhost:8082)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #3B82F6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 0 0 1px rgba(0,0,0,0.1);
        }
        
        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #3B82F6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 0 0 1px rgba(0,0,0,0.1);
        }
      `}</style>
    </div>
  );
};

export default ControlPanel;