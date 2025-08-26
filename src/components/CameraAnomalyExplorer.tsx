"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, MapPin, Info, ChevronLeft, ChevronRight, RefreshCw, Bug } from "lucide-react";
import GPSViewer from "./GPSViewer";

type ScanFile = {
  session: string;
  camera: string;
  anomalyType: string;
  path: string;
  imageCount: number;
  hasImages: boolean;
  sampleImages: string[];
  imagesPath: string; // session/camera/anomaly/images/
};

type ImageFile = {
  name: string;
  size: number;
  modified: string | Date;
  url: string; // /data/session/camera/anomaly/images/name (prefixed with serverUrl)
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

interface Props {
  serverUrl?: string; // default http://localhost:8081
  className?: string;
}

const uniq = <T,>(arr: T[]) => Array.from(new Set(arr));

const CameraAnomalyExplorer: React.FC<Props> = ({ serverUrl = "http://localhost:8081", className = "" }) => {
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

  // for debug panel
  const [lastURLs, setLastURLs] = useState<{ scan?: string; images?: string; meta?: string; gps?: string }>({});

  // ---------------- 1) Load the scan (session/camera/anomaly universe) ----------------
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
        if (!js.success || !Array.isArray(js.files)) throw new Error("Unexpected scan response");
        setScan(js.files as ScanFile[]);
      } catch (e: any) {
        setErr(e?.message || "Failed to load scan");
      } finally {
        setLoadingScan(false);
      }
    })();
  }, [serverUrl]);

  // ---------------- 2) Build selects from scan (with de-dup + unique keys) ----------------
  const sessionOptions = useMemo(
    () => uniq(scan.map((s) => s.session)).sort(),
    [scan]
  );

  const cameraOptions = useMemo(() => {
    if (!selSession) return [];
    const cams = scan.filter((r) => r.session === selSession).map((r) => r.camera);
    return uniq(cams).sort();
  }, [scan, selSession]);

  const anomalyOptions = useMemo(() => {
    if (!selSession || !selCamera) return [];
    const anoms = scan
      .filter((r) => r.session === selSession && r.camera === selCamera)
      .map((r) => r.anomalyType);
    return uniq(anoms).sort();
  }, [scan, selSession, selCamera]);

  // Auto-pick first available valid options
  useEffect(() => {
    if (!selSession && sessionOptions.length) setSelSession(sessionOptions[0]);
  }, [sessionOptions, selSession]);

  useEffect(() => {
    if (selSession && (!selCamera || !cameraOptions.includes(selCamera)) && cameraOptions.length) {
      setSelCamera(cameraOptions[0]);
    }
  }, [selSession, cameraOptions, selCamera]);

  useEffect(() => {
    if (selSession && selCamera && (!selAnomaly || !anomalyOptions.includes(selAnomaly)) && anomalyOptions.length) {
      setSelAnomaly(anomalyOptions[0]);
    }
  }, [selSession, selCamera, anomalyOptions, selAnomaly]);

  const selectedKey = `${selSession}/${selCamera}/${selAnomaly}`;

  // ---------------- 3) Fetch images + metadata + GPS for the selection ----------------
  const loadSelection = async () => {
    if (!selSession || !selCamera || !selAnomaly) return;
    setLoadingData(true);
    setErr(null);
    setImgIdx(0);

    const imagesURL = `${serverUrl}/api/images/${selSession}/${selCamera}/${selAnomaly}`;
    const metaURL = `${serverUrl}/api/metadata/${selSession}/${selCamera}/${selAnomaly}`;
    const gpsURL = `${serverUrl}/api/gps-from-metadata?session=${encodeURIComponent(selSession)}&camera=${encodeURIComponent(selCamera)}&anomalyType=${encodeURIComponent(selAnomaly)}`;
    setLastURLs((p) => ({ ...p, images: imagesURL, meta: metaURL, gps: gpsURL }));

    try {
      // images
      const imgRes = await fetch(imagesURL);
      const imgJson = await imgRes.json().catch(() => ({}));
      const imgList: ImageFile[] =
        imgRes.ok && imgJson?.success && Array.isArray(imgJson.images)
          ? imgJson.images.map((i: any) => ({
              name: i.name,
              size: i.size,
              modified: i.modified,
              url: i.url?.startsWith("http") ? i.url : `${serverUrl}${i.url || ""}`,
            }))
          : [];

      // metadata rows
      const metaRes = await fetch(metaURL);
      const metaJson = await metaRes.json().catch(() => ({}));
      const rows: MetaRow[] = metaRes.ok && metaJson?.success && Array.isArray(metaJson.data) ? metaJson.data : [];

      // gps from metadata
      const gpsRes = await fetch(gpsURL);
      const gpsJson = await gpsRes.json().catch(() => ({}));
      const gpsList: GPSPoint[] = gpsRes.ok && gpsJson?.success && Array.isArray(gpsJson.data) ? gpsJson.data : [];

      setImages(imgList);
      setMetaRows(rows);
      setGps(gpsList);

      // Surface helpful messages if something is empty
      if (!imgRes.ok) setErr((prev) => prev ?? `Images error: ${imgRes.status} ${imgRes.statusText}`);
      if (!metaRes.ok) setErr((prev) => prev ?? `Metadata error: ${metaRes.status} ${metaRes.statusText}`);
      if (!gpsRes.ok) setErr((prev) => prev ?? `GPS error: ${gpsRes.status} ${gpsRes.statusText}`);

      if (imgList.length === 0 && rows.length === 0 && gpsList.length === 0) {
        setErr("No images, metadata, or GPS points returned for this selection. Check server/data paths.");
      }
    } catch (e: any) {
      setErr(e?.message || "Failed to load selection data");
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadSelection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey]);

  // ---------------- 4) Helpers ----------------
  const currentImage = images[imgIdx] || null;
  const move = (dir: -1 | 1) => {
    if (!images.length) return;
    setImgIdx((i) => (i + dir + images.length) % images.length);
  };

  const gpsAsImageData = useMemo(() => {
    const toImageData = (p: GPSPoint) => ({
      timestamp: p.timestamp,
      date: p.date,
      time: p.time,
      latitude: p.latitude,
      longitude: p.longitude,
      detections: [],
      images: {},
      fullPaths: {},
    });
    const adapted = gps.map(toImageData);
    const current = adapted[Math.min(imgIdx, Math.max(adapted.length - 1, 0))] || adapted[0] || {
      timestamp: "",
      date: "",
      time: "",
      latitude: 0,
      longitude: 0,
      detections: [],
      images: {},
      fullPaths: {},
    };
    return { current, all: adapted };
  }, [gps, imgIdx]);

  const safeModified = (m: string | Date) => {
    const d = typeof m === "string" || m instanceof String ? new Date(m as string) : (m as Date);
    return isNaN(d.getTime()) ? String(m || "") : d.toLocaleString();
  };

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-4 ${className}`}>
      {/* Left: selectors + image + details */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Select Camera & Anomaly</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Session */}
            <div>
              <div className="text-xs text-gray-500 mb-1">Session</div>
              <Select value={selSession} onValueChange={setSelSession}>
                <SelectTrigger><SelectValue placeholder="Session" /></SelectTrigger>
                <SelectContent>
                  {sessionOptions.map((s) => (
                    <SelectItem key={`session:${s}`} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Camera */}
            <div>
              <div className="text-xs text-gray-500 mb-1">Camera</div>
              <Select value={selCamera} onValueChange={setSelCamera} disabled={!selSession}>
                <SelectTrigger><SelectValue placeholder="Camera" /></SelectTrigger>
                <SelectContent>
                  {cameraOptions.map((c) => (
                    <SelectItem key={`camera:${selSession}:${c}`} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Anomaly */}
            <div>
              <div className="text-xs text-gray-500 mb-1">Anomaly</div>
              <Select value={selAnomaly} onValueChange={setSelAnomaly} disabled={!selCamera}>
                <SelectTrigger><SelectValue placeholder="Anomaly" /></SelectTrigger>
                <SelectContent>
                  {anomalyOptions.map((a) => (
                    <SelectItem key={`anomaly:${selSession}:${selCamera}:${a}`} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-full flex items-center gap-2">
              <Badge variant="outline">{selectedKey}</Badge>
              <Button variant="outline" size="sm" onClick={loadSelection}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Reload
              </Button>
              {!!err && <span className="text-sm text-red-600">{err}</span>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Images {images.length ? <Badge variant="secondary">{images.length}</Badge> : null}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <div className="text-sm text-gray-500">Loading images & details…</div>
            ) : !currentImage ? (
              <div className="text-sm text-gray-500">No images available for this selection.</div>
            ) : (
              <div className="space-y-3">
                <div className="relative w-full overflow-hidden rounded-xl border">
                  <img
                    key={currentImage.url}
                    src={currentImage.url}
                    alt={currentImage.name}
                    className="w-full h-auto object-contain"
                  />
                  <div className="absolute bottom-2 left-2 flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => move(-1)}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => move(1)}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Image details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-gray-500" />
                    <div className="font-medium">{currentImage.name}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <div>Index: {imgIdx + 1} / {images.length}</div>
                  </div>
                  <div className="text-gray-600">Size: {currentImage.size} bytes</div>
                  <div className="text-gray-600">Modified: {safeModified(currentImage.modified)}</div>
                </div>

                {/* Metadata preview table (first 8 rows) */}
                {metaRows.length > 0 && (
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-xs border">
                      <thead className="bg-gray-50">
                        <tr>
                          {Object.keys(metaRows[0]).slice(0, 6).map((k) => (
                            <th key={`hdr:${k}`} className="text-left p-2 border-b">{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {metaRows.slice(0, 8).map((row, i) => (
                          <tr key={`row:${i}`} className="odd:bg-white even:bg-gray-50">
                            {Object.keys(metaRows[0]).slice(0, 6).map((k) => (
                              <td key={`cell:${i}:${k}`} className="p-2 border-b">{row[k]}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="text-[10px] text-gray-500 mt-1">
                      Showing {Math.min(metaRows.length, 8)} of {metaRows.length} rows from metadata.csv
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Debug panel (optional but handy while wiring paths) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Bug className="w-4 h-4" />
              Debug
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1">
            <div><b>serverUrl</b>: {serverUrl}</div>
            <div><b>scan</b>: {lastURLs.scan}</div>
            <div><b>images</b>: {lastURLs.images}</div>
            <div><b>metadata</b>: {lastURLs.meta}</div>
            <div><b>gps</b>: {lastURLs.gps}</div>
          </CardContent>
        </Card>
      </div>

      {/* Right: GPS map/route for this camera+anomaly */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              GPS (from metadata.csv)
              {gps.length ? <Badge variant="outline" className="ml-2">{gps.length} pts</Badge> : null}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {gps.length === 0 ? (
              <div className="text-sm text-gray-500">
                No GPS coordinates found for {selectedKey}.
              </div>
            ) : (
              <GPSViewer
                currentData={gpsAsImageData.current}
                allData={gpsAsImageData.all}
                gpsData={gps}
                className="w-full"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CameraAnomalyExplorer;
