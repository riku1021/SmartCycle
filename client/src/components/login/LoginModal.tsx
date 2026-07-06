import { useNavigate } from "@tanstack/react-router";
import type { FC, FormEvent, KeyboardEvent } from "react";
import { useState } from "react";
import { FaArrowRightToBracket, FaBicycle, FaEnvelope, FaLock, FaUser } from "react-icons/fa6";
import type { UserRole } from "@/lib/adminRole";
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

type LoginModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (role: UserRole) => void;
};

const LoginModal: FC<LoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
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
      const role = await submitAuth({ mode, email, password, name: name || undefined });
      if (role === "admin") {
        await navigate({ to: "/dashboard" });
      } else {
        onSuccess?.(role);
        onClose();
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

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      style={{ zIndex: 2000 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Escape") onClose();
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

          <button type="button" className="guest-skip-btn" onClick={onClose}>
            ゲストとして続ける
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;
