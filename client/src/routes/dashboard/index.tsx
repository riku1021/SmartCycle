import { createFileRoute, redirect } from "@tanstack/react-router";
import DashboardComponent from "@/components/dashboard/dashboard";
import { getAccessToken } from "@/lib/apiClient";

export const Route = createFileRoute("/dashboard/")({
  beforeLoad: () => {
    if (!getAccessToken()) {
      throw redirect({ to: "/login" });
    }
  },
  component: DashboardComponent,
});

export default DashboardComponent;
