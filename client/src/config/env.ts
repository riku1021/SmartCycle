/** Vite の `VITE_*` とローカル開発用デフォルト（外部パッケージ不要） */
const DEFAULT_API_BASE_URL = "http://localhost:8000";
const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
export const API_BASE_URL =
  typeof rawApiBaseUrl === "string" && rawApiBaseUrl.length > 0 ? rawApiBaseUrl : DEFAULT_API_BASE_URL;

const rawGoogleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
export const GOOGLE_MAPS_API_KEY =
  typeof rawGoogleMapsApiKey === "string" && rawGoogleMapsApiKey.length > 0 ? rawGoogleMapsApiKey : "";

export const env = {
  VITE_API_BASE_URL: API_BASE_URL,
  VITE_GOOGLE_MAPS_API_KEY: GOOGLE_MAPS_API_KEY,
} as const;