import { Link, useNavigate } from "@tanstack/react-router";
import type { FC } from "react";
import { FaBicycle, FaGear, FaList, FaMapLocationDot } from "react-icons/fa6";
import { MdDashboard } from "react-icons/md";
import { clearAccessToken } from "@/lib/apiClient";
import { showConfirmationAlert } from "@/shared/alerts/alerts";

type AppSidebarProps = {
  isActivePath: (path: string) => boolean;
};

const AppSidebar: FC<AppSidebarProps> = ({ isActivePath }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    const result = await showConfirmationAlert(
      "ログアウト確認",
      "ログアウトしますか？",
      "ログアウト",
      "キャンセル"
    );
    if (!result.isConfirmed) {
      return;
    }
    clearAccessToken();
    await navigate({ to: "/login" });
  };

  return (
    <aside className="app-sidebar">
      <div className="sidebar-header">
        <FaBicycle size={28} />
        <h2>SmartCycle</h2>
      </div>
      <nav className="sidebar-nav">
        <Link
          className={`sidebar-link${isActivePath("/dashboard") ? " active" : ""}`}
          to="/dashboard"
        >
          <MdDashboard />
          管理画面
        </Link>
        <Link className={`sidebar-link${isActivePath("/map") ? " active" : ""}`} to="/map">
          <FaMapLocationDot />
          マップ検索
        </Link>
        <Link className={`sidebar-link${isActivePath("/lots") ? " active" : ""}`} to="/lots">
          <FaList />
          駐輪場一覧
        </Link>
        <Link
          className={`sidebar-link${isActivePath("/reservations") ? " active" : ""}`}
          to="/reservations"
        >
          <FaList />
          予約管理
        </Link>
        <Link
          className={`sidebar-link${isActivePath("/settings") ? " active" : ""}`}
          to="/settings"
        >
          <FaGear />
          設定
        </Link>
      </nav>
      <button className="sidebar-logout" onClick={handleLogout} type="button">
        ログアウト
      </button>
    </aside>
  );
};

export default AppSidebar;
