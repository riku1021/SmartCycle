import axios from "axios";
import { API_BASE_URL } from "@/config/env";

export const AUTH_ACCESS_TOKEN_STORAGE_KEY = "smartcycle_access_token" as const;

const UNAUTHORIZED_REDIRECT_PATH = "/";

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
      clearAccessToken();
      if (
        typeof window !== "undefined" &&
        window.location.pathname !== UNAUTHORIZED_REDIRECT_PATH
      ) {
        window.location.assign(UNAUTHORIZED_REDIRECT_PATH);
      }
    }
    return Promise.reject(error);
  }
);
