import { createFileRoute } from "@tanstack/react-router";
import MapComponent from "@/components/map/map";

export const Route = createFileRoute("/map/")({
  validateSearch: (search: Record<string, unknown>) => ({
    login: search.login === "1" || search.login === true,
  }),
  component: MapComponent,
});

export default MapComponent;
