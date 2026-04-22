import { createFileRoute } from "@tanstack/react-router";
import CameraComponent from "@/components/camera/camera";

export const Route = createFileRoute("/camera/")({
  component: CameraComponent,
});

export default CameraComponent;
