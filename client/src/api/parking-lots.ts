import { apiClient } from "@/lib/apiClient";

export type ParkingLotResponse = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  available_spots: number;
  total_spots: number;
  price_per_hour: number;
  created_at: string;
  updated_at: string;
};

export async function fetchParkingLots(): Promise<ParkingLotResponse[]> {
  const { data } = await apiClient.get<ParkingLotResponse[]>("/api/parking-lots");
  return data;
}
