import type { FC } from "react";
import { useState } from "react";
import AppLayout from "@/components/app-layout/app-layout";

const ReservationsComponent: FC = () => {
  const [tab, setTab] = useState<"active" | "history">("active");

  return (
    <AppLayout title="予約管理" subtitle="予約中・履歴の確認ができます">
      <section className="page-card">
        <div className="tab-row">
          <button
            className={`tab-btn${tab === "active" ? " active" : ""}`}
            onClick={() => setTab("active")}
            type="button"
          >
            予約中
          </button>
          <button
            className={`tab-btn${tab === "history" ? " active" : ""}`}
            onClick={() => setTab("history")}
            type="button"
          >
            履歴
          </button>
        </div>

        {tab === "active" ? (
          <div className="list-grid">
            <article className="list-item">
              <h3>中之島ゲート</h3>
              <p style={{ color: "var(--text-secondary)", marginTop: "8px" }}>
                2026/04/22 18:30 まで利用予定
              </p>
            </article>
          </div>
        ) : (
          <div className="list-grid">
            <article className="list-item">
              <h3>本町サイクルデッキ</h3>
              <p style={{ color: "var(--text-secondary)", marginTop: "8px" }}>
                2026/04/20 利用済み
              </p>
            </article>
          </div>
        )}
      </section>
    </AppLayout>
  );
};

export default ReservationsComponent;
