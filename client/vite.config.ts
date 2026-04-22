/// <reference types="vitest/config" />
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({
      target: "react",
      routeFileIgnorePrefix: "-",
    }),
    react(),
  ],
  server: {
    port: 3000,
    host: true,
  },
  preview: {
    port: 4173,
    host: true,
  },
  css: {
    devSourcemap: true,
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vite/rollup の型定義に合わせ、manualChunks は関数で返す
          // キャッシュ効率のため、依存ライブラリ単位で分離する
          if (!id.includes("node_modules")) return undefined;

          if (id.includes("/react-dom/") || id.includes("/react/")) return "vendor";
          if (id.includes("/@tanstack/react-router/")) return "router";

          return undefined;
        },
        // チャンクファイル名の設定
        chunkFileNames: "js/[name]-[hash].js",
        // エントリーファイル名の設定
        entryFileNames: "js/[name]-[hash].js",
        // アセットファイル名の設定
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split(".") || [];
          const ext = info[info.length - 1];
          if (/\.(css)$/.test(assetInfo.name || "")) {
            return `css/[name]-[hash].${ext}`;
          }
          if (/\.(png|jpe?g|gif|svg|ico|webp)$/.test(assetInfo.name || "")) {
            return `images/[name]-[hash].${ext}`;
          }
          if (/\.(woff2?|ttf|eot)$/.test(assetInfo.name || "")) {
            return `fonts/[name]-[hash].${ext}`;
          }
          return `assets/[name]-[hash].${ext}`;
        },
      },
    },
    // チャンクサイズ警告の閾値を調整
    chunkSizeWarningLimit: 1000,
    // ソースマップの生成（本番環境では無効化推奨）
    sourcemap: false,
    // ターゲットブラウザの設定（最新ブラウザ対応）
    target: "esnext",
    // ミニファイ設定（esbuildを使用 - 高速）
    minify: "esbuild",
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.{test,spec}.{ts,tsx}", "tests/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
    },
  },
});
