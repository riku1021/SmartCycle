import { createFileRoute, redirect } from "@tanstack/react-router";
import LoginComponent from "@/components/login/login";
import { clearAccessToken, getAccessToken } from "@/lib/apiClient";

export const Route = createFileRoute("/login/")({
  validateSearch: (search: Record<string, unknown>) => ({
    logout: search.logout === "1" || search.logout === true,
  }),
  beforeLoad: ({ search }) => {
    // ?logout=1 があればトークンをクリアして続行
    if ((search as { logout?: boolean }).logout) {
      clearAccessToken();
      return;
    }
    if (getAccessToken()) {
      throw redirect({ to: "/map" });
    }
  },
  component: LoginComponent,
});

export default LoginComponent;
