import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import axios, { type AxiosResponse } from "axios";
import type { IncomingMessage, ServerResponse } from "http";
import path from "path";
import { defineConfig, type ViteDevServer } from "vite";

/**
 * Lambda関数からvite開発サーバーへのレスポンスの型
 */
interface LambdaResponse {
  /**
   * ステータスコード
   */
  statusCode: number;

  /**
   * ヘッダー
   */
  headers?: Record<string, string>;

  /**
   * ボディ
   */
  body?: string;
}

/**
 * 各Lambda関数のパスに対するDockerコンテナのポート番号のマッピング
 */
const LAMBDA_PORTS: Record<string, number> = {
  "POST:/memo": 9001,
  "GET:/memo": 9002,
  "GET:/memo/": 9003,
  "PUT:/memo/": 9004,
  "DELETE:/memo/": 9005,
};

/**
 * Lambda Runtime Interface Emulatorで同時リクエストを処理できるようにキューイングするためのマップ
 * キーはDockerコンテナのポート番号、値はLambda関数にリクエストを送信してレスポンスを返す非同期処理
 */
const requestQueues: Map<number, Promise<any>> = new Map();

/**
 * リクエストボディを読み取る
 * @param {IncomingMessage} req リクエスト
 * @returns {Promise<string>} リクエストボディ
 */
const readRequestBody = (req: IncomingMessage): Promise<string> => {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      resolve(body);
    });
    req.on("error", (error) => {
      reject(error);
    });
  });
};

/**
 * HTTPリクエストを受け取り、Lambda関数にプロキシするカスタムミドルウェア
 * @param {IncomingMessage} req リクエスト
 * @param {ServerResponse} res レスポンス
 * @param {() => void} next 次のミドルウェア
 * @returns {void}
 */
const lambdaProxyMiddleware = (
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
) => {
  // Lambda関数で処理するパス以外は、Lambda関数にプロキシせず、次のミドルウェアにそのまま処理を渡す
  const urlString: string = req.url || "";
  if (!urlString.startsWith("/memo")) {
    return next();
  }

  // URLからパスとクエリパラメータを分離
  const [path, queryString] = urlString.split("?");
  const queryStringParameters: Record<string, string> = {};
  if (queryString) {
    const params = new URLSearchParams(queryString);
    params.forEach((value, key) => {
      queryStringParameters[key] = value;
    });
  }

  // ルーティング先のポート番号を決定
  // ルーティング先が見つからない場合は404エラーを返す
  let targetPort: number | null = null;
  const httpMethod: string = req.method || "";
  const pathMatch: RegExpMatchArray | null = path.match(/^\/memo\/([^/]+)$/);
  if (path === "/memo") {
    targetPort = LAMBDA_PORTS[`${httpMethod}:/memo`] || null;
  } else if (pathMatch) {
    targetPort = LAMBDA_PORTS[`${httpMethod}:/memo/`] || null;
  }
  if (!targetPort) {
    res.statusCode = 404;
    res.end(JSON.stringify({ message: "Not Found" }));
    return;
  }

  // Lambda関数にリクエストを送信してレスポンスを返す非同期処理を定義
  const processRequest = async () => {
    try {
      // リクエストボディを読み取る
      const body: string = await readRequestBody(req);

      // Lambda関数に送信するリクエストをAPI Gateway形式のイベントに変換してから、Lambda関数に送信する
      const response: AxiosResponse<LambdaResponse> =
        await axios.post<LambdaResponse>(
          `http://localhost:${targetPort}/2015-03-31/functions/function/invocations`,
          {
            httpMethod,
            path,
            headers: req.headers,
            pathParameters: pathMatch
              ? {
                  memoId: pathMatch[1],
                }
              : null,
            queryStringParameters:
              Object.keys(queryStringParameters).length > 0
                ? queryStringParameters
                : undefined,
            body,
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

      // Lambda関数のレスポンスをHTTPレスポンスに変換
      res.statusCode = response.data.statusCode || 200;
      if (response.data.headers) {
        Object.entries(response.data.headers).forEach(([key, value]) => {
          res.setHeader(key, value as string);
        });
      }
      res.end(response.data.body || "");
    } catch (error) {
      // レスポンスがまだ送信されていない場合のみエラーレスポンスを返す
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            message: "Internal proxy error",
            details: error instanceof Error ? error.message : String(error),
          }),
        );
      }
    }
  };

  // 定義した非同期処理をキューイングして順次実行
  // 前の非同期処理が失敗しても、そのまま次の非同期処理を実行できるようにキューイングする
  const previousRequest = requestQueues.get(targetPort) || Promise.resolve();
  const currentRequest = previousRequest
    .then(() => processRequest())
    .catch(() => processRequest());
  requestQueues.set(targetPort, currentRequest);

  // 定義した非同期処理の完了後、キューから削除
  currentRequest.finally(() => {
    if (requestQueues.get(targetPort) === currentRequest) {
      requestQueues.delete(targetPort);
    }
  });
};

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Lambda関数からvite開発サーバーへのレスポンスをプロキシするカスタムミドルウェアを追加
    {
      name: "lambda-proxy",
      configureServer(server: ViteDevServer) {
        server.middlewares.use(lambdaProxyMiddleware);
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // 大きなサイズのライブラリ(React Router、axios、daisyui)を個別チャンクに分割
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom"],
          "vendor-axios": ["axios"],
          "vendor-daisyui": ["daisyui"],
        },
      },
    },
  },
});
