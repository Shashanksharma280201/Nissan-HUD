"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Image,
  MapPin,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Navigation,
  Satellite,
  AlertCircle,
} from "lucide-react";

type ScanFile = {
  session: string;
  camera: string;
  anomalyType: string;
  path: string;
  imageCount: number;
  hasImages: boolean;
  sampleImages: string[];
  imagesPath: string;
};

type ImageFile = {
  name: string;
  size: number;
  modified: string | Date;
  url: string;
};

type GPSPoint = {
  timestamp: string;
  date: string;
  time: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  session?: string;
  camera?: string;
  anomalyType?: string;
  source?: string;
};

type MetaRow = Record<string, string>;

// GPS Viewer Component (Simplified for this environment)
interface GPSViewerProps {
  gpsData: GPSPoint[];
  currentIndex?: number;
  className?: string;
}

const GPSViewer: React.FC<GPSViewerProps> = ({
  gpsData,
  currentIndex = 0,
  className = "",
}) => {
  const [showStats, setShowStats] = useState(true);

  if (!gpsData || gpsData.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <div className="text-sm text-gray-500">No GPS data available</div>
      </div>
    );
  }

  const currentGPS =
    gpsData[Math.min(currentIndex, gpsData.length - 1)] || gpsData[0];
  const totalDistance =
    gpsData.length > 1 ? (gpsData.length * 0.1).toFixed(2) : "0"; // Estimated

  return (
    <div className={`space-y-4 ${className}`}>
      {/* GPS Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Navigation className="w-4 h-4" />
              Current Position
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-gray-500">Lat:</span>
                  <div className="font-mono text-xs">
                    {currentGPS.latitude?.toFixed(6) || "N/A"}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Lng:</span>
                  <div className="font-mono text-xs">
                    {currentGPS.longitude?.toFixed(6) || "N/A"}
                  </div>
                </div>
              </div>
              <div className="mt-2">
                <span className="text-gray-500">Time:</span>
                <div className="font-mono text-xs">
                  {currentGPS.time || "N/A"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Satellite className="w-4 h-4" />
              Route Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Points:</span>
                <span>{gpsData.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Est. Distance:</span>
                <span>{totalDistance} km</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Current:</span>
                <span>
                  {Math.min(currentIndex + 1, gpsData.length)}/{gpsData.length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mock Map Placeholder */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4" />
            GPS Route Visualization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="aspect-video bg-gradient-to-br from-blue-50 to-green-50 rounded-lg flex items-center justify-center border-2 border-dashed border-blue-200">
            <div className="text-center">
              <Navigation className="w-8 h-8 mx-auto mb-2 text-blue-500" />
              <div className="text-sm font-medium text-blue-700">
                Interactive GPS Map
              </div>
              <div className="text-xs text-blue-600 mt-1">
                {gpsData.length} GPS coordinates loaded
              </div>
              <div className="text-xs text-blue-500 mt-2">
                Lat: {currentGPS.latitude?.toFixed(4)}, Lng:{" "}
                {currentGPS.longitude?.toFixed(4)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* GPS Data Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">GPS Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {gpsData.slice(0, 10).map((gps: GPSPoint, idx: number) => (
              <div
                key={idx}
                className={`flex justify-between items-center p-2 rounded text-xs ${
                  idx === currentIndex
                    ? "bg-blue-50 border border-blue-200"
                    : "bg-gray-50"
                }`}
              >
                <div className="font-mono">
                  {gps.time?.split(".")[0] || "N/A"}
                </div>
                <div className="font-mono text-gray-600">
                  {gps.latitude?.toFixed(4)}, {gps.longitude?.toFixed(4)}
                </div>
              </div>
            ))}
            {gpsData.length > 10 && (
              <div className="text-xs text-gray-500 text-center p-2">
                ... and {gpsData.length - 10} more points
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

interface Props {
  serverUrl?: string;
  className?: string;
}

const uniq = <T,>(arr: T[]) => Array.from(new Set(arr));

const CameraAnomalyExplorer: React.FC<Props> = ({
  serverUrl = "http://localhost:8081",
  className = "",
}) => {
  const [scan, setScan] = useState<ScanFile[]>([]);
  const [loadingScan, setLoadingScan] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [selSession, setSelSession] = useState<string>("");
  const [selCamera, setSelCamera] = useState<string>("");
  const [selAnomaly, setSelAnomaly] = useState<string>("");

  const [images, setImages] = useState<ImageFile[]>([]);
  const [metaRows, setMetaRows] = useState<MetaRow[]>([]);
  const [gps, setGps] = useState<GPSPoint[]>([]);
  const [imgIdx, setImgIdx] = useState(0);
  const [loadingData, setLoadingData] = useState(false);

  // For debugging
  const [lastURLs, setLastURLs] = useState<{
    scan?: string;
    images?: string;
    meta?: string;
    gps?: string;
  }>({});

  // Load scan data
  useEffect(() => {
    (async () => {
      setLoadingScan(true);
      setErr(null);
      const url = `${serverUrl}/api/metadata/scan`;
      setLastURLs((p) => ({ ...p, scan: url }));
      try {
        const r = await fetch(url);
        if (!r.ok) throw new Error(`Scan failed: ${r.status} ${r.statusText}`);
        const js = await r.json();
        if (!js.success || !Array.isArray(js.files))
          throw new Error("Unexpected scan response");
        setScan(js.files as ScanFile[]);
      } catch (e: any) {
        setErr(e?.message || "Failed to load scan");
      } finally {
        setLoadingScan(false);
      }
    })();
  }, [serverUrl]);

  // Build select options
  const sessionOptions = useMemo(
    () => uniq(scan.map((s) => s.session)).sort(),
    [scan]
  );

  const cameraOptions = useMemo(() => {
    if (!selSession) return [];
    const cams = scan
      .filter((r) => r.session === selSession)
      .map((r) => r.camera);
    return uniq(cams).sort();
  }, [scan, selSession]);

  const anomalyOptions = useMemo(() => {
    if (!selSession || !selCamera) return [];
    const anoms = scan
      .filter((r) => r.session === selSession && r.camera === selCamera)
      .map((r) => r.anomalyType);
    return uniq(anoms).sort();
  }, [scan, selSession, selCamera]);

  // Auto-select first options
  useEffect(() => {
    if (!selSession && sessionOptions.length) setSelSession(sessionOptions[0]);
  }, [sessionOptions, selSession]);

  useEffect(() => {
    if (
      selSession &&
      (!selCamera || !cameraOptions.includes(selCamera)) &&
      cameraOptions.length
    ) {
      setSelCamera(cameraOptions[0]);
    }
  }, [selSession, cameraOptions, selCamera]);

  useEffect(() => {
    if (
      selSession &&
      selCamera &&
      (!selAnomaly || !anomalyOptions.includes(selAnomaly)) &&
      anomalyOptions.length
    ) {
      setSelAnomaly(anomalyOptions[0]);
    }
  }, [selSession, selCamera, anomalyOptions, selAnomaly]);

  const selectedKey = `${selSession}/${selCamera}/${selAnomaly}`;

  // Load data for selection
  const loadSelection = async () => {
    if (!selSession || !selCamera || !selAnomaly) return;
    setLoadingData(true);
    setErr(null);
    setImgIdx(0);

    const imagesURL = `${serverUrl}/api/images/${selSession}/${selCamera}/${selAnomaly}`;
    const metaURL = `${serverUrl}/api/metadata/${selSession}/${selCamera}/${selAnomaly}`;
    const gpsURL = `${serverUrl}/api/gps-from-metadata?session=${encodeURIComponent(
      selSession
    )}&camera=${encodeURIComponent(selCamera)}&anomalyType=${encodeURIComponent(
      selAnomaly
    )}`;
    setLastURLs((p) => ({
      ...p,
      images: imagesURL,
      meta: metaURL,
      gps: gpsURL,
    }));

    console.log("Loading selection:", { selSession, selCamera, selAnomaly });
    console.log("URLs:", { imagesURL, metaURL, gpsURL });

    try {
      // Load images
      const imgRes = await fetch(imagesURL);
      console.log("Image response:", imgRes.status, imgRes.statusText);
      const imgJson = await imgRes.json().catch(() => ({}));
      console.log("Image JSON:", imgJson);

      const imgList: ImageFile[] =
        imgRes.ok && imgJson?.success && Array.isArray(imgJson.images)
          ? imgJson.images.map((i: any) => ({
              name: i.name,
              size: i.size,
              modified: i.modified,
              url: i.url?.startsWith("http")
                ? i.url
                : `${serverUrl}${i.url || ""}`,
            }))
          : [];

      // Load metadata
      const metaRes = await fetch(metaURL);
      const metaJson = await metaRes.json().catch(() => ({}));
      const rows: MetaRow[] =
        metaRes.ok && metaJson?.success && Array.isArray(metaJson.data)
          ? metaJson.data
          : [];

      // Load GPS
      const gpsRes = await fetch(gpsURL);
      const gpsJson = await gpsRes.json().catch(() => ({}));
      const gpsList: GPSPoint[] =
        gpsRes.ok && gpsJson?.success && Array.isArray(gpsJson.data)
          ? gpsJson.data
          : [];

      console.log("Loaded data:", {
        images: imgList.length,
        meta: rows.length,
        gps: gpsList.length,
      });

      setImages(imgList);
      setMetaRows(rows);
      setGps(gpsList);

      // Set error messages
      if (!imgRes.ok)
        setErr(`Images error: ${imgRes.status} ${imgRes.statusText}`);
      else if (imgList.length === 0)
        setErr("No images found for this selection");
    } catch (e: any) {
      console.error("Load error:", e);
      setErr(e?.message || "Failed to load selection data");
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadSelection();
  }, [selectedKey]);

  // Navigation helpers
  const currentImage = images[imgIdx] || null;
  const canNavigate = images.length > 1;

  const navigate = (direction: "prev" | "next") => {
    if (!canNavigate) return;
    if (direction === "prev") {
      setImgIdx((i) => (i - 1 + images.length) % images.length);
    } else {
      setImgIdx((i) => (i + 1) % images.length);
    }
  };

  const safeModified = (m: string | Date) => {
    const d = typeof m === "string" ? new Date(m as string) : (m as Date);
    return isNaN(d.getTime()) ? String(m || "") : d.toLocaleString();
  };

  if (loadingScan) {
    return (
      <div className={`flex justify-center items-center p-8 ${className}`}>
        <div className="text-center">
          <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-blue-500" />
          <div className="text-lg font-medium">Loading Camera Data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-200 mb-2">
          Camera Anomaly Explorer
        </h1>
        <p className="text-gray-400">
          Explore images and GPS data by session, camera, and anomaly type
        </p>
      </div>

      {/* Selection Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Data Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Session
              </label>
              <Select value={selSession} onValueChange={setSelSession}>
                <SelectTrigger>
                  <SelectValue placeholder="Select session" />
                </SelectTrigger>
                <SelectContent>
                  {sessionOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Camera
              </label>
              <Select
                value={selCamera}
                onValueChange={setSelCamera}
                disabled={!selSession}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select camera" />
                </SelectTrigger>
                <SelectContent>
                  {cameraOptions.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Anomaly Type
              </label>
              <Select
                value={selAnomaly}
                onValueChange={setSelAnomaly}
                disabled={!selCamera}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select anomaly" />
                </SelectTrigger>
                <SelectContent>
                  {anomalyOptions.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Selection Status */}
          <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <Badge variant="outline">{selectedKey}</Badge>
            {images.length > 0 && (
              <Badge variant="secondary">{images.length} images</Badge>
            )}
            {gps.length > 0 && (
              <Badge variant="secondary">{gps.length} GPS points</Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={loadSelection}
              className="ml-auto"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reload
            </Button>
          </div>

          {/* {err && (
            <div className="flex items-center gap-2 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-700">{err}</span>
            </div>
          )} */}
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="flex w-full">
        {/* Image Viewer - Takes 2 columns */}
        <div className="xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Image className="w-5 h-5" />
                  Image Viewer
                </div>
                {currentImage && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {imgIdx + 1} of {images.length}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-slate-300"
                        onClick={() => navigate("prev")}
                        disabled={!canNavigate}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-slate-300"
                        onClick={() => navigate("next")}
                        disabled={!canNavigate}
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <div className="flex justify-center items-center h-64">
                  <div className="text-center">
                    <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-blue-500" />
                    <div className="text-gray-500">Loading images...</div>
                  </div>
                </div>
              ) : !currentImage ? (
                <div className="flex justify-center items-center h-64">
                  <div className="text-center text-gray-500">
                    <Image className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No images available</p>
                    <p className="text-xs mt-1">
                      Select a valid session/camera/anomaly combination
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Image Display */}
                  <div className="relative bg-gray-50 rounded-lg overflow-hidden">
                    <img
                      key={currentImage.url}
                      src={currentImage.url}
                      alt={currentImage.name}
                      className="w-full h-auto object-contain"
                      onError={(e) => {
                        console.error(
                          "Image failed to load:",
                          currentImage.url
                        );
                      }}
                    />

                    {/* Overlay Navigation */}
                    {canNavigate && (
                      <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between pointer-events-none">
                        <Button
                          size="lg"
                          variant="secondary"
                          className="ml-4 pointer-events-auto opacity-75 bg-slate-300 hover:opacity-100"
                          onClick={() => navigate("prev")}
                        >
                          <ChevronLeft className="w-6 h-6" />
                        </Button>
                        <Button
                          size="lg"
                          variant="secondary"
                          className="mr-4 pointer-events-auto opacity-75 bg-slate-300 hover:opacity-100"
                          onClick={() => navigate("next")}
                        >
                          <ChevronRight className="w-6 h-6" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Image Info */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="font-medium text-gray-900">
                          {currentImage.name}
                        </div>
                        <div className="text-gray-600">
                          Size: {currentImage.size} bytes
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600">
                          Modified: {safeModified(currentImage.modified)}
                        </div>
                        <div className="text-gray-600">
                          Index: {imgIdx + 1} / {images.length}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CameraAnomalyExplorer;
