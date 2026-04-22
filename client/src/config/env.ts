/** Vite の `VITE_*` とローカル開発用デフォルト（外部パッケージ不要） */
const DEFAULT_API_BASE_URL = "http://localhost:8000";

const raw = import.meta.env.VITE_API_BASE_URL;
export const API_BASE_URL = typeof raw === "string" && raw.length > 0 ? raw : DEFAULT_API_BASE_URL;

export const env = { VITE_API_BASE_URL: API_BASE_URL } as const;
