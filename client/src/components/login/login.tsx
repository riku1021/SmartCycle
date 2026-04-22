import { Link, useNavigate } from "@tanstack/react-router";
import type { FC, FormEvent } from "react";
import { useState } from "react";
import { FaBicycle, FaEnvelope, FaLock, FaUser } from "react-icons/fa6";
import { showErrorAlert } from "@/shared/alerts/alerts";
import {
  getAuthErrorMessage,
  isAlreadyRegisteredEmailError,
  isEmailNotRegisteredError,
  submitAuth,
} from "./login.auth";
import "./login.css";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateInputs(mode: "login" | "signup", email: string, password: string): string | null {
  if (!EMAIL_REGEX.test(email)) {
    return "有効なメールアドレス形式で入力してください。";
  }
  if (password.length < 1 || password.length > 256) {
    return "パスワードは1〜256文字で入力してください。";
  }
  if (mode === "signup" && password.length < 6) {
    return "新規登録時のパスワードは6文字以上で入力してください。";
  }
  return null;
}

const LoginComponent: FC = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validationError = validateInputs(mode, email, password);
    if (validationError) {
      await showErrorAlert("入力エラー", validationError);
      return;
    }
    setIsSubmitting(true);
    try {
      await submitAuth({
        mode,
        email,
        password,
        name: name || undefined,
      });
      await navigate({ to: "/" });
    } catch (err: unknown) {
      if (mode === "login" && isEmailNotRegisteredError(err)) {
        await showErrorAlert(
          "未登録メールアドレス",
          "このメールアドレスは未登録です。新規登録画面に切り替えます。"
        );
        setMode("signup");
        return;
      }
      if (mode === "signup" && isAlreadyRegisteredEmailError(err)) {
        await showErrorAlert(
          "登録済みメールアドレス",
          "このメールアドレスはすでに登録されています。ログイン画面に切り替えます。"
        );
        setMode("login");
        return;
      }
      await showErrorAlert("認証エラー", getAuthErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page screen full-screen active">
      <div className="auth-container">
        <div className="auth-side-brand">
          <div className="brand-logo-large" aria-hidden>
            <FaBicycle />
          </div>
          <h1>SmartCycle</h1>
          <p className="brand-tagline">未来の駐輪体験を、今ここに。</p>
        </div>

        <div className="auth-side-form">
          <div className="auth-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              className={`auth-tab${mode === "login" ? " active" : ""}`}
              onClick={() => {
                setMode("login");
              }}
            >
              ログイン
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "signup"}
              className={`auth-tab${mode === "signup" ? " active" : ""}`}
              onClick={() => {
                setMode("signup");
              }}
            >
              新規登録
            </button>
          </div>

          <div className="auth-box">
            {mode === "login" ? (
              <div id="auth-login-text">
                <h1>おかえりなさい</h1>
                <p>アカウント情報を入力してログインしてください。</p>
              </div>
            ) : (
              <div id="auth-signup-text">
                <h1>はじめまして</h1>
                <p>わずか数秒で、次世代の駐輪ライフが始まります。</p>
              </div>
            )}

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              {mode === "signup" && (
                <div className="form-group">
                  <label htmlFor="auth-name">
                    <FaUser aria-hidden />
                    表示名（任意）
                  </label>
                  <input
                    id="auth-name"
                    type="text"
                    autoComplete="name"
                    placeholder="やまだ たろう"
                    value={name}
                    onChange={(ev) => setName(ev.target.value)}
                  />
                </div>
              )}

              <div className="form-group">
                <label htmlFor="auth-email">
                  <FaEnvelope aria-hidden />
                  メールアドレス
                </label>
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  placeholder="user@example.com"
                  required
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                />
                <p className="input-hint">有効なメールアドレス形式で入力してください。</p>
              </div>

              <div className="form-group">
                <label htmlFor="auth-password">
                  <FaLock aria-hidden />
                  パスワード
                </label>
                <input
                  id="auth-password"
                  type="password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  placeholder="••••••••"
                  required
                  minLength={mode === "signup" ? 6 : undefined}
                  value={password}
                  onChange={(ev) => setPassword(ev.target.value)}
                />
                <p className="input-hint">
                  {mode === "signup"
                    ? "6〜256文字で入力してください。英字・数字・記号の組み合わせを推奨します。"
                    : "1〜256文字で入力してください。"}
                </p>
              </div>

              <button type="submit" className="primary-btn auth-submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "処理中…"
                  : mode === "login"
                    ? "ログインしてはじめる"
                    : "新規登録してはじめる"}
              </button>

              {mode === "signup" && (
                <div className="auth-signup-extra" id="auth-signup-extra">
                  登録することで、
                  <a href="#terms">利用規約</a>と<a href="#privacy">プライバシーポリシー</a>
                  に同意したことになります。
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      <p className="auth-bottom">
        <Link to="/">トップへ</Link>
      </p>
    </div>
  );
};

export default LoginComponent;
