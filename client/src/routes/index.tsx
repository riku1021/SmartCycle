import { createFileRoute } from "@tanstack/react-router";

const RouteComponent = () => {
  return <>index</>;
};

export const Route = createFileRoute("/")({
  component: RouteComponent,
});
