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
      <section className="page-card">
        <div className="tab-row">
          <button className="tab-btn active" type="button">
            すべて
          </button>
          <button className="tab-btn" type="button">
            空きあり
          </button>
          <button className="tab-btn" type="button">
            屋根あり
          </button>
        </div>
        <div className="list-grid">
          {mockLots.map((lot) => (
            <article className="list-item" key={lot.id}>
              <h3>{lot.name}</h3>
              <p style={{ color: "var(--text-secondary)", marginTop: "8px" }}>
                状態: {lot.status} / {lot.walk}
              </p>
            </article>
          ))}
        </div>
      </section>
    </AppLayout>
  );
};

export default LotsComponent;
