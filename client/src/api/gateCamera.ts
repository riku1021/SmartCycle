import { apiClient } from "@/lib/apiClient";

export type DetectionBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  score: number;
};

export type LatestDetectionResponse = {
  detected_count: number;
  boxes: DetectionBox[];
  received_at: string | null;
  content_type: string | null;
  size_bytes: number;
};

export async function sendGateCameraFrame(frameBlob: Blob): Promise<void> {
  await apiClient.post("/gate-camera/images", frameBlob, {
    headers: {
      "Content-Type": frameBlob.type || "image/jpeg",
    },
  });
}

export async function fetchLatestGateDetection(): Promise<LatestDetectionResponse> {
  const { data } = await apiClient.get<LatestDetectionResponse>("/gate-camera/detections/latest");
  return data;
}

export async function sendTripEvent(direction: "in" | "out"): Promise<void> {
  await apiClient.post("/gate-camera/trip", { direction });
}
