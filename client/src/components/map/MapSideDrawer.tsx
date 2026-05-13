import { Box, Drawer, Image, Text } from "@chakra-ui/react";
import { useLocation } from "@tanstack/react-router";
import type { FC } from "react";
import { FaXmark } from "react-icons/fa6";
import SidebarMenuContent from "@/layouts/SidebarMenuContent";

type MapSideDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
};

const MapSideDrawer: FC<MapSideDrawerProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const isActivePath = (path: string) => location.pathname === path;

  return (
    <Drawer.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()} placement="start">
      <Drawer.Backdrop />
      <Drawer.Positioner zIndex={2100}>
        <Drawer.Content bg="white" height="100dvh" maxW="280px">
          <Box
            alignItems="center"
            borderBottom="1px solid"
            borderColor="#e2e8f0"
            color="#4f46e5"
            display="flex"
            justifyContent="space-between"
            px={4}
            py={2}
          >
            <Box alignItems="center" display="flex" gap={3}>
              <Image alt="SmartCycle" boxSize="40px" src="/SmartCycle.svg" />
              <Text as="h2" fontSize="1.2rem" fontWeight={800}>
                SmartCycle
              </Text>
            </Box>
            <Box
              as="button"
              aria-label="メニューを閉じる"
              onClick={onClose}
              p={2}
              transition="color 0.2s"
              _hover={{ color: "#4338ca" }}
            >
              <FaXmark size="1.4rem" />
            </Box>
          </Box>
          <Box flex="1" overflowY="auto">
            <SidebarMenuContent isActivePath={isActivePath} onItemClick={onClose} />
          </Box>
        </Drawer.Content>
      </Drawer.Positioner>
    </Drawer.Root>
  );
};

export default MapSideDrawer;
