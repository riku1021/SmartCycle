import { Box } from "@chakra-ui/react";
import type { FC, ReactNode } from "react";
import { useState } from "react";
import MapSideDrawer from "@/components/map/MapSideDrawer";
import Header from "@/layouts/header";

type LayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  hideHeader?: boolean;
  isMapLayout?: boolean;
};

const Layout: FC<LayoutProps> = ({
  title,
  subtitle,
  children,
  hideHeader = false,
  isMapLayout = false,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <Box bg="var(--bg)" color="var(--text)" minH="100vh" width="100%">
      <MapSideDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

      <Box
        as="main"
        flex="1"
        minH={{ base: "100vh", md: "auto" }}
        overflow={isMapLayout ? "hidden" : "visible"}
        pb={{ base: 0, md: isMapLayout ? 0 : 8 }}
        position={isMapLayout ? "relative" : "static"}
        px={{ base: isMapLayout ? 0 : 4, md: isMapLayout ? 0 : 8 }}
        pt={{ base: isMapLayout ? 0 : 5, md: isMapLayout ? 0 : 8 }}
      >
        <Header
          hidden={hideHeader}
          subtitle={subtitle}
          title={title}
          onOpenMenu={() => setIsDrawerOpen(true)}
        />
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
