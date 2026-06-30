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

export async function sendGateCameraFrame(parkingLotId: string, frameBlob: Blob): Promise<void> {
  await apiClient.post("/gate-camera/images", frameBlob, {
    params: { parking_lot_id: parkingLotId },
    headers: {
      "Content-Type": frameBlob.type || "image/jpeg",
    },
  });
}

export async function fetchLatestGateDetection(
  parkingLotId: string
): Promise<LatestDetectionResponse> {
  const { data } = await apiClient.get<LatestDetectionResponse>("/gate-camera/detections/latest", {
    params: { parking_lot_id: parkingLotId },
  });
  return data;
}

export async function sendTripEvent(parkingLotId: string, direction: "in" | "out"): Promise<void> {
  await apiClient.post("/gate-camera/trip", { direction, parking_lot_id: parkingLotId });
}
