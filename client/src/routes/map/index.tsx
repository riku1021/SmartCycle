import { createFileRoute, redirect } from "@tanstack/react-router";
import MapComponent from "@/components/map/map";
import { getAccessToken } from "@/lib/apiClient";

export const Route = createFileRoute("/map/")({
  beforeLoad: () => {
    if (!getAccessToken()) {
      throw redirect({ to: "/login" });
    }
  },
  component: MapComponent,
});

export default MapComponent;
