import type { FC } from "react";
import AppLayout from "@/components/app-layout/app-layout";

const DashboardComponent: FC = () => {
  return (
    <AppLayout title="管理画面" subtitle="現在の駐輪状況を確認できます">
      <div className="kpi-grid">
        <article className="kpi-card primary">
          <p>全体稼働率</p>
          <strong>74%</strong>
        </article>
        <article className="kpi-card">
          <p>空き台数</p>
          <strong>112台</strong>
        </article>
        <article className="kpi-card">
          <p>本日の予約</p>
          <strong>39件</strong>
        </article>
        <article className="kpi-card">
          <p>平均利用時間</p>
          <strong>2.1h</strong>
        </article>
      </div>
      <section className="page-card">
        <h3>混雑トレンド（ダミー表示）</h3>
        <p style={{ color: "var(--text-secondary)", marginTop: "8px" }}>
          sample のグラフ領域に相当。API 接続フェーズで実データへ差し替えます。
        </p>
      </section>
    </AppLayout>
  );
};

export default DashboardComponent;
