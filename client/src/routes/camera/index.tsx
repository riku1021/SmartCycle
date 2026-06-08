import { createFileRoute, redirect } from "@tanstack/react-router";
import CameraComponent from "@/components/camera/camera";
import { isDevUser } from "@/lib/adminRole";
import { getAccessToken } from "@/lib/apiClient";

export const Route = createFileRoute("/camera/")({
  beforeLoad: () => {
    if (!getAccessToken()) {
      throw redirect({ to: "/login" });
    }
    if (!isDevUser()) {
      throw redirect({ to: "/map" });
    }
  },
  component: CameraComponent,
});

export default CameraComponent;
