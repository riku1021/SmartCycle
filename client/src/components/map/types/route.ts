export type RouteViewMode = "idle" | "preview" | "navigating";

export type AppTravelMode = "WALKING" | "BICYCLING";

export type LatLng = { lat: number; lng: number };

export type RouteCandidate = {
  route: google.maps.DirectionsRoute;
  path: LatLng[];
  durationText: string;
  durationSec: number;
  distanceText: string;
  summary: string;
  midpoint: LatLng;
};

export type TravelModeRoutes = Partial<Record<AppTravelMode, RouteCandidate[]>>;

export const TRAVEL_MODE_CONFIG: { mode: AppTravelMode; label: string }[] = [
  { mode: "WALKING", label: "徒歩" },
  { mode: "BICYCLING", label: "自転車" },
];

export const routePathFromOverview = (route: google.maps.DirectionsRoute): LatLng[] =>
  route.overview_path.map((p) => ({ lat: p.lat(), lng: p.lng() }));

export const routeMidpoint = (path: LatLng[]): LatLng => {
  if (path.length === 0) return { lat: 0, lng: 0 };
  const mid = path[Math.floor(path.length / 2)];
  return mid;
};

export const stripHtml = (html: string): string => {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent ?? html;
};

export const formatArrivalTime = (durationSec: number): string => {
  const arrival = new Date(Date.now() + durationSec * 1000);
  const hours = arrival.getHours();
  const minutes = String(arrival.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes} に到着`;
};

export const haversineMeters = (a: LatLng, b: LatLng): number => {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

/** 2点間の方位角（0–360°、北が0） */
export const computeBearing = (from: LatLng, to: LatLng): number => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => ((rad * 180) / Math.PI + 360) % 360;
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const dLng = toRad(to.lng - from.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return toDeg(Math.atan2(y, x));
};

export const isValidGeoHeading = (heading: number | null | undefined): heading is number =>
  heading != null && !Number.isNaN(heading) && heading >= 0;

/** 次の操作までの距離（Google Maps 風の丸め） */
export const formatManeuverAheadDistance = (meters: number): string => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km 先`;
  }
  if (meters >= 200) {
    return `${Math.round(meters / 100) * 100} m 先`;
  }
  if (meters >= 50) {
    return `${Math.round(meters / 50) * 50} m 先`;
  }
  return `${Math.max(1, Math.round(meters))} m 先`;
};

const MANEUVER_LABELS: Record<string, string> = {
  "turn-slight-left": "左方向へ",
  "turn-sharp-left": "大きく左折",
  "uturn-left": "Uターン",
  "turn-left": "左折",
  "turn-slight-right": "右方向へ",
  "turn-sharp-right": "大きく右折",
  "uturn-right": "Uターン",
  "turn-right": "右折",
  straight: "直進",
  "ramp-left": "左のランプへ",
  "ramp-right": "右のランプへ",
  merge: "合流",
  "fork-left": "左の分岐へ",
  "fork-right": "右の分岐へ",
  "roundabout-left": "環状交差点を左回り",
  "roundabout-right": "環状交差点を右回り",
  "keep-left": "左側を進む",
  "keep-right": "右側を進む",
  ferry: "フェリー",
};

export const maneuverToLabel = (maneuver: string | undefined): string | null => {
  if (!maneuver) return null;
  return MANEUVER_LABELS[maneuver] ?? null;
};

/** 案内文から操作語を除いた道路名・補足を抽出 */
export const extractStepDetail = (
  instruction: string,
  maneuverLabel: string | null
): string | null => {
  const trimmed = instruction.trim();
  if (!trimmed) return null;
  if (!maneuverLabel) return trimmed;

  const withoutLabel = trimmed
    .replace(maneuverLabel, "")
    .replace(/^[、,\s]+|[、,\s]+$/g, "")
    .replace(/^(して|へ)/, "")
    .replace(/[をへにで]+$/g, "")
    .trim();

  if (!withoutLabel || withoutLabel === trimmed) return trimmed;
  return withoutLabel;
};
