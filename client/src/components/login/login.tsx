import { useNavigate } from "@tanstack/react-router";
import type { Map as LeafletMap } from "leaflet";
import type { FC, FormEvent, KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
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
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<LeafletMap | null>(null);

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // デフォルトでログインモーダルを表示
  const [showModal, setShowModal] = useState(true);

  // ゲスト用マップ初期化
  useEffect(() => {
    const mapEl = mapRef.current;
    if (!mapEl) return;

    // cancelled フラグ: クリーンアップ後の非同期コールバックを無効化
    let cancelled = false;

    import("leaflet").then((L) => {
      // クリーンアップ済み または 既に初期化済みなら何もしない
      if (cancelled) return;
      if ((mapEl as HTMLElement & { _leaflet_id?: string })._leaflet_id) return;

      const authMap = L.map(mapEl, { zoomControl: false }).setView([34.702485, 135.495951], 15);
      leafletMapRef.current = authMap;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      }).addTo(authMap);

      // 駐輪場マーカー
      const makePinIcon = (color: string, label: string) =>
        L.divIcon({
          className: "",
          html: `<div style="
            width:44px;height:44px;border-radius:50%;
            border:3px solid #fff;
            box-shadow:0 4px 10px rgba(0,0,0,0.25);
            display:flex;flex-direction:column;justify-content:center;align-items:center;
            color:#fff;font-weight:800;font-size:0.7rem;background:${color};
            cursor:pointer;
          ">${label}</div>`,
          iconSize: [44, 44],
          iconAnchor: [22, 44],
        });

      L.marker([34.69392, 135.5016], { icon: makePinIcon("#10b981", "空き") })
        .addTo(authMap)
        .bindPopup("北浜サイクルポート<br>空き: 12台");
      L.marker([34.70631, 135.49887], { icon: makePinIcon("#f59e0b", "残少") })
        .addTo(authMap)
        .bindPopup("梅田ステーション東<br>空き: 5台");
      L.marker([34.68462, 135.50213], { icon: makePinIcon("#ef4444", "満車") })
        .addTo(authMap)
        .bindPopup("本町サイクルデッキ<br>空き: 0台");
    });

    return () => {
      // 非同期コールバックをキャンセル
      cancelled = true;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

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
        ref={mapRef}
        id="auth-map"
        style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 0 }}
      />

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
