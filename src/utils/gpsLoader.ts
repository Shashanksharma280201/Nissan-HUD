// utils/gpsLoader.ts
export interface GPSData {
  timestamp: string;
  time: string;
  date: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  speed?: number;
  heading?: number;
}

/**
 * Load GPS points from a CSV in your /data tree, e.g. "F2/gps_log.csv".
 * The CSV must have headers like: timestamp,date,time,latitude,longitude,(altitude,speed,heading optional)
 */
export async function loadGPSCsv(serverUrl: string, csvRelativePath: string): Promise<GPSData[]> {
  const url = `${serverUrl.replace(/\/$/, "")}/data/${csvRelativePath.replace(/^\/+/, "")}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load CSV ${csvRelativePath}: ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  return parseCsv(text);
}

// super-light CSV parser (handles quoted fields + commas)
function parseCsv(text: string): GPSData[] {
  const rows = csvToRows(text);
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());

  const col = (name: string) => header.indexOf(name);

  const iTs   = col("timestamp");
  const iDate = col("date");
  const iTime = col("time");
  const iLat  = col("latitude") >= 0 ? col("latitude") : col("lat");
  const iLng  = col("longitude") >= 0 ? col("longitude") : (col("lng") >= 0 ? col("lng") : col("lon"));
  const iAlt  = col("altitude");
  const iSpd  = col("speed");
  const iHead = col("heading");

  const out: GPSData[] = [];
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const ts   = val(cells, iTs);
    const date = val(cells, iDate) || (ts ? ts.split(" ")[0] : "");
    const time = val(cells, iTime) || (ts ? ts.split(" ")[1] || "" : "");
    const lat  = parseFloat(val(cells, iLat) || "0");
    const lng  = parseFloat(val(cells, iLng) || "0");
    const altitude = iAlt >= 0 ? num(val(cells, iAlt)) : undefined;
    const speed    = iSpd >= 0 ? num(val(cells, iSpd)) : undefined;
    const heading  = iHead >= 0 ? num(val(cells, iHead)) : undefined;

    out.push({
      timestamp: ts || `${date || "1970-01-01"} ${time || "00:00:00"}`,
      date: date || "1970-01-01",
      time: time || "00:00:00",
      latitude: lat,
      longitude: lng,
      altitude,
      speed,
      heading,
    });
  }
  return out;
}

function val(arr: string[], i: number) { return i >= 0 && i < arr.length ? arr[i] : ""; }
function num(v?: string) { const n = parseFloat(v || ""); return isNaN(n) ? undefined : n; }

// CSV to rows: returns string[][] with quoted field support
function csvToRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    const next = csv[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') { cur += '"'; i++; continue; }
      if (ch === '"') { inQuotes = false; continue; }
      cur += ch;
    } else {
      if (ch === '"') { inQuotes = true; continue; }
      if (ch === ",") { row.push(cur); cur = ""; continue; }
      if (ch === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; continue; }
      if (ch === "\r") { continue; }
      cur += ch;
    }
  }
  // flush last
  row.push(cur);
  rows.push(row);
  return rows.filter(r => !(r.length === 1 && r[0] === "")); // drop trailing blank line
}
