import { createFileRoute, redirect } from "@tanstack/react-router";
import DashboardComponent from "@/components/dashboard/dashboard";
import { isAdminOrDevUser } from "@/lib/adminRole";
import { getAccessToken } from "@/lib/apiClient";

export const Route = createFileRoute("/dashboard/")({
  beforeLoad: () => {
    if (!getAccessToken()) {
      throw redirect({ to: "/login" });
    }
    if (!isAdminOrDevUser()) {
      throw redirect({ to: "/map" });
    }
  },
  component: DashboardComponent,
});

export default DashboardComponent;
