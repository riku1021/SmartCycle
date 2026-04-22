import { createFileRoute, redirect } from "@tanstack/react-router";
import LotsComponent from "@/components/lots/lots";
import { isAdminUser } from "@/lib/adminRole";
import { getAccessToken } from "@/lib/apiClient";

export const Route = createFileRoute("/lots/")({
  beforeLoad: () => {
    if (!getAccessToken()) {
      throw redirect({ to: "/login" });
    }
    if (isAdminUser()) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: LotsComponent,
});

export default LotsComponent;
