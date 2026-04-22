import {
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Input,
  SimpleGrid,
  Text,
} from "@chakra-ui/react";
import type { ChangeEvent, FC } from "react";
import { useState } from "react";
import { fetchParkingStatus, type ParkingStatus, postParkingStatus } from "@/api/parking-status";
import Layout from "@/layouts/layout";

const mockLots = [
  { id: 1, name: "梅田ステーション東", status: "空きあり", walk: "徒歩 4分" },
  { id: 2, name: "中之島ゲート", status: "残りわずか", walk: "徒歩 8分" },
  { id: 3, name: "本町サイクルデッキ", status: "満車", walk: "徒歩 3分" },
];

const LotsComponent: FC = () => {
  const [parkingLotIdText, setParkingLotIdText] = useState("1");
  const [availableCountText, setAvailableCountText] = useState("12");
  const [statusData, setStatusData] = useState<ParkingStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const parkingLotId = Number(parkingLotIdText);
  const availableCount = Number(availableCountText);

  const handleParkingLotIdChange = (event: ChangeEvent<HTMLInputElement>) => {
    setParkingLotIdText(event.target.value);
  };

  const handleAvailableCountChange = (event: ChangeEvent<HTMLInputElement>) => {
    setAvailableCountText(event.target.value);
  };

  const handlePost = async () => {
    setErrorMessage("");
    if (!Number.isInteger(parkingLotId) || parkingLotId <= 0) {
      setErrorMessage("parkingLotId は 1以上の整数を入力してください。");
      return;
    }
    if (!Number.isInteger(availableCount) || availableCount < 0) {
      setErrorMessage("availableCount は 0以上の整数を入力してください。");
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await postParkingStatus({
        parking_lot_id: parkingLotId,
        available_count: availableCount,
      });
      setStatusData(data);
    } catch {
      setErrorMessage("POST /api/iot/parking-status の疎通に失敗しました。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGet = async () => {
    setErrorMessage("");
    if (!Number.isInteger(parkingLotId) || parkingLotId <= 0) {
      setErrorMessage("parkingLotId は 1以上の整数を入力してください。");
      return;
    }

    setIsLoading(true);
    try {
      const data = await fetchParkingStatus(parkingLotId);
      setStatusData(data);
    } catch {
      setErrorMessage("GET /api/parking-statuses/:parkingLotId の疎通に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout title="駐輪場一覧" subtitle="条件でフィルタしながら駐輪場を探せます">
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
          {mockLots.map((lot) => (
            <Box border="1px solid" borderColor="#e2e8f0" borderRadius="lg" key={lot.id} p={3.5}>
              <Heading as="h3" fontSize="md">
                {lot.name}
              </Heading>
              <Text color="#64748b" mt={2}>
                状態: {lot.status} / {lot.walk}
              </Text>
            </Box>
          ))}
        </SimpleGrid>
      </Box>

      <Box bg="white" border="1px solid" borderColor="#e2e8f0" borderRadius="2xl" p={6}>
        <Heading fontSize="1.05rem" mb={4}>
          駐輪場ステータス取得
        </Heading>
        <Flex direction={{ base: "column", md: "row" }} gap={3} mb={3}>
          <Input
            onChange={handleParkingLotIdChange}
            placeholder="parkingLotId (例: 1)"
            value={parkingLotIdText}
          />
          <Input
            onChange={handleAvailableCountChange}
            placeholder="availableCount (例: 12)"
            value={availableCountText}
          />
        </Flex>
        <Flex gap={3} mb={4}>
          <Button disabled={isSubmitting} onClick={() => void handlePost()}>
            IoT送信（POST）
          </Button>
          <Button disabled={isLoading} onClick={() => void handleGet()} variant="outline">
            最新取得（GET）
          </Button>
        </Flex>

        {errorMessage ? (
          <Text color="#dc2626" fontSize="0.9rem" mb={3}>
            {errorMessage}
          </Text>
        ) : null}

        <Box bg="#f8fafc" borderRadius="12px" p={4}>
          <Text fontSize="0.9rem" mb={2}>
            最新状態
          </Text>
          <Badge bg="#ede9fe" color="#5b21b6" px={3} py={1.5}>
            parkingLotId: {statusData?.parking_lot_id ?? "-"}
          </Badge>
          <Badge bg="#dbeafe" color="#1d4ed8" ml={2} px={3} py={1.5}>
            availableCount: {statusData?.available_count ?? "-"}
          </Badge>
          <Text color="#64748b" fontSize="0.82rem" mt={2}>
            updatedAt: {statusData?.updated_at ?? "-"}
          </Text>
        </Box>
      </Box>
    </Layout>
  );
};

export default LotsComponent;
