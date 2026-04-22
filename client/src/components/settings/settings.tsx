import type { FC } from "react";
import AppLayout from "@/components/app-layout/app-layout";

const SettingsComponent: FC = () => {
  return (
    <AppLayout title="設定" subtitle="プロフィールと通知設定を編集できます">
      <section className="page-card">
        <div className="settings-grid">
          <div>
            <label htmlFor="setting-name">表示名</label>
            <input defaultValue="サンプルユーザー" id="setting-name" type="text" />
          </div>
          <div>
            <label htmlFor="setting-area">よく使うエリア</label>
            <select defaultValue="osaka" id="setting-area">
              <option value="osaka">大阪駅周辺</option>
              <option value="namba">なんば</option>
              <option value="honmachi">本町</option>
            </select>
          </div>
        </div>
      </section>
    </AppLayout>
  );
};

export default SettingsComponent;
