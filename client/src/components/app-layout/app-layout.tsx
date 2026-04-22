import { Box } from "@chakra-ui/react";
import { useLocation } from "@tanstack/react-router";
import type { FC, ReactNode } from "react";
import AppFooterNav from "@/components/app-layout/app-footer-nav";
import AppHeader from "@/components/app-layout/app-header";
import AppSidebar from "@/components/app-layout/app-sidebar";

type AppLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  hideHeader?: boolean;
  isMapLayout?: boolean;
};

const AppLayout: FC<AppLayoutProps> = ({
  title,
  subtitle,
  children,
  hideHeader = false,
  isMapLayout = false,
}) => {
  const location = useLocation();
  const isActivePath = (path: string) => location.pathname === path;

  return (
    <Box
      bg="#f8fafc"
      color="#0f172a"
      display={{ base: "block", md: "flex" }}
      minH="100vh"
      width="100%"
    >
      <AppSidebar isActivePath={isActivePath} />

      <Box
        as="main"
        flex="1"
        minH={{ base: "100vh", md: "auto" }}
        overflow={isMapLayout ? "hidden" : "visible"}
        pb={{ base: isMapLayout ? "74px" : "92px", md: 8 }}
        position={isMapLayout ? "relative" : "static"}
        px={{ base: isMapLayout ? 0 : 4, md: isMapLayout ? 0 : 8 }}
        py={{ base: isMapLayout ? 0 : 5, md: isMapLayout ? 0 : 8 }}
      >
        <AppHeader hidden={hideHeader} subtitle={subtitle} title={title} />
        {children}
      </Box>

      <AppFooterNav isActivePath={isActivePath} />
    </Box>
  );
};

export default AppLayout;
