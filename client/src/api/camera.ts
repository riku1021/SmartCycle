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

export async function sendCameraFrame(frameBlob: Blob): Promise<void> {
  await apiClient.post("/camera/images", frameBlob, {
    headers: {
      "Content-Type": frameBlob.type || "image/jpeg",
    },
  });
}

export async function fetchLatestDetection(): Promise<LatestDetectionResponse> {
  const { data } = await apiClient.get<LatestDetectionResponse>("/camera/detections/latest");
  return data;
}
