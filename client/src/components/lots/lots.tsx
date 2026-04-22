import { Box, Button, Heading, HStack, SimpleGrid, Text } from "@chakra-ui/react";
import type { FC } from "react";
import AppLayout from "@/components/app-layout/app-layout";

const mockLots = [
  { id: 1, name: "梅田ステーション東", status: "空きあり", walk: "徒歩 4分" },
  { id: 2, name: "中之島ゲート", status: "残りわずか", walk: "徒歩 8分" },
  { id: 3, name: "本町サイクルデッキ", status: "満車", walk: "徒歩 3分" },
];

const LotsComponent: FC = () => {
  return (
    <AppLayout title="駐輪場一覧" subtitle="条件でフィルタしながら駐輪場を探せます">
      <Box bg="white" border="1px solid" borderColor="#e2e8f0" borderRadius="2xl" p={6}>
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
    </AppLayout>
  );
};

export default LotsComponent;
