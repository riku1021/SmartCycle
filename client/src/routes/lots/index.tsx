import { createFileRoute, redirect } from "@tanstack/react-router";
import LotsComponent from "@/components/lots/lots";
import { getAccessToken } from "@/lib/apiClient";

export const Route = createFileRoute("/lots/")({
  beforeLoad: () => {
    if (!getAccessToken()) {
      throw redirect({ to: "/login" });
    }
  },
  component: LotsComponent,
});

export default LotsComponent;
