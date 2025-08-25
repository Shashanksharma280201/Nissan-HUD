// components/CameraViewer.tsx - Complete Debug version with enhanced logging
import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, Eye, EyeOff, Download, Info, AlertTriangle, RefreshCw, Image as ImageIcon, Bug } from 'lucide-react';

// Class color mappings
const CLASS_COLORS: { [key: string]: string } = {
  'crack': '#EF4444',
  'pothole': '#F59E0B',
  'road_damage': '#EF4444',
  'lane_marking': '#3B82F6',
  'manhole': '#6B7280',
  'patch': '#8B5CF6',
  'general': '#10B981',
  'anomaly': '#F59E0B',
  'damage': '#EF4444',
  'pole': '#9333EA',
  'white_line_blur': '#64748B'
};

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

interface CameraViewerProps {
  cameraName: string;
  data: ImageData;
  isVisible: boolean;
  onToggleVisibility: () => void;
  serverUrl: string;
  cameraSession?: string;
  className?: string;
}

const CAMERA_CONFIGS = [
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
    displayName: 'Camera 1',
    type: 'Standard',
    resolution: '1920x1080',
    color: '#10B981',
    description: 'Standard resolution road inspection camera',
    session: 'F2'
  },
  {
    name: 'cam1',
    displayName: 'Camera 1',
    type: 'Standard',
    resolution: '1920x1080',
    color: '#8B5CF6',
    description: 'Standard resolution road inspection camera',
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

const CameraViewer: React.FC<CameraViewerProps> = ({
  cameraName,
  data,
  isVisible,
  onToggleVisibility,
  serverUrl,
  cameraSession,
  className = ''
}) => {
  // ALL HOOKS MUST BE AT THE TOP
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [availableImages, setAvailableImages] = useState<string[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);

  // Helper function to add debug messages
  const addDebug = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugInfo(prev => [...prev.slice(-10), `[${timestamp}] ${message}`]);
    console.log(`[CameraViewer:${cameraName}] ${message}`);
  }, [cameraName]);

  // Compute values
  const cameraConfig = CAMERA_CONFIGS.find(c => 
    c.name === cameraName && 
    (cameraSession ? c.session === cameraSession : true)
  ) || CAMERA_CONFIGS.find(c => c.name === cameraName);

  const availableClasses = Object.keys(data.images?.[cameraName] || {});
  const currentClass = selectedClass || availableClasses[0] || '';
  
  // Get detections for current camera and class
  const currentDetections = (data.detections || []).filter(d => {
    const isCorrectCamera = cameraConfig?.name === '4kcam' ? d.streamId >= 100 : d.streamId < 100;
    const isCorrectClass = !currentClass || d.className === currentClass;
    return isCorrectCamera && isCorrectClass;
  });

  // Load available images using multiple strategies
  const loadAvailableImages = useCallback(async () => {
    if (!currentClass) {
      addDebug('No class selected, skipping image load');
      return;
    }

    setLoadingImages(true);
    addDebug(`Starting image load for class: ${currentClass}`);
    
    try {
      const sessionPath = cameraSession || cameraConfig?.session;
      addDebug(`Using session: ${sessionPath}`);
      
      // Strategy 1: Try to load from server directory listing
      const imageFolderPath = `${sessionPath}/${cameraName}/${currentClass}`;
      const listUrl = `${serverUrl}/list/${imageFolderPath}`;
      addDebug(`Trying directory listing: ${listUrl}`);
      
      const response = await fetch(listUrl);
      addDebug(`Directory listing response: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const result = await response.json();
        addDebug(`Directory listing result: ${JSON.stringify(result, null, 2).slice(0, 200)}...`);
        
        if (result.files && result.files.length > 0) {
          const imageFiles = result.files
            .filter((file: any) => {
              const isFile = file.type === 'file';
              const isImage = /\.(jpg|jpeg|png|bmp|gif|webp)$/i.test(file.name);
              return isFile && isImage;
            })
            .map((file: any) => file.name)
            .sort();
          
          setAvailableImages(imageFiles);
          addDebug(`Found ${imageFiles.length} images: ${imageFiles.slice(0, 3).join(', ')}${imageFiles.length > 3 ? '...' : ''}`);
          
          if (imageFiles.length === 0) {
            // Strategy 2: Try to generate common image names and test them
            addDebug('No images found in directory, trying common naming patterns...');
            await tryCommonImageNames(sessionPath!, cameraName, currentClass);
          }
        } else {
          addDebug('No files found in directory listing');
          await tryCommonImageNames(sessionPath!, cameraName, currentClass);
        }
      } else {
        addDebug(`Directory listing failed: ${response.status}, trying common names`);
        await tryCommonImageNames(sessionPath!, cameraName, currentClass);
      }
      
    } catch (error) {
      addDebug(`Error in loadAvailableImages: ${error}`);
      await tryCommonImageNames(cameraSession || cameraConfig?.session || 'F2', cameraName, currentClass);
    } finally {
      setLoadingImages(false);
    }
  }, [currentClass, cameraName, cameraConfig, cameraSession, serverUrl, addDebug]);

  // Strategy 2: Try common image naming patterns
  const tryCommonImageNames = async (sessionPath: string, cameraName: string, className: string) => {
    addDebug('Trying common image naming patterns...');
    
    const commonPatterns = [
      // Common image name patterns
      'frame_001.jpg', 'frame_001.png',
      'image_001.jpg', 'image_001.png', 
      'img_001.jpg', 'img_001.png',
      '001.jpg', '001.png',
      `${cameraName}_001.jpg`,
      `${className}_001.jpg`,
      'detection_001.jpg',
      'sample.jpg', 'sample.png',
      'test.jpg', 'test.png'
    ];

    const foundImages: string[] = [];
    
    for (const pattern of commonPatterns) {
      try {
        // Images are in images/ subdirectory
        const testUrl = `${serverUrl}/data/${sessionPath}/${cameraName}/${className}/images/${pattern}`;
        addDebug(`Testing image: ${testUrl}`);
        
        const response = await fetch(testUrl, { method: 'HEAD' });
        if (response.ok) {
          foundImages.push(pattern);
          addDebug(`✓ Found image: ${pattern}`);
        }
      } catch (error) {
        // Ignore errors for individual image tests
      }
    }

    if (foundImages.length > 0) {
      setAvailableImages(foundImages);
      addDebug(`Found ${foundImages.length} images via pattern matching: ${foundImages.join(', ')}`);
    } else {
      addDebug('No images found via pattern matching');
      setAvailableImages([]);
    }
  };

  // Get current image path
  const getCurrentImagePath = () => {
    if (availableImages.length === 0) return null;
    
    const imageName = availableImages[selectedImageIndex] || availableImages[0];
    if (!imageName || !cameraConfig) return null;
    
    const sessionPath = cameraSession || cameraConfig.session;
    // Images are in images/ subdirectory
    const fullPath = `${serverUrl}/data/${sessionPath}/${cameraName}/${currentClass}/images/${imageName}`;
    addDebug(`Generated image path: ${fullPath}`);
    return fullPath;
  };

  const currentImagePath = getCurrentImagePath();

  // Effects
  useEffect(() => {
    if (availableClasses.length > 0 && !selectedClass) {
      setSelectedClass(availableClasses[0]);
      addDebug(`Auto-selected class: ${availableClasses[0]} from ${availableClasses.join(', ')}`);
    }
    setSelectedImageIndex(0);
    setImageError(false);
    setImageLoading(false);
  }, [cameraName, availableClasses, selectedClass, addDebug]);

  // Load images when class changes
  useEffect(() => {
    if (currentClass && cameraConfig) {
      addDebug(`Class changed to: ${currentClass}, loading images...`);
      loadAvailableImages();
    }
  }, [currentClass, loadAvailableImages, cameraConfig, addDebug]);

  // Reset image index when images change
  useEffect(() => {
    setSelectedImageIndex(0);
    setImageError(false);
  }, [availableImages]);

  // Callbacks
  const handleImageLoad = useCallback(() => {
    setImageError(false);
    setImageLoading(false);
    addDebug(`✓ Image loaded successfully: ${currentImagePath}`);
  }, [currentImagePath, addDebug]);

  const handleImageError = useCallback(() => {
    setImageError(true);
    setImageLoading(false);
    addDebug(`✗ Image load failed: ${currentImagePath}`);
  }, [currentImagePath, addDebug]);

  const handleImageLoadStart = useCallback(() => {
    setImageLoading(true);
    setImageError(false);
    addDebug(`Starting to load image: ${currentImagePath}`);
  }, [currentImagePath, addDebug]);

  const retryImage = useCallback(() => {
    addDebug('Retrying image load...');
    setImageError(false);
    setImageLoading(true);
    const img = new Image();
    img.onload = handleImageLoad;
    img.onerror = handleImageError;
    if (currentImagePath) {
      img.src = `${currentImagePath}?t=${Date.now()}`;
    }
  }, [currentImagePath, handleImageLoad, handleImageError, addDebug]);

  const refreshImages = useCallback(() => {
    addDebug('Manual refresh triggered');
    loadAvailableImages();
  }, [loadAvailableImages, addDebug]);

  const testServerConnection = useCallback(async () => {
    addDebug('Testing server connection...');
    try {
      const healthResponse = await fetch(`${serverUrl}/health`);
      addDebug(`Server health: ${healthResponse.status} ${healthResponse.statusText}`);
      
      const dashboardResponse = await fetch(`${serverUrl}/api/dashboard`);
      addDebug(`Dashboard API: ${dashboardResponse.status} ${dashboardResponse.statusText}`);
      
      if (dashboardResponse.ok) {
        const dashboard = await dashboardResponse.json();
        addDebug(`Dashboard data preview: ${JSON.stringify(dashboard).slice(0, 100)}...`);
      }
      
    } catch (error) {
      addDebug(`Server connection test failed: ${error}`);
    }
  }, [serverUrl, addDebug]);

  // Check if we have data for this camera
  const hasData = availableClasses.length > 0;

  // Render collapsed view when not visible
  if (!isVisible) {
    return (
      <Card className={`${className} opacity-50`}>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Camera className="w-4 h-4" />
              {cameraConfig?.displayName || cameraName}
              {!hasData && <Badge variant="secondary" className="text-xs">No Data</Badge>}
              {hasData && availableImages.length > 0 && (
                <Badge variant="outline" className="text-xs">{availableImages.length} imgs</Badge>
              )}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onToggleVisibility}>
              <Eye className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
      </Card>
    );
  }

  // Render no data view
  if (!hasData) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: cameraConfig?.color || '#6B7280' }}
              />
              <Camera className="w-4 h-4" />
              {cameraConfig?.displayName || cameraName}
              <Badge variant="secondary" className="text-xs">No Data</Badge>
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onToggleVisibility}>
              <EyeOff className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <div>No data available for this camera</div>
            <div className="text-xs mt-2">
              Expected path: {cameraSession || cameraConfig?.session}/{cameraName}/[class]/
            </div>
            <div className="mt-3 space-x-2">
              <Button variant="outline" size="sm" onClick={refreshImages}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Check for Images
              </Button>
              <Button variant="outline" size="sm" onClick={testServerConnection}>
                Test Server
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Main render - camera with data
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: cameraConfig?.color || '#6B7280' }}
            />
            <Camera className="w-4 h-4" />
            {cameraConfig?.displayName || cameraName}
            <Badge variant="outline" className="text-xs">
              {cameraSession || cameraConfig?.session}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {cameraConfig?.resolution || 'Unknown'}
            </Badge>
            {availableImages.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {availableImages.length} images
              </Badge>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowDebug(!showDebug)}
              className="text-orange-500"
            >
              <Bug className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onToggleVisibility}>
              <EyeOff className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {cameraConfig?.description && (
          <p className="text-sm text-gray-600">{cameraConfig.description}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Debug Panel */}
        {showDebug && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Bug className="w-4 h-4 text-orange-600" />
                <span className="font-medium text-sm text-orange-700">Debug Console</span>
              </div>
              <div className="space-x-2">
                <Button variant="outline" size="sm" onClick={testServerConnection}>
                  Test Server
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDebugInfo([])}>
                  Clear
                </Button>
              </div>
            </div>
            <div className="max-h-32 overflow-y-auto bg-white p-2 rounded border text-xs font-mono">
              {debugInfo.length === 0 ? (
                <div className="text-gray-500">No debug messages yet...</div>
              ) : (
                debugInfo.map((msg, idx) => (
                  <div key={idx} className="text-orange-700 mb-1">{msg}</div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {availableClasses.length > 1 && (
            <Select value={currentClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableClasses.map(cls => (
                  <SelectItem key={cls} value={cls}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: CLASS_COLORS[cls] || '#6B7280' }}
                      />
                      {cls.replace('_', ' ')}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {availableImages.length > 1 && (
            <Select 
              value={selectedImageIndex.toString()} 
              onValueChange={(v) => setSelectedImageIndex(parseInt(v))}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableImages.map((imageName, index) => (
                  <SelectItem key={index} value={index.toString()}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{index + 1}</span>
                      <span>{imageName.length > 12 ? `${imageName.slice(0, 9)}...` : imageName}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
            className="text-xs"
          >
            {showBoundingBoxes ? 'Hide' : 'Show'} Boxes
          </Button>

          <Button 
            variant="outline" 
            size="sm"
            onClick={refreshImages}
            className="text-xs"
            disabled={loadingImages}
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${loadingImages ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Loading indicator for images */}
        {loadingImages && (
          <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-2 rounded">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Loading available images from server...
          </div>
        )}

        {/* Image Display */}
        <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden border">
          {currentImagePath ? (
            <>
              {imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
                  <div className="text-center">
                    <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-blue-500" />
                    <div className="text-sm text-gray-600">Loading image...</div>
                  </div>
                </div>
              )}
              
              {imageError ? (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
                  <div className="text-center p-4 max-w-sm">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-red-400" />
                    <div className="text-lg font-semibold mb-2 text-gray-600">
                      Image Load Failed
                    </div>
                    <div className="text-sm text-gray-500 mb-3">
                      {currentClass ? currentClass.replace('_', ' ') : 'No class'} detection
                    </div>
                    <div className="mb-3">
                      <div className="text-xs text-red-500 break-all bg-red-50 p-2 rounded border mb-2 max-h-20 overflow-y-auto">
                        {currentImagePath}
                      </div>
                      <div className="space-x-2">
                        <Button variant="outline" size="sm" onClick={retryImage}>
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Retry
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => window.open(currentImagePath, '_blank')}>
                          Test URL
                        </Button>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 mt-2">
                      Check server data structure and static file serving
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <img
                    src={currentImagePath}
                    alt={`${cameraName} - ${currentClass}`}
                    className="w-full h-full object-contain"
                    onError={handleImageError}
                    onLoad={handleImageLoad}
                    onLoadStart={handleImageLoadStart}
                  />
                  
                  {/* Bounding Box Overlays */}
                  {showBoundingBoxes && currentDetections.length > 0 && !imageLoading && !imageError && (
                    <div className="absolute inset-0 pointer-events-none">
                      {currentDetections.map((detection, idx) => (
                        <div
                          key={idx}
                          className="absolute border-2"
                          style={{
                            borderColor: CLASS_COLORS[detection.className] || '#EF4444',
                            left: `${(detection.left / (cameraConfig?.name === '4kcam' ? 4096 : 1920)) * 100}%`,
                            top: `${(detection.top / (cameraConfig?.name === '4kcam' ? 2160 : 1080)) * 100}%`,
                            width: `${(detection.width / (cameraConfig?.name === '4kcam' ? 4096 : 1920)) * 100}%`,
                            height: `${(detection.height / (cameraConfig?.name === '4kcam' ? 2160 : 1080)) * 100}%`,
                          }}
                        >
                          <div 
                            className="absolute -top-6 left-0 text-white text-xs px-1 py-0.5 rounded"
                            style={{ backgroundColor: CLASS_COLORS[detection.className] || '#EF4444' }}
                          >
                            {detection.className} ({(detection.confidence * 100).toFixed(1)}%)
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              <div className="text-center p-4">
                <ImageIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <div className="text-lg font-semibold mb-2 text-gray-600">
                  {availableImages.length === 0 ? 'No Images Available' : 'Select an Image'}
                </div>
                <div className="text-sm text-gray-500 mb-2">
                  {currentClass ? `${currentClass.replace('_', ' ')} class` : 'No class selected'}
                </div>
                <div className="text-xs text-gray-400 mb-3">
                  Expected path: {cameraSession || cameraConfig?.session}/{cameraName}/{currentClass}/images/
                </div>
                {loadingImages ? (
                  <div className="flex items-center justify-center gap-2 text-blue-600">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Loading images...</span>
                  </div>
                ) : (
                  <div className="space-x-2">
                    <Button variant="outline" size="sm" onClick={refreshImages}>
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Check for Images
                    </Button>
                    <Button variant="outline" size="sm" onClick={testServerConnection}>
                      Test Server
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Image Info Panel */}
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <ImageIcon className="w-4 h-4" />
            <span className="font-medium text-sm">Image & Path Info</span>
          </div>
          <div className="grid grid-cols-1 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="font-medium">Available Images:</span>
              <span>{availableImages.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Current Index:</span>
              <span>{selectedImageIndex + 1} of {availableImages.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Session:</span>
              <span>{cameraSession || cameraConfig?.session}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Available Classes:</span>
              <span>{availableClasses.join(', ') || 'None'}</span>
            </div>
            {currentImagePath && (
              <div className="col-span-1 mt-2">
                <span className="font-medium">Full Image URL:</span>
                <div className="mt-1 p-2 bg-white border rounded text-xs font-mono break-all">
                  {currentImagePath}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => window.open(currentImagePath, '_blank')}
                >
                  Test URL in Browser
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Detection Info */}
        {currentDetections.length > 0 && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4" />
              <span className="font-medium text-sm">Detection Details</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="font-medium">Count:</span> {currentDetections.length}
              </div>
              <div>
                <span className="font-medium">Class:</span>
                <Badge 
                  variant="outline" 
                  className="ml-1 text-xs"
                  style={{ borderColor: CLASS_COLORS[currentClass] || '#6B7280' }}
                >
                  {currentClass ? currentClass.replace('_', ' ') : 'Unknown'}
                </Badge>
              </div>
              {currentDetections[0] && (
                <>
                  <div>
                    <span className="font-medium">Confidence:</span> {(currentDetections[0].confidence * 100).toFixed(1)}%
                  </div>
                  <div>
                    <span className="font-medium">Frame:</span> {currentDetections[0].frameNum}
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium">Bbox:</span> 
                    <span className="ml-1 font-mono text-xs">
                      [{currentDetections[0].left.toFixed(0)}, {currentDetections[0].top.toFixed(0)}, 
                       {currentDetections[0].width.toFixed(0)}, {currentDetections[0].height.toFixed(0)}]
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Stats Footer */}
        <div className="flex justify-between items-center text-xs text-gray-500 pt-2 border-t">
          <div className="flex items-center gap-3">
            <span>{availableImages.length} images</span>
            <span>{currentDetections.length} detections</span>
            <span>{availableClasses.length} classes</span>
          </div>
          {currentImagePath && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 px-2 hover:bg-gray-100"
              onClick={() => {
                if (currentImagePath) {
                  window.open(currentImagePath, '_blank');
                }
              }}
              title="Open image in new tab"
            >
              <Download className="w-3 h-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CameraViewer;