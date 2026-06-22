import { Box, Image, Text } from "@chakra-ui/react";
import type { FC } from "react";
import SidebarMenuContent from "./SidebarMenuContent";

type SidebarProps = {
  isActivePath: (path: string) => boolean;
};

const Sidebar: FC<SidebarProps> = ({ isActivePath }) => {
  return (
    <Box
      as="aside"
      bg="var(--surface)"
      borderRight="1px solid"
      borderColor="var(--border)"
      display={{ base: "none", md: "flex" }}
      flexDirection="column"
      w="280px"
    >
      <Box
        alignItems="center"
        borderBottom="1px solid"
        borderColor="var(--border)"
        color="#4F46E5"
        display="flex"
        gap={3}
        px={4}
        py={2}
      >
        <Image alt="SmartCycle" boxSize="48px" src="/SmartCycle.svg" />
        <Text as="h2" fontSize="1.5rem" fontWeight={800}>
          SmartCycle
        </Text>
      </Box>
      <SidebarMenuContent isActivePath={isActivePath} />
    </Box>
  );
};

export default Sidebar;
