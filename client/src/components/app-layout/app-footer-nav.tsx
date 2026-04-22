import { Link } from "@tanstack/react-router";
import type { FC } from "react";
import { FaGear, FaList, FaMapLocationDot } from "react-icons/fa6";
import { MdDashboard } from "react-icons/md";

type AppFooterNavProps = {
  isActivePath: (path: string) => boolean;
};

const AppFooterNav: FC<AppFooterNavProps> = ({ isActivePath }) => {
  return (
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
  );
};

export default AppFooterNav;
