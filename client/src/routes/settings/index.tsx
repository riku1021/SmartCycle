import { createFileRoute, redirect } from "@tanstack/react-router";
import SettingsComponent from "@/components/settings/settings";
import { getAccessToken } from "@/lib/apiClient";

export const Route = createFileRoute("/settings/")({
  beforeLoad: () => {
    if (!getAccessToken()) {
      throw redirect({ to: "/login" });
    }
  },
  component: SettingsComponent,
});

export default SettingsComponent;
