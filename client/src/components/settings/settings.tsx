import { Box, Input, SimpleGrid, Text } from "@chakra-ui/react";
import type { FC } from "react";
import AppLayout from "@/components/app-layout/app-layout";

const SettingsComponent: FC = () => {
  return (
    <AppLayout title="設定" subtitle="プロフィールと通知設定を編集できます">
      <Box bg="white" border="1px solid" borderColor="#e2e8f0" borderRadius="2xl" p={6}>
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
          <Box>
            <Text color="#64748b" fontSize="0.9rem" mb={1.5}>
              表示名
            </Text>
            <Input defaultValue="サンプルユーザー" id="setting-name" />
          </Box>
          <Box>
            <Text color="#64748b" fontSize="0.9rem" mb={1.5}>
              よく使うエリア
            </Text>
            <Box
              as="select"
              border="1px solid #e2e8f0"
              borderRadius="10px"
              defaultValue="osaka"
              id="setting-area"
              p={2.5}
              width="100%"
            >
              <option value="osaka">大阪駅周辺</option>
              <option value="namba">なんば</option>
              <option value="honmachi">本町</option>
            </Box>
          </Box>
        </SimpleGrid>
      </Box>
    </AppLayout>
  );
};

export default SettingsComponent;
