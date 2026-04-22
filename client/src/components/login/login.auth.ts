import axios from "axios";
import { login, signup } from "@/api/auth";
import { setAccessToken } from "@/lib/apiClient";

export type AuthSubmitMode = "login" | "signup";

/**
 * ログインまたは新規登録を実行し、成功時にアクセストークンを保存する。
 * 失敗時は再スロー（呼び出し側でメッセージ表示用に捕捉する）。
 */
export async function submitAuth(params: {
  mode: AuthSubmitMode;
  email: string;
  password: string;
  name?: string;
}): Promise<void> {
  if (params.mode === "login") {
    const data = await login({ email: params.email, password: params.password });
    setAccessToken(data.access_token);
    return;
  }
  const data = await signup({
    email: params.email,
    password: params.password,
    name: params.name,
  });
  setAccessToken(data.access_token);
}

const DEFAULT_ERROR_MESSAGE = "ログインに失敗しました。入力内容を確認してください。";

/**
 * 認証 API の失応答から、ユーザー向けの文言に変換する。
 */
export function getAuthErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data) {
    const d = err.response.data as { detail?: unknown };
    if (typeof d.detail === "string") {
      return d.detail;
    }
  }
  return DEFAULT_ERROR_MESSAGE;
}
