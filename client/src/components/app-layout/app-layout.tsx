import { useLocation } from "@tanstack/react-router";
import type { FC, ReactNode } from "react";
import AppFooterNav from "@/components/app-layout/app-footer-nav";
import AppHeader from "@/components/app-layout/app-header";
import AppSidebar from "@/components/app-layout/app-sidebar";
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
  const isActivePath = (path: string) => location.pathname === path;

  return (
    <div className="app-shell">
      <AppSidebar isActivePath={isActivePath} />

      <main className={`app-main${mainClassName ? ` ${mainClassName}` : ""}`}>
        <AppHeader hidden={hideHeader} subtitle={subtitle} title={title} />
        {children}
      </main>

      <AppFooterNav isActivePath={isActivePath} />
    </div>
  );
};

export default AppLayout;
