import { resolve } from "path";
import { defineConfig } from "vite";

const lambdaFunctions = [
  "create_memo",
  "delete_memo",
  "get_memo",
  "list_memos",
  "update_memo",
];

export default defineConfig({
  build: {
    ssr: true,
    target: "node22",
    outDir: "dist",
    emptyOutDir: true,
    minify: false,
    sourcemap: false,
    rollupOptions: {
      input: {
        // Lambda関数のエントリーポイント
        ...Object.fromEntries(
          lambdaFunctions.map((fn) => [
            fn,
            resolve(__dirname, `${fn}/index.ts`),
          ])
        ),
        // Lambda Layerのエントリーポイント
        "layer-utils": resolve(__dirname, "layer/nodejs/utils.ts"),
      },
      output: {
        format: "es",
        entryFileNames: (chunkInfo) => {
          // Lambda関数の出力先
          if (lambdaFunctions.includes(chunkInfo.name)) {
            return `${chunkInfo.name}/index.js`;
          }
          // Lambda Layerの出力先
          if (chunkInfo.name === "layer-utils") {
            return "layer/nodejs/utils.js";
          }
          return "[name].js";
        },
        // AWS SDKはLambda実行環境に含まれているため外部化
        banner: `
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
        `.trim(),
      },
      external: ["@aws-sdk/client-dynamodb", "crypto"],
    },
  },
  resolve: {
    alias: {
      "@types": resolve(__dirname, "types"),
      "@layer": resolve(__dirname, "layer/nodejs"),
    },
  },
});
