import { apiClient } from "@/lib/apiClient";

export type ParkingStatus = {
  parking_lot_id: number;
  available_count: number;
  updated_at: string;
};

export async function postParkingStatus(params: {
  parking_lot_id: number;
  available_count: number;
}): Promise<ParkingStatus> {
  const { data } = await apiClient.post<ParkingStatus>("/api/iot/parking-status", params);
  return data;
}

export async function fetchParkingStatus(parkingLotId: number): Promise<ParkingStatus> {
  const { data } = await apiClient.get<ParkingStatus>(`/api/parking-statuses/${parkingLotId}`);
  return data;
}
