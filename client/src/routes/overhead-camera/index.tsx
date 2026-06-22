import { createFileRoute, redirect } from "@tanstack/react-router";
import OverheadCamera from "@/components/overhead-camera/OverheadCamera";
import { isDevUser } from "@/lib/adminRole";
import { getAccessToken } from "@/lib/apiClient";

export const Route = createFileRoute("/overhead-camera/")({
  validateSearch: (search: Record<string, unknown>): { parkingLotId?: string } => {
    return {
      parkingLotId: typeof search.parkingLotId === "string" ? search.parkingLotId : undefined,
    };
  },
  beforeLoad: () => {
    if (!getAccessToken()) {
      throw redirect({ to: "/login" });
    }
    if (!isDevUser()) {
      throw redirect({ to: "/map" });
    }
  },
  component: OverheadCamera,
});

export default OverheadCamera;
