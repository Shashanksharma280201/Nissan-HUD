// components/CameraViewer.tsx - Fixed version with proper hooks order and image loading
import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, Eye, EyeOff, Download, Info, AlertTriangle, RefreshCw } from 'lucide-react';
import { ImageData, DetectionData, CAMERA_CONFIGS, CLASS_COLORS } from '../types';

interface CameraViewerProps {
  cameraName: string;
  data: ImageData;
  isVisible: boolean;
  onToggleVisibility: () => void;
  className?: string;
}

const CameraViewer: React.FC<CameraViewerProps> = ({
  cameraName,
  data,
  isVisible,
  onToggleVisibility,
  className = ''
}) => {
  // ALL HOOKS MUST BE AT THE TOP - before any early returns
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  // Compute values
  const cameraConfig = CAMERA_CONFIGS.find(c => c.name === cameraName);
  const availableClasses = Object.keys(data.images?.[cameraName] || {});
  const currentClass = selectedClass || availableClasses[0] || '';
  const currentImages = data.images?.[cameraName]?.[currentClass] || [];
  const currentPaths = data.fullPaths?.[cameraName]?.[currentClass] || [];
  const currentImagePath = currentPaths[selectedImageIndex];

  // Get detections for current camera and class
  const currentDetections = (data.detections || []).filter(d => 
    d.className === currentClass && 
    (cameraConfig?.name === '4kcam' ? d.streamId >= 100 : d.streamId < 100)
  );

  // Effects
  useEffect(() => {
    if (availableClasses.length > 0 && !selectedClass) {
      setSelectedClass(availableClasses[0]);
    }
    setSelectedImageIndex(0);
    setImageError(false);
    setImageLoading(false);
  }, [cameraName, availableClasses, selectedClass]);

  // Callbacks
  const handleImageLoad = useCallback(() => {
    setImageError(false);
    setImageLoading(false);
    console.log('Image loaded successfully:', currentImagePath);
  }, [currentImagePath]);

  const handleImageError = useCallback(() => {
    setImageError(true);
    setImageLoading(false);
    console.error(`Failed to load image: ${currentImagePath}`);
  }, [currentImagePath]);

  const handleImageLoadStart = useCallback(() => {
    setImageLoading(true);
    setImageError(false);
    console.log('Starting to load image:', currentImagePath);
  }, [currentImagePath]);

  const retryImage = useCallback(() => {
    setImageError(false);
    setImageLoading(true);
    // Force reload by adding timestamp
    const img = new Image();
    img.onload = handleImageLoad;
    img.onerror = handleImageError;
    if (currentImagePath) {
      img.src = `${currentImagePath}?t=${Date.now()}`;
    }
  }, [currentImagePath, handleImageLoad, handleImageError]);

  // Check if we have data for this camera
  const hasData = data.images?.[cameraName] && availableClasses.length > 0;

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
            <div className="text-xs mt-2">Expected path: {cameraName}</div>
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
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {cameraConfig?.resolution || 'Unknown'}
            </Badge>
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

          {currentImages.length > 1 && (
            <Select 
              value={selectedImageIndex.toString()} 
              onValueChange={(v) => setSelectedImageIndex(parseInt(v))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currentImages.map((_, index) => (
                  <SelectItem key={index} value={index.toString()}>
                    Image {index + 1}
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
        </div>

        {/* Image Display */}
        <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
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
                      <div className="text-xs text-red-500 break-all bg-red-50 p-2 rounded border mb-2">
                        {currentImagePath}
                      </div>
                      <Button variant="outline" size="sm" onClick={retryImage}>
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Retry
                      </Button>
                    </div>
                    <div className="text-xs text-gray-400 mt-2">
                      Check if HTTP server is running and CORS is enabled
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
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '100%',
                      imageRendering: 'auto' 
                    }}
                  />
                  
                  {/* Bounding Box Overlays */}
                  {showBoundingBoxes && currentDetections.length > 0 && !imageLoading && !imageError && (
                    <div className="absolute inset-0">
                      {currentDetections.map((detection, idx) => (
                        <div
                          key={idx}
                          className="absolute border-2 pointer-events-none"
                          style={{
                            borderColor: CLASS_COLORS[detection.className] || '#EF4444',
                            left: `${(detection.left / (cameraConfig?.name === '4kcam' ? 4096 : 1920)) * 100}%`,
                            top: `${(detection.top / (cameraConfig?.name === '4kcam' ? 2160 : 1080)) * 100}%`,
                            width: `${(detection.width / (cameraConfig?.name === '4kcam' ? 4096 : 1920)) * 100}%`,
                            height: `${(detection.height / (cameraConfig?.name === '4kcam' ? 2160 : 1080)) * 100}%`,
                          }}
                        >
                          <div 
                            className="absolute -top-6 left-0 text-white text-xs px-1 rounded"
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
                <Camera className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <div className="text-lg font-semibold mb-2 text-gray-600">
                  No Image Available
                </div>
                <div className="text-sm text-gray-500 mb-2">
                  {currentClass ? currentClass.replace('_', ' ') : 'No class'} detection
                </div>
              </div>
            </div>
          )}
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

        {/* Debug Info */}
        {process.env.NODE_ENV === 'development' && currentImagePath && (
          <div className="p-2 bg-blue-50 rounded text-xs">
            <div className="font-medium text-blue-700 mb-1">Debug Info:</div>
            <div className="text-blue-600 break-all mb-1">{currentImagePath}</div>
            <div className="text-blue-500">
              Available classes: {availableClasses.join(', ') || 'None'}
            </div>
            <div className="text-blue-500">
              Images in current class: {currentImages.length}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="flex justify-between text-xs text-gray-500">
          <span>{currentImages.length} images</span>
          <span>{currentDetections.length} detections</span>
          {currentImagePath && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 px-2"
              onClick={() => {
                if (currentImagePath) {
                  window.open(currentImagePath, '_blank');
                }
              }}
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