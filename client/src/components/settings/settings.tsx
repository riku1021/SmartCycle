import { useNavigate } from "@tanstack/react-router";
import type { FC } from "react";
import { useEffect, useRef, useState } from "react";
import {
  FaArrowRightFromBracket,
  FaBell,
  FaCheck,
  FaChevronLeft,
  FaChevronRight,
  FaDatabase,
  FaIdCard,
  FaMoon,
  FaRegUser,
} from "react-icons/fa6";
import { clearAccessToken } from "@/lib/apiClient";

const DISPLAY_NAME_KEY = "smartcycle_display_name";
const NOTIF_KEY = "smartcycle_notifications";
const DARK_KEY = "smartcycle_darkmode";

const SettingsComponent: FC = () => {
  const navigate = useNavigate();
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  const [displayName, setDisplayName] = useState(
    () => localStorage.getItem(DISPLAY_NAME_KEY) ?? "ユーザー"
  );
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem(DARK_KEY) === "true");
  const [notifications, setNotifications] = useState(
    () => localStorage.getItem(NOTIF_KEY) !== "false"
  );
  const [saved, setSaved] = useState(false);

  // ダークモード変更を即時反映
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark-theme");
    } else {
      document.body.classList.remove("dark-theme");
    }
    localStorage.setItem(DARK_KEY, String(darkMode));
  }, [darkMode]);

  const handleSave = () => {
    const name = nameInputRef.current?.value ?? displayName;
    localStorage.setItem(DISPLAY_NAME_KEY, name);
    localStorage.setItem(NOTIF_KEY, String(notifications));
    setDisplayName(name);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogout = () => {
    // clearAccessToken() で既にトークン削除済みのため ?logout=1 不要
    clearAccessToken();
    document.body.classList.remove("dark-theme");
    void navigate({ to: "/login" });
  };

  const handleReset = () => {
    if (!window.confirm("すべての設定をリセットしますか？ログアウトされます。")) return;
    localStorage.clear();
    document.body.classList.remove("dark-theme");
    void navigate({ to: "/login" });
  };

  return (
    <div className="fullscreen-overlay active">
      <div className="overlay-header">
        <button type="button" className="back-btn" onClick={() => void navigate({ to: "/map" })}>
          <FaChevronLeft />
        </button>
        <h1>マイページ</h1>
      </div>

      <div className="overlay-content">
        {/* プロフィールカード */}
        <div className="profile-card">
          <div className="avatar-circle">
            <FaRegUser />
          </div>
          <div className="profile-info">
            <h2 id="settings-display-name">{displayName}</h2>
            <span className="badge premium-badge">プレミアムユーザー</span>
          </div>
        </div>

        {/* 設定グループ */}
        <div className="settings-group">
          {/* 表示名 */}
          <div className="settings-row">
            <div className="settings-row-info">
              <FaIdCard />
              <div className="settings-label">表示名</div>
            </div>
            <input
              type="text"
              ref={nameInputRef}
              id="profile-name-input"
              defaultValue={displayName}
              className="inline-input"
            />
          </div>

          {/* ダークモード */}
          <div className="settings-row">
            <div className="settings-row-info">
              <FaMoon />
              <div className="settings-label">ダークモード</div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                id="setting-dark-mode"
                checked={darkMode}
                onChange={(e) => setDarkMode(e.target.checked)}
              />
              <span className="slider" />
            </label>
          </div>

          {/* プッシュ通知 */}
          <div className="settings-row">
            <div className="settings-row-info">
              <FaBell />
              <div className="settings-label">プッシュ通知</div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                id="setting-notifications"
                checked={notifications}
                onChange={(e) => setNotifications(e.target.checked)}
              />
              <span className="slider" />
            </label>
          </div>
        </div>

        {/* 保存ボタン */}
        <button
          type="button"
          className="primary-btn"
          style={{ marginBottom: "12px" }}
          onClick={handleSave}
        >
          <FaCheck style={{ display: "inline-block", marginRight: "4px" }} />
          {saved ? "保存しました！" : "変更を保存"}
        </button>

        {/* 危険ゾーン */}
        <div className="settings-group danger-group">
          <button
            type="button"
            className="settings-row danger-row"
            onClick={handleLogout}
            style={{
              width: "100%",
              background: "none",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div className="settings-row-info">
              <FaArrowRightFromBracket style={{ color: "#EF4444" }} />
              <div className="settings-label" style={{ color: "#EF4444" }}>
                ログアウト
              </div>
            </div>
            <FaChevronRight style={{ color: "#EF4444" }} />
          </button>
          <button
            type="button"
            className="settings-row danger-row"
            onClick={handleReset}
            style={{
              width: "100%",
              background: "none",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div className="settings-row-info">
              <FaDatabase style={{ color: "#EF4444" }} />
              <div className="settings-label" style={{ color: "#EF4444" }}>
                システム初期化
              </div>
            </div>
            <FaChevronRight style={{ color: "#EF4444" }} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsComponent;
