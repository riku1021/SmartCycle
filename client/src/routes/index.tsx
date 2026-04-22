import { createFileRoute, redirect } from "@tanstack/react-router";

const RootEntryComponent = () => {
  return null;
};

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/map" });
  },
  component: RootEntryComponent,
});
