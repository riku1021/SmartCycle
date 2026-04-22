import { createFileRoute, redirect } from "@tanstack/react-router";
import MapComponent from "@/components/map/map";
import { isAdminUser } from "@/lib/adminRole";
import { getAccessToken } from "@/lib/apiClient";

export const Route = createFileRoute("/map/")({
  beforeLoad: () => {
    if (getAccessToken() && isAdminUser()) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: MapComponent,
});

export default MapComponent;
