import { Box, Button } from "@chakra-ui/react";
import { useNavigate } from "@tanstack/react-router";
import type { FC } from "react";
import { FaCamera, FaGear, FaList, FaMapLocationDot, FaUsers } from "react-icons/fa6";
import { MdDashboard } from "react-icons/md";
import { getUserRole } from "@/lib/adminRole";
import { clearAccessToken } from "@/lib/apiClient";
import { showConfirmationAlert } from "@/shared/alerts/alerts";

type SidebarMenuContentProps = {
  isActivePath: (path: string) => boolean;
  onItemClick?: () => void;
};

const SidebarMenuContent: FC<SidebarMenuContentProps> = ({ isActivePath, onItemClick }) => {
  const navigate = useNavigate();
  const role = getUserRole();
  const isAdmin = role === "admin";
  const isDev = role === "dev";
  const canViewDashboard = isAdmin || isDev;
  const canViewCamera = isDev;
  const canViewGeneralUserPages = !isAdmin;

  const handleMove = async (
    to:
      | "/dashboard"
      | "/users"
      | "/map"
      | "/lots"
      | "/reservations"
      | "/gate-camera"
      | "/overhead-camera"
      | "/settings"
  ) => {
    await navigate({ to });
    onItemClick?.();
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
    onItemClick?.();
  };

  return (
    <Box display="flex" flexDirection="column" height="100%" width="100%">
      <Box as="nav" display="flex" flexDirection="column" gap={2} p={3}>
        {canViewDashboard ? (
          <Button
            alignItems="center"
            bg={
              isActivePath("/dashboard") &&
              (window.location.search === "" || window.location.search.includes("tab=dashboard"))
                ? "#4f46e5"
                : "transparent"
            }
            borderRadius="12px"
            boxShadow={
              isActivePath("/dashboard") &&
              (window.location.search === "" || window.location.search.includes("tab=dashboard"))
                ? "0 4px 6px -1px rgba(79, 70, 229, 0.3)"
                : "none"
            }
            color={
              isActivePath("/dashboard") &&
              (window.location.search === "" || window.location.search.includes("tab=dashboard"))
                ? "#ffffff"
                : "#64748b"
            }
            display="flex"
            fontWeight={600}
            gap={2.5}
            justifyContent="flex-start"
            onClick={() => void handleMove("/dashboard")}
            px={4}
            py={3}
            variant="ghost"
            _hover={{
              bg:
                isActivePath("/dashboard") &&
                (window.location.search === "" || window.location.search.includes("tab=dashboard"))
                  ? "#4338ca"
                  : "rgba(79, 70, 229, 0.1)",
            }}
          >
            <MdDashboard />
            管理画面
          </Button>
        ) : null}
        {isDev ? (
          <Button
            alignItems="center"
            bg={isActivePath("/users") ? "#4f46e5" : "transparent"}
            borderRadius="12px"
            boxShadow={isActivePath("/users") ? "0 4px 6px -1px rgba(79, 70, 229, 0.3)" : "none"}
            color={isActivePath("/users") ? "#ffffff" : "#64748b"}
            display="flex"
            fontWeight={600}
            gap={2.5}
            justifyContent="flex-start"
            onClick={() => void handleMove("/users")}
            px={4}
            py={3}
            variant="ghost"
            _hover={{ bg: isActivePath("/users") ? "#4338ca" : "rgba(79, 70, 229, 0.1)" }}
          >
            <FaUsers />
            ユーザー一覧
          </Button>
        ) : null}
        {canViewGeneralUserPages ? (
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
            _hover={{ bg: isActivePath("/map") ? "#4338ca" : "rgba(79, 70, 229, 0.1)" }}
          >
            <FaMapLocationDot />
            マップ検索
          </Button>
        ) : null}
        {canViewGeneralUserPages ? (
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
            _hover={{ bg: isActivePath("/lots") ? "#4338ca" : "rgba(79, 70, 229, 0.1)" }}
          >
            <FaList />
            駐輪場一覧
          </Button>
        ) : null}
        {canViewGeneralUserPages ? (
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
            _hover={{ bg: isActivePath("/reservations") ? "#4338ca" : "rgba(79, 70, 229, 0.1)" }}
          >
            <FaList />
            予約管理
          </Button>
        ) : null}
        {canViewCamera ? (
          <Button
            alignItems="center"
            bg={isActivePath("/gate-camera") ? "#4f46e5" : "transparent"}
            borderRadius="12px"
            boxShadow={
              isActivePath("/gate-camera") ? "0 4px 6px -1px rgba(79, 70, 229, 0.3)" : "none"
            }
            color={isActivePath("/gate-camera") ? "#ffffff" : "#64748b"}
            display="flex"
            fontWeight={600}
            gap={2.5}
            justifyContent="flex-start"
            onClick={() => void handleMove("/gate-camera")}
            px={4}
            py={3}
            variant="ghost"
            _hover={{ bg: isActivePath("/gate-camera") ? "#4338ca" : "rgba(79, 70, 229, 0.1)" }}
          >
            <FaCamera />
            ゲートカメラ
          </Button>
        ) : null}
        {canViewCamera ? (
          <Button
            alignItems="center"
            bg={isActivePath("/overhead-camera") ? "#4f46e5" : "transparent"}
            borderRadius="12px"
            boxShadow={
              isActivePath("/overhead-camera") ? "0 4px 6px -1px rgba(79, 70, 229, 0.3)" : "none"
            }
            color={isActivePath("/overhead-camera") ? "#ffffff" : "#64748b"}
            display="flex"
            fontWeight={600}
            gap={2.5}
            justifyContent="flex-start"
            onClick={() => void handleMove("/overhead-camera")}
            px={4}
            py={3}
            variant="ghost"
            _hover={{ bg: isActivePath("/overhead-camera") ? "#4338ca" : "rgba(79, 70, 229, 0.1)" }}
          >
            <FaCamera />
            俯瞰カメラ
          </Button>
        ) : null}
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
          _hover={{ bg: isActivePath("/settings") ? "#4338ca" : "rgba(79, 70, 229, 0.1)" }}
        >
          <FaGear />
          {isAdmin ? "アカウント管理" : "設定"}
        </Button>
      </Box>
      <Box mt="auto" p={3} pb={5}>
        <Button
          _hover={{ bg: "#f1f5f9", color: "#4f46e5" }}
          alignItems="center"
          bg="transparent"
          borderRadius="12px"
          color="#64748b"
          display="flex"
          gap={2.5}
          justifyContent="flex-start"
          onClick={handleLogout}
          px={4}
          py={3}
          variant="ghost"
          width="100%"
        >
          ログアウト
        </Button>
      </Box>
    </Box>
  );
};

export default SidebarMenuContent;
