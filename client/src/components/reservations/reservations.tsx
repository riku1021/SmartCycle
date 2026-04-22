import { Box, Button, Heading, HStack, SimpleGrid, Text } from "@chakra-ui/react";
import type { FC } from "react";
import { useState } from "react";
import AppLayout from "@/components/app-layout/app-layout";

const ReservationsComponent: FC = () => {
  const [tab, setTab] = useState<"active" | "history">("active");

  return (
    <AppLayout title="予約管理" subtitle="予約中・履歴の確認ができます">
      <Box bg="white" border="1px solid" borderColor="#e2e8f0" borderRadius="2xl" p={6}>
        <HStack gap={2.5} mb={4}>
          <Button
            bg={tab === "active" ? "#4f46e5" : "#eef2ff"}
            borderRadius="full"
            color={tab === "active" ? "white" : "#4f46e5"}
            onClick={() => setTab("active")}
            type="button"
          >
            予約中
          </Button>
          <Button
            bg={tab === "history" ? "#4f46e5" : "#eef2ff"}
            borderRadius="full"
            color={tab === "history" ? "white" : "#4f46e5"}
            onClick={() => setTab("history")}
            type="button"
          >
            履歴
          </Button>
        </HStack>

        {tab === "active" ? (
          <SimpleGrid columns={{ base: 1, lg: 2 }} gap={3.5}>
            <Box border="1px solid" borderColor="#e2e8f0" borderRadius="lg" p={3.5}>
              <Heading as="h3" fontSize="md">
                中之島ゲート
              </Heading>
              <Text color="#64748b" mt={2}>
                2026/04/22 18:30 まで利用予定
              </Text>
            </Box>
          </SimpleGrid>
        ) : (
          <SimpleGrid columns={{ base: 1, lg: 2 }} gap={3.5}>
            <Box border="1px solid" borderColor="#e2e8f0" borderRadius="lg" p={3.5}>
              <Heading as="h3" fontSize="md">
                本町サイクルデッキ
              </Heading>
              <Text color="#64748b" mt={2}>
                2026/04/20 利用済み
              </Text>
            </Box>
          </SimpleGrid>
        )}
      </Box>
    </AppLayout>
  );
};

export default ReservationsComponent;
