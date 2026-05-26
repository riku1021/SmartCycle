import { apiClient } from "@/lib/apiClient";

export type ReservationStatus = "reserved" | "active" | "completed" | "cancelled";

export type ReservationResponse = {
  id: string;
  parking_lot_id: string;
  parking_lot_name: string;
  location: string;
  start_time: string;
  end_time: string;
  status: ReservationStatus;
  total_amount: number | null;
  created_at: string;
};

export type ReservationCreateParams = {
  parking_lot_id: string;
  start_time: string;
  end_time: string;
};

export async function fetchMyReservations(): Promise<ReservationResponse[]> {
  const { data } = await apiClient.get<ReservationResponse[]>("/api/reservations/me");
  return data;
}

export async function createReservation(
  params: ReservationCreateParams
): Promise<ReservationResponse> {
  const { data } = await apiClient.post<ReservationResponse>("/api/reservations", params);
  return data;
}

export async function cancelReservation(reservationId: string): Promise<ReservationResponse> {
  const { data } = await apiClient.patch<ReservationResponse>(
    `/api/reservations/${reservationId}`,
    { status: "cancelled" }
  );
  return data;
}
