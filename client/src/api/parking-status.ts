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

export async function fetchParkingStatuses(): Promise<ParkingStatus[]> {
  const { data } = await apiClient.get<ParkingStatus[]>("/api/parking-statuses");
  return data;
}

export type DashboardSummary = {
  total_occupancy_rate: number;
  used_count: number;
  total_capacity: number;
  full_lots_count: number;
  total_lots_count: number;
  active_reservations_count: number;
  abnormal_devices_count: number;
  occupancy_by_lot: { name: string; shortName: string; value: number }[];
  status_distribution: { name: string; value: number; color: string }[];
};

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await apiClient.get<DashboardSummary>("/api/dashboard/summary");
  return data;
}
