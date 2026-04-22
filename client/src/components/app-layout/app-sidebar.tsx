import { Box, Button, Image, Text } from "@chakra-ui/react";
import { useNavigate } from "@tanstack/react-router";
import type { FC } from "react";
import { FaCamera, FaGear, FaList, FaMapLocationDot } from "react-icons/fa6";
import { MdDashboard } from "react-icons/md";
import { clearAccessToken } from "@/lib/apiClient";
import { showConfirmationAlert } from "@/shared/alerts/alerts";

type AppSidebarProps = {
  isActivePath: (path: string) => boolean;
};

const AppSidebar: FC<AppSidebarProps> = ({ isActivePath }) => {
  const navigate = useNavigate();
  const handleMove = async (
    to: "/dashboard" | "/map" | "/lots" | "/reservations" | "/camera" | "/settings"
  ) => {
    await navigate({ to });
  };

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
    <Box
      as="aside"
      bg="white"
      borderRight="1px solid"
      borderColor="#e2e8f0"
      display={{ base: "none", md: "flex" }}
      flexDirection="column"
      w="280px"
    >
      <Box
        alignItems="center"
        borderBottom="1px solid"
        borderColor="#e2e8f0"
        color="#4f46e5"
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
      <Box as="nav" display="flex" flexDirection="column" gap={2} p={3}>
        <Button
          alignItems="center"
          bg={isActivePath("/dashboard") ? "#4f46e5" : "transparent"}
          borderRadius="12px"
          boxShadow={isActivePath("/dashboard") ? "0 4px 6px -1px rgba(79, 70, 229, 0.3)" : "none"}
          color={isActivePath("/dashboard") ? "#ffffff" : "#64748b"}
          display="flex"
          fontWeight={600}
          gap={2.5}
          justifyContent="flex-start"
          onClick={() => void handleMove("/dashboard")}
          px={4}
          py={3}
          variant="ghost"
        >
          <MdDashboard />
          管理画面
        </Button>
        <Button
          alignItems="center"
          bg={isActivePath("/map") ? "#4f46e5" : "transparent"}
          borderRadius="12px"
          boxShadow={isActivePath("/map") ? "0 4px 6px -1px rgba(79, 70, 229, 0.3)" : "none"}
          color={isActivePath("/map") ? "#ffffff" : "#64748b"}
          display="flex"
          fontWeight={600}
          gap={2.5}
          justifyContent="flex-start"
          onClick={() => void handleMove("/map")}
          px={4}
          py={3}
          variant="ghost"
        >
          <FaMapLocationDot />
          マップ検索
        </Button>
        <Button
          alignItems="center"
          bg={isActivePath("/lots") ? "#4f46e5" : "transparent"}
          borderRadius="12px"
          boxShadow={isActivePath("/lots") ? "0 4px 6px -1px rgba(79, 70, 229, 0.3)" : "none"}
          color={isActivePath("/lots") ? "#ffffff" : "#64748b"}
          display="flex"
          fontWeight={600}
          gap={2.5}
          justifyContent="flex-start"
          onClick={() => void handleMove("/lots")}
          px={4}
          py={3}
          variant="ghost"
        >
          <FaList />
          駐輪場一覧
        </Button>
        <Button
          alignItems="center"
          bg={isActivePath("/reservations") ? "#4f46e5" : "transparent"}
          borderRadius="12px"
          boxShadow={
            isActivePath("/reservations") ? "0 4px 6px -1px rgba(79, 70, 229, 0.3)" : "none"
          }
          color={isActivePath("/reservations") ? "#ffffff" : "#64748b"}
          display="flex"
          fontWeight={600}
          gap={2.5}
          justifyContent="flex-start"
          onClick={() => void handleMove("/reservations")}
          px={4}
          py={3}
          variant="ghost"
        >
          <FaList />
          予約管理
        </Button>
        <Button
          alignItems="center"
          bg={isActivePath("/camera") ? "#4f46e5" : "transparent"}
          borderRadius="12px"
          boxShadow={isActivePath("/camera") ? "0 4px 6px -1px rgba(79, 70, 229, 0.3)" : "none"}
          color={isActivePath("/camera") ? "#ffffff" : "#64748b"}
          display="flex"
          fontWeight={600}
          gap={2.5}
          justifyContent="flex-start"
          onClick={() => void handleMove("/camera")}
          px={4}
          py={3}
          variant="ghost"
        >
          <FaCamera />
          カメラ画像
        </Button>
        <Button
          alignItems="center"
          bg={isActivePath("/settings") ? "#4f46e5" : "transparent"}
          borderRadius="12px"
          boxShadow={isActivePath("/settings") ? "0 4px 6px -1px rgba(79, 70, 229, 0.3)" : "none"}
          color={isActivePath("/settings") ? "#ffffff" : "#64748b"}
          display="flex"
          fontWeight={600}
          gap={2.5}
          justifyContent="flex-start"
          onClick={() => void handleMove("/settings")}
          px={4}
          py={3}
          variant="ghost"
        >
          <FaGear />
          設定
        </Button>
      </Box>
      <Button
        _hover={{ bg: "#f1f5f9", color: "#4f46e5" }}
        alignItems="center"
        bg="transparent"
        borderRadius="12px"
        color="#64748b"
        display="flex"
        gap={2.5}
        justifyContent="flex-start"
        mb={5}
        ml={3}
        mt="auto"
        onClick={handleLogout}
        px={4}
        py={3}
        variant="ghost"
        width="calc(100% - 24px)"
      >
        ログアウト
      </Button>
    </Box>
  );
};

export default AppSidebar;
