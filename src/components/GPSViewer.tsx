// components/GPSViewer.tsx - Updated to work with server GPS data
import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Navigation, Satellite, MapPin, RefreshCw, AlertTriangle, Route } from 'lucide-react';

// Complete Google Maps type declarations
declare global {
  interface Window {
    google?: {
      maps: {
        StreetViewPanorama: new (element: HTMLElement, options: any) => any;
        Map: new (element: HTMLElement, options: any) => any;
        Marker: new (options: any) => any;
        Polyline: new (options: any) => any;
        LatLng: new (lat: number, lng: number) => any;
        InfoWindow: new (options?: any) => any;
        Size: new (width: number, height: number, widthUnit?: string, heightUnit?: string) => any;
        Point: new (x: number, y: number) => any;
        event: {
          addListener: (instance: any, eventName: string, handler: Function) => any;
        };
      };
    };
    initMap?: () => void;
  }
}

interface ImageData {
  timestamp: string;
  date: string;
  time: string;
  latitude: number;
  longitude: number;
  detections: any[];
  images: { [cameraName: string]: { [className: string]: string[] } };
  fullPaths: { [cameraName: string]: { [className: string]: string[] } };
}

interface GPSData {
  timestamp: string;
  time: string;
  date: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  speed?: number;
  heading?: number;
}

interface GPSViewerProps {
  currentData: ImageData;
  allData: ImageData[];
  gpsData: GPSData[];
  className?: string;
  /** Optional label showing which CSV/endpoint supplied gpsData */
  gpsLabel?: string; // NEW
}

const GPSViewer: React.FC<GPSViewerProps> = ({ currentData, allData, gpsData, className = '', gpsLabel }) => {
  const [streetViewLoaded, setStreetViewLoaded] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showRoute, setShowRoute] = useState(true);
  const [isLoadingMaps, setIsLoadingMaps] = useState(true);
  const [streetViewAvailable, setStreetViewAvailable] = useState(true);
  
  const streetViewRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const panoramaRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);
  const routePolylineRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Google Maps API key - replace with your actual key
  const GOOGLE_MAPS_API_KEY = "AIzaSyA7k2rXZ_EIPf768ZogKJhfZAhBTR06lvI";

  // Use GPS data if available, fallback to timeline data
  const routeData = gpsData.length > 0 ? gpsData : allData;

  // Utility function to create custom marker icons
  const createMarkerIcon = (color: string, label?: string, size: number = 20) => {
    if (!window.google?.maps) return undefined;

    const svg = `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="${color}" stroke="#FFFFFF" stroke-width="2"/>
        ${label ? `<text x="${size/2}" y="${size/2 + 4}" text-anchor="middle" fill="white" font-size="${size/2}" font-weight="bold">${label}</text>` : 
                  `<circle cx="${size/2}" cy="${size/2}" r="${size/4}" fill="#FFFFFF"/>`}
      </svg>
    `;

    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
      scaledSize: new window.google.maps.Size(size, size),
      anchor: new window.google.maps.Point(size/2, size/2)
    };
  };

  // Load Google Maps API with error handling
  useEffect(() => {
    // Check if Google Maps is already loaded
    if (window.google?.maps) {
      setStreetViewLoaded(true);
      setMapLoaded(true);
      setIsLoadingMaps(false);
      return;
    }

    // Check if script is already being loaded
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      return;
    }

    setIsLoadingMaps(true);
    setApiError(null);

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initMap&libraries=geometry`;
    script.async = true;
    script.defer = true;
    
    window.initMap = () => {
      try {
        setStreetViewLoaded(true);
        setMapLoaded(true);
        setApiError(null);
        setIsLoadingMaps(false);
        console.log('Google Maps API loaded successfully');
      } catch (error) {
        console.error('Error in initMap callback:', error);
        setApiError('Failed to initialize Google Maps');
        setIsLoadingMaps(false);
      }
    };

    script.onerror = (error) => {
      console.error('Failed to load Google Maps script:', error);
      setApiError('Failed to load Google Maps API. Please check your API key and internet connection.');
      setIsLoadingMaps(false);
    };

    script.onload = () => {
      console.log('Google Maps script loaded, waiting for callback...');
    };

    document.head.appendChild(script);

    // Cleanup function
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      delete window.initMap;
    };
  }, [GOOGLE_MAPS_API_KEY]);

  // Initialize Street View (only once)
  useEffect(() => {
    if (!streetViewLoaded || !streetViewRef.current || !currentData || !window.google?.maps || panoramaRef.current) {
      return;
    }

    try {
      console.log('Initializing Street View panorama...');
      panoramaRef.current = new window.google.maps.StreetViewPanorama(
        streetViewRef.current,
        {
          position: { lat: currentData.latitude, lng: currentData.longitude },
          pov: { heading: 0, pitch: 0 },
          zoom: 1,
          addressControl: false,
          enableCloseButton: false,
          showRoadLabels: true,
          motionTracking: false,
          motionTrackingControl: false,
          panControl: true,
          zoomControl: true
        }
      );

      // Add error handler for Street View
      window.google.maps.event.addListener(panoramaRef.current, 'status_changed', () => {
        const status = panoramaRef.current.getStatus();
        console.log('Street View status:', status);
        if (status !== 'OK') {
          console.warn('Street View not available for this location:', status);
          setStreetViewAvailable(false);
        } else {
          setStreetViewAvailable(true);
        }
      });

      console.log('Street View panorama initialized');
    } catch (error) {
      console.error('Error initializing Street View:', error);
      setStreetViewAvailable(false);
    }
  }, [streetViewLoaded, streetViewRef.current]);

  // Update Street View position when currentData changes
  useEffect(() => {
    if (!panoramaRef.current || !currentData || !window.google?.maps) {
      return;
    }

    try {
      console.log(`Updating Street View position to: ${currentData.latitude}, ${currentData.longitude}`);
      
      const newPosition = { lat: currentData.latitude, lng: currentData.longitude };
      panoramaRef.current.setPosition(newPosition);
      
      // Reset view angle for new location
      panoramaRef.current.setPov({ heading: 0, pitch: 0 });
      
      // Optional: Reset zoom
      panoramaRef.current.setZoom(1);
      
      console.log('Street View position updated successfully');
    } catch (error) {
      console.error('Error updating Street View position:', error);
    }
  }, [currentData.latitude, currentData.longitude, currentData.timestamp]);

  // Initialize Map with route
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || routeData.length === 0 || !window.google?.maps) {
      return;
    }

    try {
      // Initialize map centered on current location
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        zoom: 15,
        center: { lat: currentData.latitude, lng: currentData.longitude },
        mapTypeId: 'roadmap',
        gestureHandling: 'cooperative',
        zoomControl: true,
        mapTypeControl: true,
        scaleControl: true,
        streetViewControl: true,
        rotateControl: false,
        fullscreenControl: true
      });

      updateMapMarkers();
      if (showRoute) {
        updateRoute();
      }
    } catch (error) {
      console.error('Error initializing map:', error);
      setApiError('Failed to initialize map');
    }
  }, [mapLoaded, routeData]);

  // Update map when current data changes
  useEffect(() => {
    if (mapInstanceRef.current && window.google?.maps) {
      updateMapMarkers();
      if (showRoute) {
        updateRoute();
      }
    }
  }, [currentData, showRoute]);

  const updateMapMarkers = () => {
    if (!mapInstanceRef.current || !window.google?.maps) return;

    try {
      // Clear existing markers
      markersRef.current.forEach(marker => {
        if (marker && marker.setMap) {
          marker.setMap(null);
        }
      });
      markersRef.current = [];

      // Add current position marker
      const currentMarker = new window.google.maps.Marker({
        position: { lat: currentData.latitude, lng: currentData.longitude },
        map: mapInstanceRef.current,
        title: `Current Position: ${currentData.timestamp}`,
        icon: createMarkerIcon('#EF4444', '●', 24)
      });

      // Add info window to current marker
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; font-family: system-ui;">
            <h3 style="margin: 0 0 8px 0; font-weight: bold;">${currentData.timestamp}</h3>
            <p style="margin: 4px 0; font-size: 14px;">Detections: ${currentData.detections.length}</p>
            <p style="margin: 4px 0; font-size: 12px;">Lat: ${currentData.latitude.toFixed(6)}</p>
            <p style="margin: 4px 0; font-size: 12px;">Lng: ${currentData.longitude.toFixed(6)}</p>
          </div>
        `
      });

      window.google.maps.event.addListener(currentMarker, 'click', () => {
        infoWindow.open(mapInstanceRef.current, currentMarker);
      });

      markersRef.current.push(currentMarker);

      // Center map on current position with smooth animation
      mapInstanceRef.current.panTo({ lat: currentData.latitude, lng: currentData.longitude });
      
      console.log(`Map centered on: ${currentData.latitude}, ${currentData.longitude}`);
    } catch (error) {
      console.error('Error updating map markers:', error);
    }
  };

  const updateRoute = () => {
    if (!mapInstanceRef.current || !window.google?.maps || routeData.length < 2) return;

    try {
      // Clear existing route
      if (routePolylineRef.current) {
        routePolylineRef.current.setMap(null);
      }

      // Create route path from GPS data
      const routePath = routeData.map(data => ({
        lat: data.latitude,
        lng: data.longitude
      }));

      // Create polyline
      routePolylineRef.current = new window.google.maps.Polyline({
        path: routePath,
        geodesic: true,
        strokeColor: '#3B82F6',
        strokeOpacity: 0.8,
        strokeWeight: 3
      });

      routePolylineRef.current.setMap(mapInstanceRef.current);

      // Add start and end markers
      if (routePath.length > 0) {
        // Start marker
        const startMarker = new window.google.maps.Marker({
          position: routePath[0],
          map: mapInstanceRef.current,
          title: 'Route Start',
          icon: createMarkerIcon('#10B981', 'S', 20)
        });

        // End marker
        const endMarker = new window.google.maps.Marker({
          position: routePath[routePath.length - 1],
          map: mapInstanceRef.current,
          title: 'Route End',
          icon: createMarkerIcon('#F59E0B', 'E', 20)
        });

        markersRef.current.push(startMarker, endMarker);
      }
    } catch (error) {
      console.error('Error updating route:', error);
    }
  };

  const refreshMaps = () => {
    try {
      console.log('Manually refreshing maps...');
      if (panoramaRef.current && currentData) {
        panoramaRef.current.setPosition({ lat: currentData.latitude, lng: currentData.longitude });
        panoramaRef.current.setPov({ heading: 0, pitch: 0 });
      }
      updateMapMarkers();
    } catch (error) {
      console.error('Error refreshing maps:', error);
    }
  };

  const retryLoadMaps = () => {
    setApiError(null);
    setIsLoadingMaps(true);
    window.location.reload(); // Simple retry by reloading the page
  };

  const formatCoordinate = (coord: number, type: 'lat' | 'lng') => {
    const direction = type === 'lat' ? (coord >= 0 ? 'N' : 'S') : (coord >= 0 ? 'E' : 'W');
    return `${Math.abs(coord).toFixed(6)}° ${direction}`;
  };

  const calculateDistance = () => {
    if (routeData.length < 2) return 0;
    
    // Simple distance calculation (Haversine formula could be more accurate)
    let totalDistance = 0;
    for (let i = 1; i < routeData.length; i++) {
      const prev = routeData[i - 1];
      const curr = routeData[i];
      
      const lat1 = prev.latitude * Math.PI / 180;
      const lat2 = curr.latitude * Math.PI / 180;
      const deltaLat = (curr.latitude - prev.latitude) * Math.PI / 180;
      const deltaLng = (curr.longitude - prev.longitude) * Math.PI / 180;
      
      const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
                Math.cos(lat1) * Math.cos(lat2) *
                Math.sin(deltaLng/2) * Math.sin(deltaLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = 6371 * c; // Earth's radius in km
      
      totalDistance += distance;
    }
    
    return totalDistance;
  };

  const totalDistance = calculateDistance();

  // Loading state
  if (isLoadingMaps) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="w-5 h-5 animate-spin" />
            Loading GPS & Navigation...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Navigation className="w-12 h-12 mx-auto mb-4 text-blue-400 animate-pulse" />
            <h3 className="text-lg font-semibold mb-2">Loading Google Maps</h3>
            <p className="text-sm text-gray-600">
              Please wait while we initialize the mapping services...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (apiError) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            GPS & Navigation - Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-400" />
            <h3 className="text-lg font-semibold mb-2">Google Maps Error</h3>
            <p className="text-sm text-gray-600 mb-4">
              {apiError}
            </p>
            <div className="space-y-2">
              <Button onClick={retryLoadMaps} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
              <p className="text-xs text-gray-500">
                Make sure you have a valid Google Maps API key and internet connection
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* GPS Info Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Navigation className="w-5 h-5" />
              GPS Location & Navigation
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={gpsData.length > 0 ? "default" : "secondary"} className="text-xs">
                <Route className="w-3 h-3 mr-1" />
                {gpsData.length > 0 ? (gpsLabel || 'GPS Log Data') : 'Timeline Data'}
              </Badge>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowRoute(!showRoute)}
              >
                {showRoute ? 'Hide' : 'Show'} Route
              </Button>
              <Button variant="outline" size="sm" onClick={refreshMaps}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-red-500" />
              <div>
                <div className="text-sm font-medium">Current Position</div>
                <div className="text-xs text-gray-600">{formatCoordinate(currentData.latitude, 'lat')}</div>
                <div className="text-xs text-gray-600">{formatCoordinate(currentData.longitude, 'lng')}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Satellite className="w-4 h-4 text-green-500" />
              <div>
                <div className="text-sm font-medium">Data Source</div>
                <div className="text-xs text-gray-600">
                  {gpsData.length > 0 ? (gpsLabel || 'GPS Log Data') : 'Timeline coordinates'}
                </div>
                <div className="text-xs text-gray-600">{routeData.length} points</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Route className="w-4 h-4 text-blue-500" />
              <div>
                <div className="text-sm font-medium">Route Distance</div>
                <div className="text-xs text-gray-600">
                  {totalDistance > 0 ? `${totalDistance.toFixed(2)} km` : 'Calculating...'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-purple-500" />
              <div>
                <div className="text-sm font-medium">Location</div>
                <div className="text-xs text-gray-600">Yokosuka, Kanagawa, JP</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Maps Grid */}
      <div className="flex flex-col-reverse gap-5">
        {/* Street View */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Navigation className="w-4 h-4" />
                Street View 360°
              </span>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{currentData.timestamp.split(' ')[1]}</Badge>
                {!streetViewAvailable && (
                  <Badge variant="destructive" className="text-xs">No Street View</Badge>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden relative">
              <div
                ref={streetViewRef}
                className="w-full h-full"
                style={{ minHeight: '300px' }}
              />
              {!streetViewAvailable && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                  <div className="text-center">
                    <Navigation className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <div className="text-sm font-medium text-gray-600">Street View Not Available</div>
                    <div className="text-xs text-gray-500">No street imagery found for this location</div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Route Map */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Route Map
              </span>
              <div className="flex items-center gap-2">
                {showRoute && (
                  <Badge variant="secondary" className="text-xs">
                    {routeData.length} points
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  Live
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
              <div
                ref={mapRef}
                className="w-full h-full"
                style={{ minHeight: '300px' }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* GPS Statistics */}
      {/* <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Satellite className="w-5 h-5" />
            GPS Statistics & Data Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <h4 className="font-medium mb-2">Current Position</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Decimal:</span>
                  <span className="font-mono text-xs">
                    {currentData.latitude.toFixed(6)}, {currentData.longitude.toFixed(6)}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  Timestamp: {currentData.timestamp.split(' ')[1]}
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Data Source Info</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>GPS Points:</span>
                  <span>{gpsData.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Timeline Points:</span>
                  <span>{allData.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Active Source:</span>
                  <Badge variant="outline" className="text-xs">
                    {gpsData.length > 0 ? 'GPS Log' : 'Timeline'}
                  </Badge>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Time Range</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Start:</span>
                  <span className="text-xs">{routeData[0]?.time.split('.')[0] || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Current:</span>
                  <span className="text-xs">{currentData.time.split('.')[0]}</span>
                </div>
                <div className="flex justify-between">
                  <span>End:</span>
                  <span className="text-xs">{routeData[routeData.length - 1]?.time.split('.')[0] || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Detection Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Current Frame:</span>
                  <span>{currentData.detections.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Detections:</span>
                  <span>{allData.reduce((sum, d) => sum + d.detections.length, 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Route Distance:</span>
                  <span>{totalDistance > 0 ? `${totalDistance.toFixed(1)}km` : 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card> */}
    </div>
  );
};

export default GPSViewer;