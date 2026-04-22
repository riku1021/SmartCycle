import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import type { FC, ReactNode } from "react";
import { FaBicycle, FaGear, FaList, FaMapLocationDot } from "react-icons/fa6";
import { MdDashboard } from "react-icons/md";
import { clearAccessToken } from "@/lib/apiClient";
import "./app-layout.css";

type AppLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  hideHeader?: boolean;
  mainClassName?: string;
};

const AppLayout: FC<AppLayoutProps> = ({
  title,
  subtitle,
  children,
  hideHeader = false,
  mainClassName,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isActivePath = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    clearAccessToken();
    await navigate({ to: "/login" });
  };

  return (
    <div className="app-shell">
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

      <main className={`app-main${mainClassName ? ` ${mainClassName}` : ""}`}>
        <header className={`app-header${hideHeader ? " hidden" : ""}`}>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </header>
        {children}
      </main>

      <nav className="mobile-footer-nav" aria-label="メインナビゲーション">
        <Link
          className={`mobile-footer-link${isActivePath("/dashboard") ? " active" : ""}`}
          to="/dashboard"
        >
          <MdDashboard />
          <span>管理画面</span>
        </Link>
        <Link className={`mobile-footer-link${isActivePath("/lots") ? " active" : ""}`} to="/lots">
          <FaList />
          <span>駐輪場一覧</span>
        </Link>
        <Link className={`mobile-footer-link${isActivePath("/map") ? " active" : ""}`} to="/map">
          <FaMapLocationDot />
          <span>マップ検索</span>
        </Link>
        <Link
          className={`mobile-footer-link${isActivePath("/reservations") ? " active" : ""}`}
          to="/reservations"
        >
          <FaList />
          <span>予約管理</span>
        </Link>
        <Link
          className={`mobile-footer-link${isActivePath("/settings") ? " active" : ""}`}
          to="/settings"
        >
          <FaGear />
          <span>設定</span>
        </Link>
      </nav>
    </div>
  );
};

export default AppLayout;
