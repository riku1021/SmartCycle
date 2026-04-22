import axios from "axios";
import { login, signup } from "@/api/auth";
import { resolveRoleByCredential, setUserRole, type UserRole } from "@/lib/adminRole";
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
}): Promise<UserRole> {
  if (params.mode === "login") {
    const data = await login({ email: params.email, password: params.password });
    setAccessToken(data.access_token);
    const role = resolveRoleByCredential(params.email, params.password);
    setUserRole(role);
    return role;
  }
  const data = await signup({
    email: params.email,
    password: params.password,
    name: params.name,
  });
  setAccessToken(data.access_token);
  setUserRole("user");
  return "user";
}

const DEFAULT_ERROR_MESSAGE = "ログインに失敗しました。入力内容を確認してください。";
const EMAIL_ALREADY_REGISTERED_MESSAGE = "Email already registered";
const EMAIL_NOT_REGISTERED_MESSAGE = "Email not registered";

type FastApiValidationError = {
  loc?: Array<string | number>;
  msg?: string;
};

function isFastApiValidationList(detail: unknown): detail is FastApiValidationError[] {
  return Array.isArray(detail);
}

function parseFastApiValidationMessage(detail: FastApiValidationError[]): string | null {
  const emailError = detail.find((item) => item.loc?.includes("email"));
  if (emailError) {
    return "メールアドレスの形式が正しくありません。";
  }
  const passwordError = detail.find((item) => item.loc?.includes("password"));
  if (passwordError) {
    return "パスワードの形式が正しくありません。";
  }
  return null;
}

/**
 * 認証 API の失応答から、ユーザー向けの文言に変換する。
 */
export function getAuthErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data) {
    const d = err.response.data as { detail?: unknown };
    if (isFastApiValidationList(d.detail)) {
      return parseFastApiValidationMessage(d.detail) ?? DEFAULT_ERROR_MESSAGE;
    }
    if (typeof d.detail === "string") {
      if (d.detail === EMAIL_ALREADY_REGISTERED_MESSAGE) {
        return "このメールアドレスはすでに登録されています。ログインしてください。";
      }
      if (d.detail === "Invalid email or password") {
        return "メールアドレスまたはパスワードが正しくありません。";
      }
      if (d.detail === EMAIL_NOT_REGISTERED_MESSAGE) {
        return "このメールアドレスは未登録です。新規登録をお試しください。";
      }
      return d.detail;
    }
  }
  return DEFAULT_ERROR_MESSAGE;
}

export function isAlreadyRegisteredEmailError(err: unknown): boolean {
  if (!axios.isAxiosError(err) || !err.response?.data) {
    return false;
  }
  const d = err.response.data as { detail?: unknown };
  return d.detail === EMAIL_ALREADY_REGISTERED_MESSAGE;
}

export function isEmailNotRegisteredError(err: unknown): boolean {
  if (!axios.isAxiosError(err) || !err.response?.data) {
    return false;
  }
  const d = err.response.data as { detail?: unknown };
  return d.detail === EMAIL_NOT_REGISTERED_MESSAGE;
}
