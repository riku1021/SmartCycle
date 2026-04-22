import axios from "axios";
import { API_BASE_URL } from "@/config/env";
import { clearUserRole } from "@/lib/adminRole";

export const AUTH_ACCESS_TOKEN_STORAGE_KEY = "smartcycle_access_token" as const;

const UNAUTHORIZED_REDIRECT_PATH = "/";
const AUTH_ROUTES_WITH_EXPECTED_401 = new Set(["/auth/login", "/auth/signup"]);

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
  timeout: 30_000,
});

export function getAccessToken(): string | null {
  return localStorage.getItem(AUTH_ACCESS_TOKEN_STORAGE_KEY);
}

export function setAccessToken(token: string): void {
  localStorage.setItem(AUTH_ACCESS_TOKEN_STORAGE_KEY, token);
}

export function clearAccessToken(): void {
  localStorage.removeItem(AUTH_ACCESS_TOKEN_STORAGE_KEY);
  clearUserRole();
}

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const requestUrl = error.config?.url ?? "";
      const isExpectedAuth401 =
        typeof requestUrl === "string" && AUTH_ROUTES_WITH_EXPECTED_401.has(requestUrl);
      clearAccessToken();
      if (
        !isExpectedAuth401 &&
        typeof window !== "undefined" &&
        window.location.pathname !== UNAUTHORIZED_REDIRECT_PATH
      ) {
        window.location.assign(UNAUTHORIZED_REDIRECT_PATH);
      }
    }
    return Promise.reject(error);
  }
);
