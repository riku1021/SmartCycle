import { createFileRoute, redirect } from "@tanstack/react-router";
import DashboardComponent from "@/components/dashboard/dashboard";
import { isDashboardUser } from "@/lib/adminRole";
import { getAccessToken } from "@/lib/apiClient";

export const Route = createFileRoute("/dashboard/")({
  beforeLoad: () => {
    if (!getAccessToken()) {
      throw redirect({ to: "/login" });
    }
    if (!isDashboardUser()) {
      throw redirect({ to: "/map" });
    }
  },
  component: DashboardComponent,
});

export default DashboardComponent;
