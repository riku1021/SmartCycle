import { createFileRoute, Link } from "@tanstack/react-router";

const RouteComponent = () => {
  return (
    <div style={{ padding: "1rem" }}>
      <p>index</p>
      <ul>
        <li>
          <Link to="/login">ログイン / 新規登録</Link>
        </li>
        <li>
          <Link to="/example">Example（要ログイン）</Link>
        </li>
      </ul>
    </div>
  );
};

export const Route = createFileRoute("/")({
  component: RouteComponent,
});
