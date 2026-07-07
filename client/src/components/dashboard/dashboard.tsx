import { useQuery } from "@tanstack/react-query";
import { useLocation } from "@tanstack/react-router";
import type { FC } from "react";
import { useState } from "react";
import { FaBars } from "react-icons/fa6";
import { type DashboardSummary, fetchDashboardSummary } from "@/api/parking-status";
import MapSideDrawer from "@/components/map/MapSideDrawer";

type LotSummary = DashboardSummary["occupancy_by_lot"][number];
type LotOccupancyRate = {
  name: string;
  short_name: string;
  occupancy_rate: number;
};

const calculateOccupancyRate = (lot: LotSummary) => {
  if (lot.total_spots <= 0) return 0;
  const rate = (lot.value / lot.total_spots) * 100;
  return Math.min(100, Math.max(0, Math.round(rate)));
};

const isFullLot = (lot: LotSummary) => {
  if (lot.total_spots <= 0) return false;
  const availableSpots = Math.max(lot.total_spots - lot.value, 0);
  return availableSpots === 0 || availableSpots < lot.total_spots * 0.05;
};

/* ── SVG 棒グラフ ── */
const BarChartSvg: FC<{ data: LotOccupancyRate[] }> = ({ data }) => {
  const maxValue = 100;
  const chartHeight = 170;
  const barWidth = 48;
  const gap = 64;
  const leftPad = 120;
  const rightPad = 90;
  const bottomPad = 120;
  const totalWidth = data.length * (barWidth + gap);
  const chartWidth = Math.max(leftPad + totalWidth + rightPad, 720);
  const chartViewHeight = chartHeight + bottomPad;
  const yTicks = [0, 25, 50, 75, 100];

  if (data.length === 0) {
    return (
      <svg
        viewBox="0 0 320 180"
        width="100%"
        height="100%"
        role="img"
        aria-labelledby="bar-chart-empty-title"
      >
        <title id="bar-chart-empty-title">データなしの駐輪場別稼働率グラフ</title>
        <text x="160" y="90" textAnchor="middle" fontSize={13} fill="var(--text-secondary)">
          データがありません
        </text>
      </svg>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${chartWidth} ${chartViewHeight}`}
      width={chartWidth}
      height="100%"
      className="occupancy-chart-svg"
      role="img"
      aria-labelledby="bar-chart-title"
    >
      <title id="bar-chart-title">駐輪場別稼働率の棒グラフ</title>
      {yTicks.map((tick) => {
        const y = chartHeight - (tick / maxValue) * chartHeight;
        return (
          <g key={tick}>
            <line
              x1={leftPad}
              y1={y}
              x2={leftPad + totalWidth}
              y2={y}
              stroke="var(--border-color)"
              strokeWidth={1}
            />
            <text x={leftPad - 8} y={y + 4} textAnchor="end" fontSize={11} fill="#94a3b8">
              {tick}%
            </text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const barHeight = (d.occupancy_rate / maxValue) * chartHeight;
        const x = leftPad + i * (barWidth + gap) + gap / 2;
        const y = chartHeight - barHeight;
        const labelX = x + barWidth / 2;
        const labelY = chartHeight + 28;
        return (
          <g key={d.name}>
            <rect x={x} y={y} width={barWidth} height={barHeight} rx={5} ry={5} fill="#6366f1" />
            <text
              x={x + barWidth / 2}
              y={y - 6}
              textAnchor="middle"
              fontSize={11}
              fontWeight={600}
              fill="#4f46e5"
            >
              {d.occupancy_rate}%
            </text>
            <text
              x={labelX}
              y={labelY}
              textAnchor="end"
              fontSize={10}
              fill="var(--text-secondary)"
              transform={`rotate(-35, ${labelX}, ${labelY})`}
            >
              {d.short_name}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

const DashboardComponent: FC = () => {
  const location = useLocation();
  const searchStr = location.searchStr;
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  let activeScreen = "dashboard";
  if (searchStr.includes("tab=management")) activeScreen = "management";
  if (searchStr.includes("tab=reports")) activeScreen = "reports";

  const { data, isLoading } = useQuery({
    queryKey: ["dashboardSummary"],
    queryFn: fetchDashboardSummary,
    refetchInterval: 5000,
  });

  const summary = data || {
    total_occupancy_rate: 0,
    used_count: 0,
    total_capacity: 0,
    full_lots_count: 0,
    total_lots_count: 0,
    active_reservations_count: 0,
    abnormal_devices_count: 0,
    occupancy_by_lot: [],
    status_distribution: [],
  };
  const lotOccupancyRates = summary.occupancy_by_lot.map((lot) => ({
    name: lot.name,
    short_name: lot.short_name,
    occupancy_rate: calculateOccupancyRate(lot),
  }));
  const fullLots = summary.occupancy_by_lot.filter(isFullLot);

  // 予測収益の簡単な試算 (利用台数 * 平均単価 * 24時間 * 30日)
  // より正確な計算は別APIになるかもしれないが、今回はモックの代わりに試算式を用いる
  const avgPrice =
    summary.occupancy_by_lot.length > 0
      ? summary.occupancy_by_lot.reduce((acc, lot) => acc + lot.price_per_hour, 0) /
        summary.occupancy_by_lot.length
      : 100;
  const estimatedRevenue = summary.used_count * avgPrice * 24 * 30;
  const formattedRevenue = new Intl.NumberFormat("ja-JP").format(estimatedRevenue);

  return (
    <div className="dashboard" style={{ display: "block" }}>
      <MapSideDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

      <main className="content" style={{ width: "100%" }}>
        {activeScreen === "dashboard" && (
          <div id="screen-dashboard" className="admin-screen">
            <header style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <button
                type="button"
                className="top-action-btn"
                onClick={() => setIsDrawerOpen(true)}
                aria-label="メニューを開く"
                style={{ width: "42px", height: "42px", flexShrink: 0, position: "static" }}
              >
                <FaBars />
              </button>
              <h1 style={{ margin: 0 }}>ダッシュボード</h1>
              <div className="user-info">システム管理者</div>
            </header>

            <div className="dashboard-stack">
              <div className="card">
                <h3>稼働率</h3>
                <div className="value">{isLoading ? "--" : `${summary.total_occupancy_rate}%`}</div>
              </div>

              <div className="card">
                <h3>満車リスト</h3>
                {isLoading ? (
                  <div className="dashboard-empty-state">読み込み中です</div>
                ) : fullLots.length > 0 ? (
                  <div className="full-lot-list">
                    {fullLots.map((lot) => (
                      <div className="full-lot-row" key={lot.id}>
                        <div>
                          <div className="full-lot-name">{lot.name}</div>
                        </div>
                        <span className="full-lot-badge">満車</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="dashboard-empty-state">現在、満車の駐輪場はありません</div>
                )}
              </div>

              <div className="chart-container card">
                <h3>駐輪場別稼働率</h3>
                <div className="occupancy-chart-scroll">
                  <BarChartSvg data={lotOccupancyRates} />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeScreen === "management" && (
          <div id="screen-management" className="admin-screen">
            <header style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <button
                type="button"
                className="top-action-btn"
                onClick={() => setIsDrawerOpen(true)}
                aria-label="メニューを開く"
                style={{ width: "42px", height: "42px", flexShrink: 0, position: "static" }}
              >
                <FaBars />
              </button>
              <h1 style={{ margin: 0, flex: 1 }}>駐輪場管理</h1>
              <button
                type="button"
                className="primary-btn"
                onClick={() => alert("新規登録機能は開発中です")}
              >
                + 新規駐輪場を追加
              </button>
            </header>
            <div className="card">
              <table id="management-table">
                <thead>
                  <tr>
                    <th>名称</th>
                    <th>位置（緯度, 経度）</th>
                    <th>収容台数</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.occupancy_by_lot.map((lot) => (
                    <tr key={lot.id}>
                      <td>{lot.name}</td>
                      <td>
                        {lot.latitude.toFixed(5)}, {lot.longitude.toFixed(5)}
                      </td>
                      <td>{lot.total_spots}</td>
                      <td>
                        <button type="button" className="secondary-btn">
                          編集
                        </button>
                      </td>
                    </tr>
                  ))}
                  {summary.occupancy_by_lot.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center", color: "#94a3b8" }}>
                        データがありません
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeScreen === "reports" && (
          <div id="screen-reports" className="admin-screen">
            <header style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <button
                type="button"
                className="top-action-btn"
                onClick={() => setIsDrawerOpen(true)}
                aria-label="メニューを開く"
                style={{ width: "42px", height: "42px", flexShrink: 0, position: "static" }}
              >
                <FaBars />
              </button>
              <h1 style={{ margin: 0, flex: 1 }}>統計レポート</h1>
            </header>
            <div className="report-grid">
              <div className="card">
                <h3>稼働率分布</h3>
                <div
                  style={{
                    height: "300px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#94a3b8",
                  }}
                >
                  （データ収集中）
                </div>
              </div>
              <div className="card">
                <h3>収益予測 (月間)</h3>
                <div className="value">¥{formattedRevenue}</div>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "8px" }}>
                  ※現在の稼働率に基づいた試算
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default DashboardComponent;
