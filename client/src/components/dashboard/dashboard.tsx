import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { FC } from "react";
import { useState } from "react";
import { fetchDashboardSummary } from "@/api/parking-status";

/* ── SVG 棒グラフ ── */
const BarChartSvg: FC<{ data: { name: string; shortName: string; value: number }[] }> = ({
  data,
}) => {
  const maxValue = Math.max(...data.map((d) => d.value), 200);
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
      role="img"
      aria-labelledby="bar-chart-title"
    >
      <title id="bar-chart-title">エリア別稼働率の棒グラフ</title>
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
            <text x={leftPad - 8} y={y + 4} textAnchor="end" fontSize={11} fill="#94a3b8">
              {tick}
            </text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const barHeight = (d.value / maxValue) * chartHeight;
        const x = leftPad + i * (barWidth + gap) + gap / 2;
        const y = chartHeight - barHeight;
        const labelX = x + barWidth / 2;
        const labelY = chartHeight + 14;
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
              {d.value}
            </text>
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
const DonutChartSvg: FC<{ data: { name: string; value: number; color: string }[] }> = ({
  data,
}) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  const cx = 80,
    cy = 80,
    outerR = 70,
    innerR = 48;
  if (total === 0) {
    return (
      <svg
        viewBox="0 0 160 160"
        width="160"
        height="160"
        role="img"
        aria-labelledby="donut-chart-empty-title"
      >
        <title id="donut-chart-empty-title">データなしのドーナツチャート</title>
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
  const describeArc = (startAngle: number, endAngle: number, r1: number, r2: number) => {
    const toRad = (a: number) => (a * Math.PI) / 180;
    const x1 = cx + r2 * Math.cos(toRad(startAngle)),
      y1 = cy + r2 * Math.sin(toRad(startAngle));
    const x2 = cx + r2 * Math.cos(toRad(endAngle)),
      y2 = cy + r2 * Math.sin(toRad(endAngle));
    const x3 = cx + r1 * Math.cos(toRad(endAngle)),
      y3 = cy + r1 * Math.sin(toRad(endAngle));
    const x4 = cx + r1 * Math.cos(toRad(startAngle)),
      y4 = cy + r1 * Math.sin(toRad(startAngle));
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r2} ${r2} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${r1} ${r1} 0 ${largeArc} 0 ${x4} ${y4} Z`;
  };
  return (
    <svg
      viewBox="0 0 160 160"
      width="160"
      height="160"
      role="img"
      aria-labelledby="donut-chart-title"
    >
      <title id="donut-chart-title">ステータス分布のドーナツチャート</title>
      {arcs
        .filter((a) => a.angle > 0)
        .map((a) => (
          <path
            key={a.name}
            d={describeArc(a.startAngle, a.startAngle + a.angle, innerR, outerR)}
            fill={a.color}
          />
        ))}
    </svg>
  );
};

const DashboardComponent: FC = () => {
  const navigate = useNavigate();
  const [activeScreen, setActiveScreen] = useState("dashboard");

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

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <h2>SmartCycle Admin</h2>
        <nav id="admin-nav">
          <button
            type="button"
            className={`nav-item ${activeScreen === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveScreen("dashboard")}
          >
            ダッシュボード
          </button>
          <button
            type="button"
            className={`nav-item ${activeScreen === "management" ? "active" : ""}`}
            onClick={() => setActiveScreen("management")}
          >
            駐輪場管理
          </button>
          <button
            type="button"
            className={`nav-item ${activeScreen === "reports" ? "active" : ""}`}
            onClick={() => setActiveScreen("reports")}
          >
            統計レポート
          </button>
          <button type="button" className="nav-item" onClick={() => void navigate({ to: "/map" })}>
            ユーザーマップ
          </button>
        </nav>
      </aside>

      <main className="content">
        {activeScreen === "dashboard" && (
          <div id="screen-dashboard" className="admin-screen">
            <header>
              <h1>ダッシュボード</h1>
              <div className="user-info">システム管理者</div>
            </header>

            <div className="kpi-cards">
              <div className="card">
                <h3>稼働率（全体）</h3>
                <div className="value">{isLoading ? "--" : `${summary.total_occupancy_rate}%`}</div>
              </div>
              <div className="card">
                <h3>満車状態の駐輪場</h3>
                <div className="value">{isLoading ? "--" : `${summary.full_lots_count} 箇所`}</div>
              </div>
              <div className="card">
                <h3>アクティブデバイス</h3>
                <div
                  className="value"
                  style={{ color: summary.abnormal_devices_count > 0 ? "#ef4444" : "inherit" }}
                >
                  {isLoading
                    ? "--"
                    : summary.abnormal_devices_count > 0
                      ? `${summary.abnormal_devices_count}台異常`
                      : "100% (正常)"}
                </div>
              </div>
            </div>

            <div className="charts-section">
              <div className="chart-container card">
                <h3>エリア別稼働率</h3>
                <div style={{ height: "300px", marginTop: "16px" }}>
                  <BarChartSvg data={summary.occupancy_by_lot} />
                </div>
              </div>
            </div>

            <div className="table-section card">
              <h3>ステータス分布</h3>
              <div
                style={{ display: "flex", alignItems: "center", gap: "24px", marginTop: "16px" }}
              >
                <DonutChartSvg data={summary.status_distribution} />
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {summary.status_distribution.map((item) => (
                    <div
                      key={item.name}
                      style={{ display: "flex", alignItems: "center", gap: "8px" }}
                    >
                      <div
                        style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          backgroundColor: item.color,
                        }}
                      />
                      <span style={{ fontSize: "0.9rem", color: "#64748b" }}>{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeScreen === "management" && (
          <div id="screen-management" className="admin-screen">
            <header>
              <h1>駐輪場管理</h1>
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
                  <tr>
                    <td>梅田ステーション東</td>
                    <td>34.70631, 135.49887</td>
                    <td>50</td>
                    <td>
                      <button type="button" className="secondary-btn">
                        編集
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td>中之島ゲート</td>
                    <td>34.69392, 135.50160</td>
                    <td>30</td>
                    <td>
                      <button type="button" className="secondary-btn">
                        編集
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeScreen === "reports" && (
          <div id="screen-reports" className="admin-screen">
            <header>
              <h1>統計レポート</h1>
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
                <div className="value">¥245,000</div>
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
