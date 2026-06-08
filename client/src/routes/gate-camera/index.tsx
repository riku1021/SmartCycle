import { createFileRoute, redirect } from "@tanstack/react-router";
import GateCamera from "@/components/gate-camera/GateCamera";
import { isDevUser } from "@/lib/adminRole";
import { getAccessToken } from "@/lib/apiClient";

export const Route = createFileRoute("/gate-camera/")({
  beforeLoad: () => {
    if (!getAccessToken()) {
      throw redirect({ to: "/login" });
    }
    if (!isDevUser()) {
      throw redirect({ to: "/map" });
    }
  },
  component: GateCamera,
});

export default GateCamera;
