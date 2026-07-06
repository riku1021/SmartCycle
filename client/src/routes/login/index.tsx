import { createFileRoute, redirect } from "@tanstack/react-router";
import { clearAccessToken, getAccessToken } from "@/lib/apiClient";

export const Route = createFileRoute("/login/")({
  validateSearch: (search: Record<string, unknown>) => ({
    logout: search.logout === "1" || search.logout === true,
  }),
  beforeLoad: ({ search }) => {
    if (search.logout) {
      clearAccessToken();
      throw redirect({ to: "/map" });
    }
    if (getAccessToken()) {
      throw redirect({ to: "/map" });
    }
    throw redirect({ to: "/map", search: { login: true } });
  },
});
