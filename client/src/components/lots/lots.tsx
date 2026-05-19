import { Badge, Box, Button, Heading, HStack, SimpleGrid, Text } from "@chakra-ui/react";
import axios from "axios";
import type { FC } from "react";
import { useEffect, useMemo, useState } from "react";
import { fetchParkingStatus, type ParkingStatus } from "@/api/parking-status";
import { API_BASE_URL } from "@/config/env";
import Layout from "@/layouts/layout";

type ParkingAvailability = "空きあり" | "空きあり、残りわずか" | "空きなし";

type Lot = {
  id: number;
  name: string;
  status: ParkingAvailability | string;
  walk: string;
  isEv3Linked?: boolean;
};

const EV3_LINKED_PARKING_LOT_ID = 1;
const POLL_INTERVAL_MS = 1500;
const TOTAL_SLOTS = 3;

const initialLots: Lot[] = [
  {
    id: EV3_LINKED_PARKING_LOT_ID,
    name: "梅田ステーション東",
    status: "空きあり",
    walk: "徒歩 4分",
    isEv3Linked: true,
  },
  { id: 2, name: "中之島ゲート", status: "残りわずか", walk: "徒歩 8分" },
  { id: 3, name: "本町サイクルデッキ", status: "満車", walk: "徒歩 3分" },
];

const availableCountToStatus = (count: number): ParkingAvailability => {
  if (count <= 0) return "空きなし";
  if (count === 1) return "空きあり、残りわずか";
  return "空きあり";
};

const statusColor = (status: string): { bg: string; color: string } => {
  if (status === "空きなし" || status === "満車") {
    return { bg: "#fee2e2", color: "#b91c1c" };
  }
  if (status.includes("残りわずか")) {
    return { bg: "#fef3c7", color: "#b45309" };
  }
  return { bg: "#dcfce7", color: "#166534" };
};

const LotsComponent: FC = () => {
  const [ev3Status, setEv3Status] = useState<ParkingStatus | null>(null);
  const [fetchError, setFetchError] = useState("");
  const [fetchHint, setFetchHint] = useState("");

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      try {
        const data = await fetchParkingStatus(EV3_LINKED_PARKING_LOT_ID);
        if (cancelled) return;
        setEv3Status(data);
        setFetchError("");
        setFetchHint("");
      } catch (error) {
        if (cancelled) return;
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          setEv3Status(null);
          setFetchError("");
          setFetchHint(
            "バックエンドに駐輪場 ID 1 のデータがまだありません。`server/scripts/ev3_touch_monitor.py` を起動すると初回 POST で表示されます（バックエンドは起動済みとみなします）。"
          );
          return;
        }
        const detail =
          axios.isAxiosError(error) && typeof error.response?.data === "object"
            ? JSON.stringify(error.response.data)
            : error instanceof Error
              ? error.message
              : "不明なエラー";
        setEv3Status(null);
        setFetchHint("");
        setFetchError(
          `API に接続できません (${API_BASE_URL})。バックエンドの起動・ポート・CORS、およびクライアントの VITE_API_BASE_URL を確認してください。詳細: ${detail}`
        );
      }
    };

    void tick();
    const timer = window.setInterval(() => void tick(), POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const ev3Availability: ParkingAvailability | null = useMemo(() => {
    if (!ev3Status) return null;
    return availableCountToStatus(ev3Status.available_count);
  }, [ev3Status]);

  const lots = useMemo<Lot[]>(
    () =>
      initialLots.map((lot) =>
        lot.isEv3Linked && ev3Availability ? { ...lot, status: ev3Availability } : lot
      ),
    [ev3Availability]
  );

  const pressedCount =
    ev3Status !== null ? Math.max(TOTAL_SLOTS - ev3Status.available_count, 0) : null;

  return (
    <Layout title="駐輪場一覧" subtitle="条件でフィルタしながら駐輪場を探せます">
      <Box bg="white" border="1px solid" borderColor="#e2e8f0" borderRadius="2xl" mb={4} p={6}>
        <Heading fontSize="1.05rem" mb={3}>
          LEGO Mindstorms EV3 連携状況
        </Heading>
        <Text color="#64748b" fontSize="0.9rem" mb={3}>
          EV3 のポート 1 / 2 / 3 のタッチセンサー押下個数が、
          「梅田ステーション東」の空き状況にリアルタイム反映されます。
        </Text>

        <HStack gap={3} mb={2}>
          <Badge
            bg={ev3Status ? "#dcfce7" : "#e2e8f0"}
            color={ev3Status ? "#166534" : "#475569"}
            px={3}
            py={1.5}
          >
            {ev3Status ? "EV3 モニタ受信中" : "EV3 モニタ未受信"}
          </Badge>
          {ev3Status ? (
            <Text color="#64748b" fontSize="0.85rem">
              押下数: <b>{pressedCount}</b> / {TOTAL_SLOTS} / 空き:{" "}
              <b>{ev3Status.available_count}</b> / 更新: {ev3Status.updated_at}
            </Text>
          ) : null}
        </HStack>

        {fetchHint ? (
          <Text color="#b45309" fontSize="0.85rem" mt={2}>
            {fetchHint}
          </Text>
        ) : null}
        {fetchError ? (
          <Text color="#dc2626" fontSize="0.85rem" mt={2}>
            {fetchError}
          </Text>
        ) : null}
      </Box>

      <Box bg="white" border="1px solid" borderColor="#e2e8f0" borderRadius="2xl" mb={4} p={6}>
        <HStack gap={2.5} mb={4}>
          <Button bg="#4f46e5" borderRadius="full" color="white" type="button">
            すべて
          </Button>
          <Button bg="#eef2ff" borderRadius="full" color="#4f46e5" type="button">
            空きあり
          </Button>
          <Button bg="#eef2ff" borderRadius="full" color="#4f46e5" type="button">
            屋根あり
          </Button>
        </HStack>
        <SimpleGrid columns={{ base: 1, lg: 2 }} gap={3.5}>
          {lots.map((lot) => {
            const palette = statusColor(lot.status);
            return (
              <Box border="1px solid" borderColor="#e2e8f0" borderRadius="lg" key={lot.id} p={3.5}>
                <HStack justify="space-between">
                  <Heading as="h3" fontSize="md">
                    {lot.name}
                  </Heading>
                  {lot.isEv3Linked ? (
                    <Badge bg="#ede9fe" color="#5b21b6" px={2} py={0.5}>
                      EV3 連携
                    </Badge>
                  ) : null}
                </HStack>
                <HStack mt={2}>
                  <Badge bg={palette.bg} color={palette.color} px={2.5} py={1}>
                    {lot.status}
                  </Badge>
                  <Text color="#64748b">{lot.walk}</Text>
                </HStack>
              </Box>
            );
          })}
        </SimpleGrid>
      </Box>
    </Layout>
  );
};

export default LotsComponent;
