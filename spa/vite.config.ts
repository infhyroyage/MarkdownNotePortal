import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import type { ClientRequest, IncomingMessage } from "http";
import path from "path";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      // HTTPメソッドとパスに基づいて適切なLambda関数にルーティング
      "/memo": {
        configure: (proxy: any) => {
          proxy.on("proxyReq", (proxyReq: ClientRequest) => {
            // パスを Lambda Runtime Interface Emulator のエンドポイントに書き換え
            proxyReq.path = "/2015-03-31/functions/function/invocations";
          });
        },
        // @ts-expect-error - Viteの型定義にはrouterが含まれていないが、実行時にはサポートされている
        router: (req: IncomingMessage) => {
          const url = req.url || "";
          const method = req.method || "";
          const path = url.split("?")[0]; // クエリパラメータを除去

          if (path === "/memo") {
            if (method === "POST") {
              // [POST] /memo
              return "http://localhost:9001";
            } else if (method === "GET") {
              // [GET] /memo
              return "http://localhost:9002";
            }
          } else if (path.match(/^\/memo\/([^/]+)$/)) {
            if (method === "GET") {
              // [GET] /memo/{memoId}
              return "http://localhost:9003";
            } else if (method === "PUT") {
              // [PUT] /memo/{memoId}
              return "http://localhost:9004";
            } else if (method === "DELETE") {
              // [DELETE] /memo/{memoId}
              return "http://localhost:9005";
            }
          }

          // 上記以外のパスは404エラーをレスポンスすべく、プロキシをスキップ
          return null;
        },
        changeOrigin: true,
      },
    },
  },
});
