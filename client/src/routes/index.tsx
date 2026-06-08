import { createFileRoute, redirect } from "@tanstack/react-router";
import { isAdminUser } from "@/lib/adminRole";
import { getAccessToken } from "@/lib/apiClient";

const RootEntryComponent = () => {
  return null;
};

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    const token = getAccessToken();
    if (!token) {
      throw redirect({ to: "/login" });
    }
    if (isAdminUser()) {
      throw redirect({ to: "/dashboard" });
    }
    throw redirect({ to: "/map" });
  },
  component: RootEntryComponent,
});
