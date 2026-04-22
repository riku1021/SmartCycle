import { createFileRoute, redirect } from "@tanstack/react-router";
import ReservationsComponent from "@/components/reservations/reservations";
import { getAccessToken } from "@/lib/apiClient";

export const Route = createFileRoute("/reservations/")({
  beforeLoad: () => {
    if (!getAccessToken()) {
      throw redirect({ to: "/login" });
    }
  },
  component: ReservationsComponent,
});

export default ReservationsComponent;
