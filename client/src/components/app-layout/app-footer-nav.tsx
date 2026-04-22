import { Box, Button, Text } from "@chakra-ui/react";
import { useNavigate } from "@tanstack/react-router";
import type { FC } from "react";
import { FaGear, FaList, FaMapLocationDot } from "react-icons/fa6";
import { MdDashboard } from "react-icons/md";

type AppFooterNavProps = {
  isActivePath: (path: string) => boolean;
};

const AppFooterNav: FC<AppFooterNavProps> = ({ isActivePath }) => {
  const navigate = useNavigate();
  const handleMove = async (
    to: "/dashboard" | "/map" | "/lots" | "/reservations" | "/settings"
  ) => {
    await navigate({ to });
  };

  return (
    <Box
      aria-label="メインナビゲーション"
      as="nav"
      backdropFilter="blur(8px)"
      bg="rgba(255, 255, 255, 0.96)"
      borderTop="1px solid"
      borderColor="#e2e8f0"
      bottom={0}
      display={{ base: "grid", md: "none" }}
      gridTemplateColumns="repeat(5, 1fr)"
      h="74px"
      left={0}
      position="fixed"
      right={0}
      zIndex={2000}
    >
      <Button
        _active={{ bg: "transparent" }}
        _hover={{ bg: "transparent" }}
        alignItems="center"
        bg="transparent"
        color={isActivePath("/dashboard") ? "#4f46e5" : "#64748b"}
        display="flex"
        flexDirection="column"
        fontSize="0.65rem"
        fontWeight={700}
        gap={1}
        h="full"
        justifyContent="center"
        minH="unset"
        minW="unset"
        onClick={() => void handleMove("/dashboard")}
        px={0.5}
        py={1.5}
        rounded="none"
        variant="ghost"
      >
        <Box as="span" fontSize="1.3rem" lineHeight={1}>
          <MdDashboard />
        </Box>
        <Text as="span">管理画面</Text>
      </Button>
      <Button
        _active={{ bg: "transparent" }}
        _hover={{ bg: "transparent" }}
        alignItems="center"
        bg="transparent"
        color={isActivePath("/lots") ? "#4f46e5" : "#64748b"}
        display="flex"
        flexDirection="column"
        fontSize="0.65rem"
        fontWeight={700}
        gap={1}
        h="full"
        justifyContent="center"
        minH="unset"
        minW="unset"
        onClick={() => void handleMove("/lots")}
        px={0.5}
        py={1.5}
        rounded="none"
        variant="ghost"
      >
        <Box as="span" fontSize="1.3rem" lineHeight={1}>
          <FaList />
        </Box>
        <Text as="span">駐輪場一覧</Text>
      </Button>
      <Button
        _active={{ bg: "transparent" }}
        _hover={{ bg: "transparent" }}
        alignItems="center"
        bg="transparent"
        color={isActivePath("/map") ? "#4f46e5" : "#64748b"}
        display="flex"
        flexDirection="column"
        fontSize="0.65rem"
        fontWeight={700}
        gap={1}
        h="full"
        justifyContent="center"
        minH="unset"
        minW="unset"
        onClick={() => void handleMove("/map")}
        px={0.5}
        py={1.5}
        rounded="none"
        variant="ghost"
      >
        <Box as="span" fontSize="1.3rem" lineHeight={1}>
          <FaMapLocationDot />
        </Box>
        <Text as="span">マップ検索</Text>
      </Button>
      <Button
        _active={{ bg: "transparent" }}
        _hover={{ bg: "transparent" }}
        alignItems="center"
        bg="transparent"
        color={isActivePath("/reservations") ? "#4f46e5" : "#64748b"}
        display="flex"
        flexDirection="column"
        fontSize="0.65rem"
        fontWeight={700}
        gap={1}
        h="full"
        justifyContent="center"
        minH="unset"
        minW="unset"
        onClick={() => void handleMove("/reservations")}
        px={0.5}
        py={1.5}
        rounded="none"
        variant="ghost"
      >
        <Box as="span" fontSize="1.3rem" lineHeight={1}>
          <FaList />
        </Box>
        <Text as="span">予約管理</Text>
      </Button>
      <Button
        _active={{ bg: "transparent" }}
        _hover={{ bg: "transparent" }}
        alignItems="center"
        bg="transparent"
        color={isActivePath("/settings") ? "#4f46e5" : "#64748b"}
        display="flex"
        flexDirection="column"
        fontSize="0.65rem"
        fontWeight={700}
        gap={1}
        h="full"
        justifyContent="center"
        minH="unset"
        minW="unset"
        onClick={() => void handleMove("/settings")}
        px={0.5}
        py={1.5}
        rounded="none"
        variant="ghost"
      >
        <Box as="span" fontSize="1.3rem" lineHeight={1}>
          <FaGear />
        </Box>
        <Text as="span">設定</Text>
      </Button>
    </Box>
  );
};

export default AppFooterNav;
