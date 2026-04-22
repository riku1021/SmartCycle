import { createFileRoute, redirect } from "@tanstack/react-router";
import LoginComponent from "@/components/login/login";
import { getAccessToken } from "@/lib/apiClient";

export const Route = createFileRoute("/login/")({
  beforeLoad: () => {
    if (getAccessToken()) {
      throw redirect({ to: "/map" });
    }
  },
  component: LoginComponent,
});

export default LoginComponent;
