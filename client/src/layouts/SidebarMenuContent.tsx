import { Box, Button } from "@chakra-ui/react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import type { FC } from "react";
import {
  FaBuilding,
  FaCamera,
  FaChartLine,
  FaGear,
  FaList,
  FaMapLocationDot,
  FaUser,
  FaUsers,
} from "react-icons/fa6";
import { MdDashboard } from "react-icons/md";
import { getUserRole } from "@/lib/adminRole";
import { clearAccessToken } from "@/lib/apiClient";
import { showConfirmationAlert } from "@/shared/alerts/alerts";

type SidebarMenuContentProps = {
  isActivePath: (path: string) => boolean;
  onItemClick?: () => void;
};

type RoutePath =
  | "/dashboard"
  | "/users"
  | "/map"
  | "/lots"
  | "/reservations"
  | "/gate-camera"
  | "/overhead-camera"
  | "/settings";

const SidebarMenuContent: FC<SidebarMenuContentProps> = ({ isActivePath, onItemClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const role = getUserRole();
  const isAdmin = role === "admin";
  const isDev = role === "dev";

  const canViewDashboard = isAdmin || isDev;
  const canViewCamera = isDev;
  const canViewGeneralUserPages = !isAdmin;

  const handleMove = async (to: string) => {
    if (to.includes("?")) {
      const [path, query] = to.split("?");
      const searchParams = new URLSearchParams(query);
      const searchObj: Record<string, string> = {};
      searchParams.forEach((val, key) => {
        searchObj[key] = val;
      });
      // biome-ignore lint/suspicious/noExplicitAny: dynamic route
      await navigate({ to: path as any, search: searchObj as any });
    } else {
      // biome-ignore lint/suspicious/noExplicitAny: dynamic route
      await navigate({ to: to as any });
    }
    onItemClick?.();
  };

  const handleLogout = async () => {
    onItemClick?.();

    setTimeout(async () => {
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
    }, 100);
  };

  const searchStr = location.searchStr;

  const isDashboard = isActivePath("/dashboard");

  const dashboardItems = isDashboard
    ? [
        {
          path: "/dashboard" as RoutePath,
          label: "ダッシュボード",
          icon: <MdDashboard />,
          visible: canViewDashboard,
          isActive: isActivePath("/dashboard") && !searchStr.includes("tab="),
        },
        {
          // biome-ignore lint/suspicious/noExplicitAny: bypass
          path: "/dashboard?tab=management" as any,
          label: "駐輪場管理",
          icon: <FaBuilding />,
          visible: canViewDashboard,
          isActive: isActivePath("/dashboard") && searchStr.includes("tab=management"),
        },
        {
          // biome-ignore lint/suspicious/noExplicitAny: bypass
          path: "/dashboard?tab=reports" as any,
          label: "統計レポート",
          icon: <FaChartLine />,
          visible: canViewDashboard,
          isActive: isActivePath("/dashboard") && searchStr.includes("tab=reports"),
        },
      ]
    : [
        {
          path: "/dashboard" as RoutePath,
          label: "管理画面",
          icon: <MdDashboard />,
          visible: canViewDashboard,
          isActive: false,
        },
      ];

  const adminItems = [
    ...dashboardItems,
    {
      path: "/users" as RoutePath,
      label: "ユーザー一覧",
      icon: <FaUsers />,
      visible: isDev,
      isActive: isActivePath("/users"),
    },
  ];

  const generalItems = [
    {
      path: "/map" as RoutePath,
      label: "マップ検索",
      icon: <FaMapLocationDot />,
      visible: canViewGeneralUserPages,
      isActive: isActivePath("/map"),
    },
    {
      path: "/lots" as RoutePath,
      label: "駐輪場一覧",
      icon: <FaList />,
      visible: canViewGeneralUserPages,
      isActive: isActivePath("/lots"),
    },
    {
      path: "/reservations" as RoutePath,
      label: "予約管理",
      icon: <FaList />,
      visible: canViewGeneralUserPages,
      isActive: isActivePath("/reservations"),
    },
    {
      path: "/gate-camera" as RoutePath,
      label: "ゲートカメラ",
      icon: <FaCamera />,
      visible: canViewCamera,
      isActive: isActivePath("/gate-camera"),
    },
    {
      path: "/overhead-camera" as RoutePath,
      label: "俯瞰カメラ",
      icon: <FaCamera />,
      visible: canViewCamera,
      isActive: isActivePath("/overhead-camera"),
      defaultColor: "#64748b",
    },
    {
      path: "/settings" as RoutePath,
      label: isAdmin ? "アカウント管理" : "MYページ",
      icon: isAdmin ? <FaGear /> : <FaUser />,
      visible: true,
      isActive: isActivePath("/settings"),
    },
  ];

  const visibleAdminItems = adminItems.filter((item) => item.visible);
  const visibleGeneralItems = generalItems.filter((item) => item.visible);

  // biome-ignore lint/suspicious/noExplicitAny: generic item
  const renderItem = (item: any) => (
    <Button
      key={item.path}
      alignItems="center"
      bg={item.isActive ? "#4f46e5" : "transparent"}
      borderRadius="12px"
      boxShadow={item.isActive ? "0 4px 6px -1px rgba(79, 70, 229, 0.3)" : "none"}
      color={item.isActive ? "#ffffff" : item.defaultColor || "var(--text2)"}
      display="flex"
      fontWeight={600}
      gap={2.5}
      justifyContent="flex-start"
      onClick={() => void handleMove(item.path)}
      px={4}
      py={3}
      variant="ghost"
      _hover={{
        bg: item.isActive ? "#4338ca" : "rgba(79, 70, 229, 0.1)",
      }}
    >
      {item.icon}
      {item.label}
    </Button>
  );

  return (
    <Box display="flex" flexDirection="column" height="100%" width="100%">
      <Box as="nav" display="flex" flexDirection="column" gap={2} p={3}>
        {visibleAdminItems.map(renderItem)}
        {visibleAdminItems.length > 0 && visibleGeneralItems.length > 0 && (
          <Box py={2}>
            <Box borderTop="1px solid" borderColor="var(--border)" />
          </Box>
        )}
        {visibleGeneralItems.map(renderItem)}
      </Box>
      <Box mt="auto" p={3} pb={5}>
        <Button
          _hover={{ bg: "var(--bg)", color: "var(--primary)" }}
          alignItems="center"
          bg="transparent"
          borderRadius="12px"
          color="var(--text2)"
          display="flex"
          gap={2.5}
          justifyContent="flex-start"
          onClick={() => void handleLogout()}
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
