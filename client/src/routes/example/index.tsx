import { createFileRoute } from "@tanstack/react-router";
import type { FC } from "react";
import { useState } from "react";
import { apiClient } from "@/lib/apiClient";

const Example: FC = () => {
  const [responseMessage, setResponseMessage] = useState("未通信");
  const [isLoading, setIsLoading] = useState(false);

  const handleCallBackend = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get<{ message?: string }>("/ping");
      const data = response.data;
      setResponseMessage(data.message ?? "バックエンドからの応答です");
    } catch (error) {
      setResponseMessage(
        `通信に失敗しました: ${error instanceof Error ? error.message : "unknown"}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <p>Example</p>
      <button type="button" onClick={handleCallBackend} disabled={isLoading}>
        {isLoading ? "通信中..." : "バックエンド通信"}
      </button>
      <p>{responseMessage}</p>
    </div>
  );
};

export const Route = createFileRoute("/example/")({
  component: Example,
});

export default Example;
