import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FC } from "react";
import { useState } from "react";
import { fetchUsers, updateUserRole } from "@/api/auth";
import Layout from "@/layouts/layout";

const ROLE_LABELS: Record<string, string> = {
  admin: "管理者",
  dev: "開発者",
  operator: "駐輪場管理業者",
  user: "一般",
};

const ROLE_STYLE: Record<string, { bg: string; color: string }> = {
  admin: { bg: "#fee2e2", color: "#991b1b" },
  dev: { bg: "#dcfce7", color: "#166534" },
  operator: { bg: "#e0f2fe", color: "#075985" },
  user: { bg: "#f1f5f9", color: "#475569" },
};

const UsersComponent: FC = () => {
  const queryClient = useQueryClient();
  const {
    data: usersData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["usersList"],
    queryFn: fetchUsers,
  });

  const [searchUser, setSearchUser] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(
    null
  );
  const [editingId, setEditingId] = useState<string | null>(null);

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      updateUserRole(userId, role),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["usersList"] });
      setEditingId(null);
    },
  });

  const handleSort = (key: string) => {
    setSortConfig((prev) =>
      prev?.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
  };

  const sortIcon = (key: string) =>
    sortConfig?.key === key ? (sortConfig.direction === "asc" ? " ↑" : " ↓") : "";

  const thStyle: React.CSSProperties = {
    cursor: "pointer",
    padding: "12px 16px",
    textAlign: "left",
    borderBottom: "1px solid #e2e8f0",
    color: "#6b7280",
    fontWeight: 600,
    fontSize: "0.85rem",
    whiteSpace: "nowrap",
  };

  const tdStyle: React.CSSProperties = {
    padding: "12px 16px",
    borderBottom: "1px solid #e2e8f0",
    verticalAlign: "middle",
  };

  let filtered = (usersData ?? []).filter(
    (u) =>
      u.name.toLowerCase().includes(searchUser.toLowerCase()) ||
      u.email.toLowerCase().includes(searchUser.toLowerCase()) ||
      u.id.toLowerCase().includes(searchUser.toLowerCase())
  );

  if (sortConfig) {
    filtered = [...filtered].sort((a, b) => {
      const valA = (a as Record<string, unknown>)[sortConfig.key] as string;
      const valB = (b as Record<string, unknown>)[sortConfig.key] as string;
      if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }

  return (
    <Layout title="ユーザー一覧" subtitle="開発者用ユーザー管理">
      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
          overflow: "hidden",
        }}
      >
        {/* ヘッダー */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "20px 24px",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>登録ユーザー一覧</h2>
          <input
            type="text"
            placeholder="名前・メール・IDで検索..."
            value={searchUser}
            onChange={(e) => setSearchUser(e.target.value)}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              fontSize: "0.9rem",
              width: "220px",
            }}
          />
        </div>

        {/* エラー表示 */}
        {error && (
          <div style={{ color: "#ef4444", padding: "16px 24px" }}>
            ユーザーデータの取得に失敗しました。権限がないか、ネットワークエラーです。
          </div>
        )}

        {/* テーブル */}
        <div style={{ overflowX: "auto" }}>
          <table id="users-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={thStyle} onClick={() => handleSort("id")}>
                  ユーザーID{sortIcon("id")}
                </th>
                <th style={thStyle} onClick={() => handleSort("name")}>
                  ユーザー名{sortIcon("name")}
                </th>
                <th style={thStyle} onClick={() => handleSort("email")}>
                  メールアドレス{sortIcon("email")}
                </th>
                <th style={thStyle} onClick={() => handleSort("role")}>
                  権限{sortIcon("role")}
                </th>
                <th style={thStyle} onClick={() => handleSort("created_at")}>
                  作成日時{sortIcon("created_at")}
                </th>
                <th style={{ ...thStyle, cursor: "default" }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ ...tdStyle, textAlign: "center", color: "#94a3b8" }}>
                    読み込み中...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ ...tdStyle, textAlign: "center", color: "#94a3b8" }}>
                    該当するユーザーがいません
                  </td>
                </tr>
              ) : (
                filtered.map((user) => {
                  const style = ROLE_STYLE[user.role] ?? ROLE_STYLE.user;
                  const isEditing = editingId === user.id;
                  return (
                    <tr key={user.id} style={{ transition: "background 0.15s" }}>
                      {/* ID */}
                      <td
                        style={{
                          ...tdStyle,
                          fontFamily: "monospace",
                          fontSize: "0.8rem",
                          color: "#64748b",
                          maxWidth: "140px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={user.id}
                      >
                        {user.id}
                      </td>

                      {/* ユーザー名 */}
                      <td style={tdStyle}>{user.name}</td>

                      {/* メール */}
                      <td style={tdStyle}>{user.email}</td>

                      {/* 権限 */}
                      <td style={tdStyle}>
                        {user.is_fixed ? (
                          /* シードユーザー: バッジのみ表示、変更不可 */
                          <span
                            style={{
                              padding: "4px 10px",
                              borderRadius: "4px",
                              fontSize: "0.8rem",
                              backgroundColor: style.bg,
                              color: style.color,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            {ROLE_LABELS[user.role] ?? user.role}
                            <span style={{ fontSize: "0.7rem", opacity: 0.7 }}>🔒</span>
                          </span>
                        ) : isEditing ? (
                          /* 編集中: ドロップダウン */
                          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            <select
                              defaultValue={user.role}
                              id={`role-select-${user.id}`}
                              style={{
                                padding: "4px 8px",
                                borderRadius: "6px",
                                border: "1px solid #e2e8f0",
                                fontSize: "0.9rem",
                              }}
                            >
                              <option value="user">一般</option>
                              <option value="dev">開発者</option>
                              <option value="admin">管理者</option>
                            </select>
                            <button
                              type="button"
                              disabled={roleMutation.isPending}
                              onClick={() => {
                                const sel = document.getElementById(
                                  `role-select-${user.id}`
                                ) as HTMLSelectElement;
                                roleMutation.mutate({ userId: user.id, role: sel.value });
                              }}
                              style={{
                                padding: "4px 10px",
                                borderRadius: "6px",
                                border: "none",
                                background: "#4f46e5",
                                color: "#fff",
                                fontSize: "0.8rem",
                                cursor: "pointer",
                              }}
                            >
                              保存
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              style={{
                                padding: "4px 8px",
                                borderRadius: "6px",
                                border: "1px solid #e2e8f0",
                                background: "#fff",
                                fontSize: "0.8rem",
                                cursor: "pointer",
                              }}
                            >
                              取消
                            </button>
                          </div>
                        ) : (
                          /* 通常表示 */
                          <span
                            style={{
                              padding: "4px 10px",
                              borderRadius: "4px",
                              fontSize: "0.8rem",
                              backgroundColor: style.bg,
                              color: style.color,
                            }}
                          >
                            {ROLE_LABELS[user.role] ?? user.role}
                          </span>
                        )}
                      </td>

                      {/* 作成日時 */}
                      <td style={{ ...tdStyle, fontSize: "0.9rem", whiteSpace: "nowrap" }}>
                        {new Date(user.created_at).toLocaleString("ja-JP")}
                      </td>

                      {/* 操作 */}
                      <td style={tdStyle}>
                        {user.is_fixed ? (
                          <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>変更不可</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditingId(isEditing ? null : user.id)}
                            style={{
                              padding: "6px 14px",
                              borderRadius: "6px",
                              border: "1px solid #e2e8f0",
                              background: isEditing ? "#f1f5f9" : "#fff",
                              fontSize: "0.85rem",
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {isEditing ? "キャンセル" : "権限変更"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* フッター: 件数 */}
        {!isLoading && !error && (
          <div
            style={{
              padding: "12px 24px",
              color: "#94a3b8",
              fontSize: "0.85rem",
              borderTop: "1px solid #e2e8f0",
            }}
          >
            {filtered.length} 件 / 合計 {usersData?.length ?? 0} 件
          </div>
        )}
      </div>
    </Layout>
  );
};

export default UsersComponent;
