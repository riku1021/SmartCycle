import { useNavigate } from "@tanstack/react-router";
import { AdvancedMarker, APIProvider, Map as GoogleMap } from "@vis.gl/react-google-maps";
import type { FC, FormEvent, KeyboardEvent } from "react";
import { useState } from "react";
import {
  FaArrowRightToBracket,
  FaBicycle,
  FaEnvelope,
  FaLock,
  FaMagnifyingGlass,
  FaUser,
} from "react-icons/fa6";
import { showErrorAlert } from "@/shared/alerts/alerts";
import {
  getAuthErrorMessage,
  isAlreadyRegisteredEmailError,
  isEmailNotRegisteredError,
  submitAuth,
} from "./login.auth";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_MAP_ID } from "@/config/env";

const MAP_CENTER = { lat: 34.702485, lng: 135.495951 };

const GUEST_LOTS = [
  { id: "kitahama", lat: 34.69392, lng: 135.5016, color: "#10b981", label: "空き" },
  { id: "umeda", lat: 34.70631, lng: 135.49887, color: "#f59e0b", label: "残少" },
  { id: "honmachi", lat: 34.68462, lng: 135.50213, color: "#ef4444", label: "満車" },
];

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
  // デフォルトでログインモーダルを表示
  const [showModal, setShowModal] = useState(true);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validationError = validateInputs(mode, email, password);
    if (validationError) {
      await showErrorAlert("入力エラー", validationError);
      return;
    }
    setIsSubmitting(true);
    try {
      const role = await submitAuth({ mode, email, password, name: name || undefined });
      if (role === "admin") {
        await navigate({ to: "/dashboard" });
      } else {
        await navigate({ to: "/map" });
      }
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
    <div style={{ position: "fixed", inset: 0, width: "100%", height: "100%", zIndex: 0 }}>
      {/* ===== ゲスト用マップ（フルスクリーン背景） ===== */}
      <div
        id="auth-map"
        style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 0 }}
      >
        <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
          <GoogleMap
            style={{ width: "100%", height: "100%" }}
            defaultCenter={MAP_CENTER}
            defaultZoom={15}
            gestureHandling="greedy"
            disableDefaultUI
            mapId={GOOGLE_MAPS_MAP_ID}
          >
            {GUEST_LOTS.map((lot) => (
              <AdvancedMarker key={lot.id} position={{ lat: lot.lat, lng: lot.lng }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    border: "3px solid #fff",
                    boxShadow: "0 4px 10px rgba(0,0,0,0.25)",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: "0.7rem",
                    background: lot.color,
                    cursor: "pointer",
                  }}
                >
                  {lot.label}
                </div>
              </AdvancedMarker>
            ))}
          </GoogleMap>
        </APIProvider>
      </div>

      {/* ===== トップバー ===== */}
      <div className="auth-top-bar" style={{ zIndex: 100 }}>
        <div className="app-logo-small">
          <FaBicycle style={{ fontSize: "1.4rem" }} />
          <span>SmartCycle</span>
        </div>
        <button
          type="button"
          className="login-top-btn"
          onClick={() => setShowModal(true)}
          style={{ zIndex: 101 }}
        >
          <FaUser style={{ display: "inline-block", marginRight: "4px" }} />
          ログイン
        </button>
      </div>

      {/* ===== ゲストボトムパネル ===== */}
      {!showModal && (
        <div className="bottom-panel guest-panel" style={{ zIndex: 100 }}>
          <div className="nearby-section">
            <div className="nearby-header">
              <div className="live-badge">
                <span className="live-dot" />
                リアルタイム更新
              </div>
              <span className="nearby-title">現在地周辺の駐輪場</span>
            </div>
            <div className="nearby-scroll">
              <button
                type="button"
                className="nearby-item"
                onClick={() => setShowModal(true)}
                style={{
                  cursor: "pointer",
                  width: "100%",
                  textAlign: "left",
                  background: "none",
                  border: "none",
                  padding: 0,
                }}
              >
                <div>
                  <div className="nearby-item-name">北浜サイクルポート</div>
                  <div className="nearby-item-dist">徒歩 5分 · 120円/時間</div>
                </div>
                <span className="nearby-item-status" style={{ color: "#10b981" }}>
                  空きあり
                </span>
              </button>
              <button
                type="button"
                className="nearby-item"
                onClick={() => setShowModal(true)}
                style={{
                  cursor: "pointer",
                  width: "100%",
                  textAlign: "left",
                  background: "none",
                  border: "none",
                  padding: 0,
                }}
              >
                <div>
                  <div className="nearby-item-name">梅田ステーション東</div>
                  <div className="nearby-item-dist">徒歩 8分 · 100円/時間</div>
                </div>
                <span className="nearby-item-status" style={{ color: "#f59e0b" }}>
                  残りわずか
                </span>
              </button>
              <button
                type="button"
                className="nearby-item"
                onClick={() => setShowModal(true)}
                style={{
                  cursor: "pointer",
                  width: "100%",
                  textAlign: "left",
                  background: "none",
                  border: "none",
                  padding: 0,
                }}
              >
                <div>
                  <div className="nearby-item-name">本町サイクルデッキ</div>
                  <div className="nearby-item-dist">徒歩 3分 · 80円/時間</div>
                </div>
                <span className="nearby-item-status" style={{ color: "#ef4444" }}>
                  満車
                </span>
              </button>
            </div>
          </div>

          {/* 目的地検索バー */}
          <button
            type="button"
            className="destination-bar"
            onClick={() => setShowModal(true)}
            style={{
              cursor: "pointer",
              width: "100%",
              textAlign: "left",
              background: "none",
              border: "none",
            }}
          >
            <FaMagnifyingGlass style={{ color: "#94a3b8" }} />
            <input
              type="text"
              placeholder="ログインして目的地・駐輪場を検索..."
              readOnly
              style={{ cursor: "pointer", pointerEvents: "none" }}
            />
          </button>
        </div>
      )}

      {/* ===== ログインモーダル ===== */}
      {showModal && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          style={{ zIndex: 2000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
          onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
            if (e.key === "Escape") setShowModal(false);
          }}
        >
          <div className="login-modal-sheet">
            <div className="modal-handle" />
            <div className="login-modal-header">
              <div className="login-logo">
                <FaBicycle />
              </div>
              <h2>SmartCycle</h2>
              <p>未来の駐輪体験を、今ここに。</p>
            </div>

            <div className="auth-tabs">
              <button
                type="button"
                className={`auth-tab ${mode === "login" ? "active" : ""}`}
                onClick={() => setMode("login")}
                style={{ background: "none", border: "none", cursor: "pointer" }}
              >
                ログイン
              </button>
              <button
                type="button"
                className={`auth-tab ${mode === "signup" ? "active" : ""}`}
                onClick={() => setMode("signup")}
                style={{ background: "none", border: "none", cursor: "pointer" }}
              >
                新規登録
              </button>
            </div>

            <form onSubmit={handleSubmit} className="login-modal-form" noValidate>
              {mode === "signup" && (
                <div className="form-group">
                  <label htmlFor="auth-name">
                    <FaUser style={{ display: "inline-block", marginRight: "6px" }} />
                    表示名（任意）
                  </label>
                  <input
                    type="text"
                    id="auth-name"
                    className="modern-input"
                    autoComplete="name"
                    placeholder="やまだ たろう"
                    value={name}
                    onChange={(ev) => setName(ev.target.value)}
                  />
                </div>
              )}

              <div className="form-group">
                <label htmlFor="auth-email">
                  <FaEnvelope style={{ display: "inline-block", marginRight: "6px" }} />
                  メールアドレス
                </label>
                <input
                  type="email"
                  id="auth-email"
                  className="modern-input"
                  autoComplete="email"
                  placeholder="user@example.com"
                  required
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="auth-password">
                  <FaLock style={{ display: "inline-block", marginRight: "6px" }} />
                  パスワード
                </label>
                <input
                  type="password"
                  id="auth-password"
                  className="modern-input"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  placeholder="••••••••"
                  required
                  minLength={mode === "signup" ? 6 : undefined}
                  value={password}
                  onChange={(ev) => setPassword(ev.target.value)}
                />
              </div>

              <button type="submit" className="primary-btn" disabled={isSubmitting}>
                <FaArrowRightToBracket style={{ display: "inline-block" }} />
                {isSubmitting
                  ? "処理中…"
                  : mode === "login"
                    ? "ログインしてはじめる"
                    : "新規登録してはじめる"}
              </button>

              <button type="button" className="guest-skip-btn" onClick={() => setShowModal(false)}>
                ゲストとして続ける
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginComponent;
