import { apiClient } from "@/lib/apiClient";

export type DetectionBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  score: number;
};

export type LatestOverheadDetectionResponse = {
  detected_count: number;
  boxes: DetectionBox[];
  available_spots: number | null;
  total_spots: number | null;
  received_at: string | null;
  content_type: string | null;
  size_bytes: number;
};

export async function sendOverheadCameraFrame(frameBlob: Blob): Promise<void> {
  await apiClient.post("/overhead-camera/images", frameBlob, {
    headers: {
      "Content-Type": frameBlob.type || "image/jpeg",
    },
  });
}

export async function fetchLatestOverheadDetection(): Promise<LatestOverheadDetectionResponse> {
  const { data } = await apiClient.get<LatestOverheadDetectionResponse>(
    "/overhead-camera/detections/latest"
  );
  return data;
}
