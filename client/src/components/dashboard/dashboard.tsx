import { Box, Grid, GridItem, Heading, Text } from "@chakra-ui/react";
import type { FC } from "react";
import AppLayout from "@/components/app-layout/app-layout";

const DashboardComponent: FC = () => {
  return (
    <AppLayout title="管理画面" subtitle="現在の駐輪状況を確認できます">
      <Grid gap={4} mb={4} templateColumns="repeat(auto-fit, minmax(220px, 1fr))">
        <GridItem
          bgGradient="linear(to-br, #4f46e5, #4338ca)"
          borderRadius="xl"
          color="white"
          p={5}
        >
          <Text>全体稼働率</Text>
          <Heading fontSize="1.9rem" mt={2}>
            74%
          </Heading>
        </GridItem>
        <GridItem bg="white" border="1px solid" borderColor="#e2e8f0" borderRadius="xl" p={5}>
          <Text>空き台数</Text>
          <Heading fontSize="1.9rem" mt={2}>
            112台
          </Heading>
        </GridItem>
        <GridItem bg="white" border="1px solid" borderColor="#e2e8f0" borderRadius="xl" p={5}>
          <Text>本日の予約</Text>
          <Heading fontSize="1.9rem" mt={2}>
            39件
          </Heading>
        </GridItem>
        <GridItem bg="white" border="1px solid" borderColor="#e2e8f0" borderRadius="xl" p={5}>
          <Text>平均利用時間</Text>
          <Heading fontSize="1.9rem" mt={2}>
            2.1h
          </Heading>
        </GridItem>
      </Grid>
      <Box bg="white" border="1px solid" borderColor="#e2e8f0" borderRadius="2xl" p={6}>
        <Heading as="h3" fontSize="lg">
          混雑トレンド（ダミー表示）
        </Heading>
        <Text color="#64748b" mt={2}>
          sample のグラフ領域に相当。API 接続フェーズで実データへ差し替えます。
        </Text>
      </Box>
    </AppLayout>
  );
};

export default DashboardComponent;
