import { createFileRoute } from "@tanstack/react-router";
import MapComponent from "@/components/map/map";

export const Route = createFileRoute("/map/")({
  component: MapComponent,
});

export default MapComponent;
