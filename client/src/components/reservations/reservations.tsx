import { Badge, Box, Button, Flex, Heading, HStack, SimpleGrid, Text } from "@chakra-ui/react";
import { useNavigate } from "@tanstack/react-router";
import type { FC } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  cancelReservation,
  fetchMyReservations,
  type ReservationResponse,
  type ReservationStatus,
} from "@/api/reservations";
import Layout from "@/layouts/layout";

type ReservationTab = "active" | "history";

type Reservation = {
  id: string;
  lotName: string;
  location: string;
  dateLabel: string;
  timeLabel: string;
  priceLabel: string;
  status: ReservationStatus;
};

const statusStyle: Record<ReservationStatus, { bg: string; color: string; label: string }> = {
  reserved: { bg: "#dcfce7", color: "#166534", label: "予約済み" },
  active: { bg: "#eef2ff", color: "#4f46e5", label: "利用中" },
  completed: { bg: "#f1f5f9", color: "#475569", label: "利用完了" },
  cancelled: { bg: "#fee2e2", color: "#b91c1c", label: "キャンセル済み" },
};

type ReservationCardProps = {
  reservation: Reservation;
  showActions: boolean;
  isCancelling: boolean;
  onCancel: (reservationId: string) => void;
  onOpenMap: () => void;
};

const ReservationCard: FC<ReservationCardProps> = ({
  reservation,
  showActions,
  isCancelling,
  onCancel,
  onOpenMap,
}) => {
  const currentStatus = statusStyle[reservation.status];

  return (
    <Box
      _hover={{ borderColor: "#c7d2fe", boxShadow: "0 10px 18px -14px rgba(15, 23, 42, 0.35)" }}
      bg="white"
      border="1px solid"
      borderColor="#e2e8f0"
      borderRadius="xl"
      p={{ base: 4, md: 5 }}
      transition="border-color 0.2s, box-shadow 0.2s"
    >
      <Flex align={{ base: "flex-start", md: "center" }} gap={3} justify="space-between" mb={4}>
        <Box minW={0}>
          <Heading as="h3" fontSize={{ base: "1rem", md: "1.1rem" }} lineHeight={1.35}>
            {reservation.lotName}
          </Heading>
        </Box>
        <Badge
          bg={currentStatus.bg}
          borderRadius="full"
          color={currentStatus.color}
          flexShrink={0}
          px={3}
          py={1.5}
        >
          {currentStatus.label}
        </Badge>
      </Flex>

      <Box bg="#f8fafc" borderRadius="lg" p={4}>
        <Text color="#64748b" fontSize="0.78rem" fontWeight={700}>
          利用日時
        </Text>
        <Text color="#0f172a" fontSize={{ base: "1rem", md: "1.08rem" }} fontWeight={800} mt={1}>
          {reservation.dateLabel}
        </Text>
        <Text color="#4f46e5" fontSize="0.95rem" fontWeight={700} mt={0.5}>
          {reservation.timeLabel}
        </Text>
      </Box>

      <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3} mt={3}>
        <Box bg="#f8fafc" borderRadius="lg" p={3}>
          <Text color="#64748b" fontSize="0.75rem" fontWeight={700}>
            料金
          </Text>
          <Text color="#0f172a" fontSize="0.92rem" fontWeight={700} mt={1}>
            {reservation.priceLabel}
          </Text>
        </Box>
        <Box bg="#f8fafc" borderRadius="lg" p={3}>
          <Text color="#64748b" fontSize="0.75rem" fontWeight={700}>
            予約番号
          </Text>
          <Text color="#0f172a" fontSize="0.88rem" fontWeight={700} mt={1}>
            {reservation.id}
          </Text>
        </Box>
      </SimpleGrid>

      {showActions ? (
        <Flex direction={{ base: "column", sm: "row" }} gap={3} mt={4}>
          <Button flex={1} onClick={onOpenMap} type="button" variant="outline">
            地図で確認
          </Button>
          <Button
            bg="#fff1f2"
            border="1px solid"
            borderColor="#fecdd3"
            color="#be123c"
            disabled={isCancelling}
            flex={1}
            onClick={() => onCancel(reservation.id)}
            type="button"
            variant="outline"
          >
            {isCancelling ? "キャンセル中..." : "キャンセル"}
          </Button>
        </Flex>
      ) : null}
    </Box>
  );
};

const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("ja-JP", {
  hour: "2-digit",
  minute: "2-digit",
});

const formatPriceLabel = (reservation: ReservationResponse): string => {
  if (reservation.status === "cancelled") {
    return reservation.total_amount
      ? `キャンセル済み ¥${reservation.total_amount}`
      : "キャンセル料なし";
  }
  if (reservation.status === "completed") {
    return reservation.total_amount ? `支払い済み ¥${reservation.total_amount}` : "支払い済み";
  }
  return reservation.total_amount ? `予定料金 ¥${reservation.total_amount}` : "予定料金 未確定";
};

const toDisplayReservation = (reservation: ReservationResponse): Reservation => {
  const startTime = new Date(reservation.start_time);
  const endTime = new Date(reservation.end_time);
  return {
    id: reservation.id,
    lotName: reservation.parking_lot_name,
    location: reservation.location,
    dateLabel: dateFormatter.format(startTime),
    timeLabel: `${timeFormatter.format(startTime)} - ${timeFormatter.format(endTime)}`,
    priceLabel: formatPriceLabel(reservation),
    status: reservation.status,
  };
};

const isActiveReservation = (reservation: Reservation): boolean =>
  reservation.status === "active" || reservation.status === "reserved";

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return "予約情報を取得できませんでした";
};

const ReservationsComponent: FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<ReservationTab>("active");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [cancellingReservationId, setCancellingReservationId] = useState<string | null>(null);

  const loadReservations = useCallback(async () => {
    setIsLoading(true);
    setFetchError("");
    try {
      const data = await fetchMyReservations();
      setReservations(data.map(toDisplayReservation));
    } catch (error) {
      setFetchError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReservations();
  }, [loadReservations]);

  const activeReservations = useMemo(
    () => reservations.filter(isActiveReservation),
    [reservations]
  );
  const historyReservations = useMemo(
    () => reservations.filter((reservation) => !isActiveReservation(reservation)),
    [reservations]
  );
  const displayedReservations = tab === "active" ? activeReservations : historyReservations;

  const handleCancel = async (reservationId: string) => {
    setCancellingReservationId(reservationId);
    setFetchError("");
    try {
      await cancelReservation(reservationId);
      await loadReservations();
    } catch (error) {
      setFetchError(getErrorMessage(error));
    } finally {
      setCancellingReservationId(null);
    }
  };

  return (
    <Layout title="予約管理" subtitle="予約中・履歴の確認ができます">
      <Box
        bg="white"
        border="1px solid"
        borderColor="#e2e8f0"
        borderRadius="2xl"
        p={{ base: 4, md: 6 }}
      >
        <HStack bg="#f1f5f9" borderRadius="xl" gap={1.5} mb={5} p={1.5} width="100%">
          <Button
            bg={tab === "active" ? "white" : "transparent"}
            borderRadius="lg"
            boxShadow={tab === "active" ? "0 1px 3px rgba(15, 23, 42, 0.12)" : "none"}
            color={tab === "active" ? "#4f46e5" : "#64748b"}
            flex={1}
            fontWeight={800}
            onClick={() => setTab("active")}
            type="button"
            variant="ghost"
          >
            予約中 ({activeReservations.length})
          </Button>
          <Button
            bg={tab === "history" ? "white" : "transparent"}
            borderRadius="lg"
            boxShadow={tab === "history" ? "0 1px 3px rgba(15, 23, 42, 0.12)" : "none"}
            color={tab === "history" ? "#4f46e5" : "#64748b"}
            flex={1}
            fontWeight={800}
            onClick={() => setTab("history")}
            type="button"
            variant="ghost"
          >
            履歴 ({historyReservations.length})
          </Button>
        </HStack>

        {fetchError ? (
          <Box bg="#fef2f2" borderRadius="xl" color="#b91c1c" mb={4} p={4}>
            <Text fontSize="0.9rem" fontWeight={700}>
              {fetchError}
            </Text>
            <Button mt={3} onClick={() => void loadReservations()} type="button" variant="outline">
              再読み込み
            </Button>
          </Box>
        ) : null}

        {isLoading ? (
          <Box bg="#f8fafc" borderRadius="xl" p={8} textAlign="center">
            <Heading as="h3" fontSize="lg">
              予約情報を読み込んでいます
            </Heading>
          </Box>
        ) : displayedReservations.length > 0 ? (
          <SimpleGrid columns={{ base: 1, lg: 2 }} gap={4}>
            {displayedReservations.map((reservation) => (
              <ReservationCard
                key={reservation.id}
                reservation={reservation}
                isCancelling={cancellingReservationId === reservation.id}
                onCancel={handleCancel}
                onOpenMap={() => void navigate({ to: "/map" })}
                showActions={tab === "active"}
              />
            ))}
          </SimpleGrid>
        ) : (
          <Box bg="#f8fafc" borderRadius="xl" p={8} textAlign="center">
            <Heading as="h3" fontSize="lg">
              {tab === "active" ? "予約中の駐輪場はありません" : "予約履歴はありません"}
            </Heading>
            <Text color="#64748b" mt={2}>
              {tab === "active"
                ? "マップ検索や駐輪場一覧から予約すると、ここに表示されます。"
                : "利用完了またはキャンセルした予約がここに表示されます。"}
            </Text>
          </Box>
        )}
      </Box>
    </Layout>
  );
};

export default ReservationsComponent;
