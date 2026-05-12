import { Badge, Box, Button, Flex, Heading, HStack, SimpleGrid, Text } from "@chakra-ui/react";
import type { FC } from "react";
import { useState } from "react";
import Layout from "@/layouts/layout";

type ReservationTab = "active" | "history";

type ReservationStatus = "reserved" | "active" | "completed" | "cancelled";

type Reservation = {
  id: string;
  lotName: string;
  location: string;
  dateLabel: string;
  timeLabel: string;
  priceLabel: string;
  status: ReservationStatus;
};

const activeReservations: Reservation[] = [
  {
    id: "RSV-20260422-002",
    lotName: "梅田ステーション東",
    location: "大阪駅東口から徒歩4分",
    dateLabel: "2026/05/12",
    timeLabel: "09:30 - 11:30",
    priceLabel: "予定料金 ¥200",
    status: "active",
  },
  {
    id: "RSV-20260422-001",
    lotName: "中之島ゲート",
    location: "大阪市北区中之島 2丁目付近",
    dateLabel: "2026/05/13",
    timeLabel: "17:30 - 18:30",
    priceLabel: "予定料金 ¥120",
    status: "reserved",
  },
];

const historyReservations: Reservation[] = [
  {
    id: "RSV-20260421-003",
    lotName: "なんばパークス西",
    location: "大阪市浪速区難波中 2丁目付近",
    dateLabel: "2026/04/21",
    timeLabel: "12:00 - 13:00",
    priceLabel: "キャンセル料なし",
    status: "cancelled",
  },
  {
    id: "RSV-20260420-006",
    lotName: "本町サイクルデッキ",
    location: "大阪市中央区本町 3丁目付近",
    dateLabel: "2026/04/20",
    timeLabel: "09:00 - 11:00",
    priceLabel: "支払い済み ¥300",
    status: "completed",
  },
  {
    id: "RSV-20260418-014",
    lotName: "北浜サイクルポート",
    location: "北浜駅 26番出口付近",
    dateLabel: "2026/04/18",
    timeLabel: "13:20 - 14:20",
    priceLabel: "支払い済み ¥120",
    status: "completed",
  },
];

const statusStyle: Record<ReservationStatus, { bg: string; color: string; label: string }> = {
  reserved: { bg: "#dcfce7", color: "#166534", label: "予約済み" },
  active: { bg: "#eef2ff", color: "#4f46e5", label: "利用中" },
  completed: { bg: "#f1f5f9", color: "#475569", label: "利用完了" },
  cancelled: { bg: "#fee2e2", color: "#b91c1c", label: "キャンセル済み" },
};

type ReservationCardProps = {
  reservation: Reservation;
  showActions: boolean;
};

const ReservationCard: FC<ReservationCardProps> = ({ reservation, showActions }) => {
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
          <Text color="#64748b" fontSize="0.88rem" mt={1}>
            {reservation.location}
          </Text>
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
          <Button flex={1} onClick={() => undefined} type="button" variant="outline">
            地図で確認
          </Button>
          <Button
            bg="#fff1f2"
            border="1px solid"
            borderColor="#fecdd3"
            color="#be123c"
            flex={1}
            onClick={() => undefined}
            type="button"
            variant="outline"
          >
            キャンセル
          </Button>
        </Flex>
      ) : null}
    </Box>
  );
};

const ReservationsComponent: FC = () => {
  const [tab, setTab] = useState<ReservationTab>("active");
  const displayedReservations = tab === "active" ? activeReservations : historyReservations;

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

        {displayedReservations.length > 0 ? (
          <SimpleGrid columns={{ base: 1, lg: 2 }} gap={4}>
            {displayedReservations.map((reservation) => (
              <ReservationCard
                key={reservation.id}
                reservation={reservation}
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
