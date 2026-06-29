import { createFileRoute, redirect } from "@tanstack/react-router";
import LotRegisterComponent from "@/components/lots/register";
import { isOperatorUser } from "@/lib/adminRole";
import { getAccessToken } from "@/lib/apiClient";

export const Route = createFileRoute("/lots/register/")({
  beforeLoad: () => {
    if (!getAccessToken()) {
      throw redirect({ to: "/login" });
    }
    if (!isOperatorUser()) {
      throw redirect({ to: "/map" });
    }
  },
  component: LotRegisterComponent,
});

export default LotRegisterComponent;
