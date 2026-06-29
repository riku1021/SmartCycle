import { apiClient } from "@/lib/apiClient";

export type ParkingLotResponse = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  available_spots: number;
  total_spots: number;
  price_per_hour: number;
  availability_source_type: string;
  created_at: string;
  updated_at: string;
};

export type CreateParkingLotParams = {
  name: string;
  latitude: number;
  longitude: number;
  total_spots: number;
  price_per_hour: number;
  availability_source_type: "gate_camera" | "overhead_camera" | "touch_sensor";
};

export async function fetchParkingLots(): Promise<ParkingLotResponse[]> {
  const { data } = await apiClient.get<ParkingLotResponse[]>("/api/parking-lots");
  return data;
}

export async function createParkingLot(
  params: CreateParkingLotParams
): Promise<ParkingLotResponse> {
  const { data } = await apiClient.post<ParkingLotResponse>("/api/parking-lots", params);
  return data;
}
