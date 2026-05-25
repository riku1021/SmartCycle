import { apiClient } from "@/lib/apiClient";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
  user: AuthUser;
};

export async function signup(params: {
  email: string;
  password: string;
  name?: string;
}): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>("/auth/signup", params);
  return data;
}

export async function login(params: { email: string; password: string }): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>("/auth/login", params);
  return data;
}

export async function fetchMe(): Promise<AuthUser> {
  const { data } = await apiClient.get<AuthUser>("/auth/me");
  return data;
}

export async function updateMe(params: { name?: string }): Promise<AuthUser> {
  const { data } = await apiClient.patch<AuthUser>("/auth/me", params);
  return data;
}

export type UserDetail = {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
  is_fixed: boolean;
};

export async function fetchUsers(): Promise<UserDetail[]> {
  const { data } = await apiClient.get<UserDetail[]>("/auth/users");
  return data;
}

export async function updateUserRole(userId: string, role: string): Promise<UserDetail> {
  const { data } = await apiClient.patch<UserDetail>(`/auth/users/${userId}/role`, { role });
  return data;
}
