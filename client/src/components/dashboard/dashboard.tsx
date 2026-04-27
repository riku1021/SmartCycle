import { Box, Flex, Grid, GridItem, Heading, Text, Spinner, Center } from "@chakra-ui/react";
import { useQuery } from "@tanstack/react-query";
import type { FC } from "react";
import { useEffect, useState } from "react";
import {
  FaBicycle,
  FaCalendarCheck,
  FaChartLine,
  FaTriangleExclamation,
} from "react-icons/fa6";
import { fetchDashboardSummary } from "@/api/parking-status";
import Layout from "@/layouts/layout";

/* ── SVG 棒グラフ ── */
const BarChartSvg: FC<{ data: { name: string; shortName: string; value: number }[] }> = ({ data }) => {
  const maxValue = Math.max(...data.map((d) => d.value), 200); // 最小でも200を上限とする
  const chartHeight = 160;
  const barWidth = 44;
  const gap = 56;
  const leftPad = 45;
  const totalWidth = data.length * (barWidth + gap);
  const yTicks = [0, 50, 100, 150, 200];

  return (
    <svg
      viewBox={`0 0 ${leftPad + totalWidth + 20} ${chartHeight + 90}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Y 軸の目盛り線とラベル */}
      {yTicks.map((tick) => {
        const y = chartHeight - (tick / maxValue) * chartHeight;
        return (
          <g key={tick}>
            <line
              x1={leftPad}
              y1={y}
              x2={leftPad + totalWidth}
              y2={y}
              stroke="#e2e8f0"
              strokeWidth={1}
            />
            <text
              x={leftPad - 8}
              y={y + 4}
              textAnchor="end"
              fontSize={11}
              fill="#94a3b8"
            >
              {tick}
            </text>
          </g>
        );
      })}
      {/* 棒グラフ */}
      {data.map((d, i) => {
        const barHeight = (d.value / maxValue) * chartHeight;
        const x = leftPad + i * (barWidth + gap) + gap / 2;
        const y = chartHeight - barHeight;
        const labelX = x + barWidth / 2;
        const labelY = chartHeight + 14;
        return (
          <g key={d.name}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={5}
              ry={5}
              fill="#6366f1"
            />
            {/* 値ラベル */}
            <text
              x={x + barWidth / 2}
              y={y - 6}
              textAnchor="middle"
              fontSize={11}
              fontWeight={600}
              fill="#4f46e5"
            >
              {d.value}
            </text>
            {/* X軸ラベル */}
            <text
              x={labelX}
              y={labelY}
              textAnchor="end"
              fontSize={10}
              fill="#64748b"
              transform={`rotate(-40, ${labelX}, ${labelY})`}
            >
              {d.shortName}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

/* ── SVG ドーナツチャート ── */
const DonutChartSvg: FC<{ data: { name: string; value: number; color: string }[] }> = ({ data }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  const cx = 80;
  const cy = 80;
  const outerR = 70;
  const innerR = 48;

  if (total === 0) {
    return (
      <svg viewBox="0 0 160 160" width="160" height="160">
        <circle
          cx={cx}
          cy={cy}
          r={(outerR + innerR) / 2}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={outerR - innerR}
        />
      </svg>
    );
  }

  let cumulativeAngle = -90;
  const arcs = data.map((item) => {
    const angle = (item.value / total) * 360;
    const startAngle = cumulativeAngle;
    cumulativeAngle += angle;
    return { ...item, startAngle, angle };
  });

  const describeArc = (
    startAngle: number,
    endAngle: number,
    r1: number,
    r2: number,
  ) => {
    const toRad = (a: number) => (a * Math.PI) / 180;
    const x1 = cx + r2 * Math.cos(toRad(startAngle));
    const y1 = cy + r2 * Math.sin(toRad(startAngle));
    const x2 = cx + r2 * Math.cos(toRad(endAngle));
    const y2 = cy + r2 * Math.sin(toRad(endAngle));
    const x3 = cx + r1 * Math.cos(toRad(endAngle));
    const y3 = cy + r1 * Math.sin(toRad(endAngle));
    const x4 = cx + r1 * Math.cos(toRad(startAngle));
    const y4 = cy + r1 * Math.sin(toRad(startAngle));
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return [
      `M ${x1} ${y1}`,
      `A ${r2} ${r2} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${x3} ${y3}`,
      `A ${r1} ${r1} 0 ${largeArc} 0 ${x4} ${y4}`,
      "Z",
    ].join(" ");
  };

  return (
    <svg viewBox="0 0 160 160" width="160" height="160">
      {arcs
        .filter((a) => a.angle > 0)
        .map((a) => (
          <path
            key={a.name}
            d={describeArc(
              a.startAngle,
              a.startAngle + a.angle,
              innerR,
              outerR,
            )}
            fill={a.color}
          />
        ))}
    </svg>
  );
};

/* ── メインコンポーネント ── */
const DashboardComponent: FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["dashboardSummary"],
    queryFn: fetchDashboardSummary,
    refetchInterval: 5000, // 5秒ごとに更新
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = `${currentTime.getFullYear()}年${currentTime.getMonth() + 1}月${currentTime.getDate()}日 ${String(currentTime.getHours()).padStart(2, "0")}:${String(currentTime.getMinutes()).padStart(2, "0")}:${String(currentTime.getSeconds()).padStart(2, "0")}`;

  if (isLoading) {
    return (
      <Layout subtitle={formattedDate} title="ダッシュボード">
        <Center h="50vh">
          <Spinner color="#4f46e5" size="xl" thickness="4px" />
        </Center>
      </Layout>
    );
  }

  if (isError) {
    return (
      <Layout subtitle={formattedDate} title="ダッシュボード">
        <Center h="50vh">
          <Text color="red.500">
            データの取得に失敗しました: {error instanceof Error ? error.message : "不明なエラー"}
          </Text>
        </Center>
      </Layout>
    );
  }

  const summary = data!;

  return (
    <Layout subtitle={formattedDate} title="ダッシュボード">
      <Grid
        gap={5}
        templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }}
        w="100%"
      >
        {/* ── KPI Card 1: 全体稼働率 ── */}
        <GridItem
          bg="linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)"
          borderRadius="20px"
          boxShadow="0 8px 24px rgba(79, 70, 229, 0.35)"
          color="white"
          p={6}
        >
          <Flex justify="space-between">
            <Text fontSize="0.85rem" fontWeight={600} opacity={0.9}>
              全体稼働率
            </Text>
            <Box
              alignItems="center"
              bg="rgba(255,255,255,0.2)"
              borderRadius="10px"
              display="flex"
              justifyContent="center"
              p={2}
            >
              <FaChartLine size={18} />
            </Box>
          </Flex>
          <Heading fontSize="3rem" fontWeight={800} mt={3}>
            {summary.total_occupancy_rate}{" "}
            <Text as="span" fontSize="1.4rem" fontWeight={700}>
              %
            </Text>
          </Heading>
          <Text fontSize="0.8rem" mt={1} opacity={0.75}>
            {summary.used_count} / {summary.total_capacity}台使用中
          </Text>
        </GridItem>

        {/* ── KPI Card 2: 満車 ── */}
        <GridItem
          bg="white"
          border="1px solid"
          borderColor="#f1f5f9"
          borderRadius="20px"
          p={6}
        >
          <Flex align="center" gap={4}>
            <Box
              alignItems="center"
              bg="#fff1f2"
              borderRadius="14px"
              color="#ef4444"
              display="flex"
              justifyContent="center"
              p={3}
            >
              <FaBicycle size={24} />
            </Box>
            <Box>
              <Text color="#64748b" fontSize="0.85rem" fontWeight={600}>
                満車
              </Text>
              <Heading color="#0f172a" fontSize="2.4rem" fontWeight={800}>
                {summary.full_lots_count}
              </Heading>
            </Box>
          </Flex>
          <Text color="#94a3b8" fontSize="0.8rem" mt={4}>
            全{summary.total_lots_count}駐輪場中
          </Text>
        </GridItem>

        {/* ── KPI Card 3: アクティブ予約 ── */}
        <GridItem
          bg="white"
          border="1px solid"
          borderColor="#f1f5f9"
          borderRadius="20px"
          p={6}
        >
          <Flex align="center" gap={4}>
            <Box
              alignItems="center"
              bg="#fef3c7"
              borderRadius="14px"
              color="#f59e0b"
              display="flex"
              justifyContent="center"
              p={3}
            >
              <FaCalendarCheck size={24} />
            </Box>
            <Box>
              <Text color="#64748b" fontSize="0.85rem" fontWeight={600}>
                アクティブ予約
              </Text>
              <Heading color="#0f172a" fontSize="2.4rem" fontWeight={800}>
                {summary.active_reservations_count}
              </Heading>
            </Box>
          </Flex>
          <Text color="#94a3b8" fontSize="0.8rem" mt={4}>
            現在進行中
          </Text>
        </GridItem>

        {/* ── KPI Card 4: 機器異常 ── */}
        <GridItem
          bg="white"
          border="1px solid"
          borderColor="#f1f5f9"
          borderRadius="20px"
          p={6}
        >
          <Flex align="center" direction="column" justify="center" py={2}>
            <Box
              alignItems="center"
              bg={summary.abnormal_devices_count > 0 ? "#fff1f2" : "#dcfce7"}
              borderRadius="16px"
              color={summary.abnormal_devices_count > 0 ? "#ef4444" : "#22c55e"}
              display="flex"
              justifyContent="center"
              p={4}
            >
              <FaTriangleExclamation size={28} />
            </Box>
            <Text color="#64748b" fontSize="0.85rem" fontWeight={600} mt={3}>
              機器異常
            </Text>
            <Heading color="#0f172a" fontSize="2.8rem" fontWeight={800} mt={1}>
              {summary.abnormal_devices_count}
            </Heading>
            <Text
              color={summary.abnormal_devices_count > 0 ? "#ef4444" : "#22c55e"}
              fontSize="0.75rem"
              fontWeight={600}
              mt={1}
            >
              {summary.abnormal_devices_count > 0 ? `${summary.abnormal_devices_count}台の異常` : "全機器正常"}
            </Text>
          </Flex>
        </GridItem>

        {/* ── Chart: 駐輪場別稼働率 ── */}
        <GridItem
          bg="white"
          border="1px solid"
          borderColor="#f1f5f9"
          borderRadius="20px"
          p={6}
        >
          <Heading color="#0f172a" fontSize="1rem" fontWeight={700} mb={4}>
            駐輪場別稼働率
          </Heading>
          <Box h="260px" w="100%">
            <BarChartSvg data={summary.occupancy_by_lot} />
          </Box>
        </GridItem>

        {/* ── Chart: ステータス分布 ── */}
        <GridItem
          bg="white"
          border="1px solid"
          borderColor="#f1f5f9"
          borderRadius="20px"
          p={6}
        >
          <Heading color="#0f172a" fontSize="1rem" fontWeight={700} mb={4}>
            ステータス分布
          </Heading>
          <Flex align="center" direction="column" justify="center">
            <DonutChartSvg data={summary.status_distribution} />
            <Flex gap={6} mt={4}>
              {summary.status_distribution.map((item) => (
                <Flex key={item.name} align="center" gap={2}>
                  <Box
                    bg={item.color}
                    borderRadius="full"
                    flexShrink={0}
                    h="10px"
                    w="10px"
                  />
                  <Text color="#64748b" fontSize="0.8rem">
                    {item.name}
                  </Text>
                </Flex>
              ))}
            </Flex>
          </Flex>
        </GridItem>
      </Grid>
    </Layout>
  );
};

export default DashboardComponent;

