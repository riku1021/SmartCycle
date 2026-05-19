import { createFileRoute, redirect } from "@tanstack/react-router";
import UsersComponent from "@/components/users/users";
import { getUserRole } from "@/lib/adminRole";
import { getAccessToken } from "@/lib/apiClient";

export const Route = createFileRoute("/users/")({
  beforeLoad: () => {
    if (!getAccessToken()) {
      throw redirect({ to: "/login" });
    }
    const role = getUserRole();
    if (role !== "dev") {
      throw redirect({ to: "/map" });
    }
  },
  component: UsersComponent,
});

export default UsersComponent;
