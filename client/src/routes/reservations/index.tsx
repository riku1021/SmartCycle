import { createFileRoute, redirect } from "@tanstack/react-router";
import ReservationsComponent from "@/components/reservations/reservations";
import { isAdminUser } from "@/lib/adminRole";
import { getAccessToken } from "@/lib/apiClient";

export const Route = createFileRoute("/reservations/")({
  beforeLoad: () => {
    if (!getAccessToken()) {
      throw redirect({ to: "/login" });
    }
    if (isAdminUser()) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: ReservationsComponent,
});

export default ReservationsComponent;
