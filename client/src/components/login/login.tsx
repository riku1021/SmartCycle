import { Link, useNavigate } from "@tanstack/react-router";
import type { FC, FormEvent } from "react";
import { useState } from "react";
import { FaBicycle, FaEnvelope, FaLock, FaUser } from "react-icons/fa6";
import { getAuthErrorMessage, submitAuth } from "./login.auth";
import "./login.css";

const LoginComponent: FC = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
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
      setError(getAuthErrorMessage(err));
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
                setError(null);
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
                setError(null);
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
              </div>

              {error && (
                <p className="auth-form-error" role="alert">
                  {error}
                </p>
              )}

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
