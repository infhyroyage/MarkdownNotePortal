import { cpSync, writeFileSync } from "fs";
import { resolve } from "path";
import { defineConfig } from "vite";

const lambdaFunctions = [
  "create_memo",
  "delete_memo",
  "get_memo",
  "list_memos",
  "update_memo",
  "format_memo",
  "edge_viewer_request",
];

export default defineConfig({
  ssr: {
    noExternal: true,
  },
  build: {
    ssr: true,
    target: "node24",
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
          ]),
        ),
        // Lambda Layerのエントリーポイント
        "layer-utils": resolve(__dirname, "layer/nodejs/utils.ts"),
      },
      output: {
        format: "es",
        entryFileNames: (chunkInfo: { name: string }) => {
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

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
        `.trim(),
      },
      // prettier はランタイム依存として外部化し、デプロイZIPに node_modules ごと同梱する
      // (再バンドルすると prettier 内の重複インポートでビルドが失敗するため)
      external: ["crypto", "prettier"],
      plugins: [
        // Lambda関数のビルド後に、各Lambda関数のディレクトリにpackage.jsonを生成
        {
          name: "generate-package-json",
          closeBundle() {
            [
              "", // dist root
              "create_memo",
              "list_memos",
              "get_memo",
              "update_memo",
              "delete_memo",
              "format_memo",
              "edge_viewer_request",
              "layer/nodejs",
            ].forEach((dir: string) => {
              const targetPath: string = resolve(
                __dirname,
                "dist",
                dir,
                "package.json",
              );
              try {
                writeFileSync(
                  targetPath,
                  JSON.stringify(
                    {
                      type: "module",
                    },
                    null,
                    2,
                  ),
                );
                console.log(`Created: ${targetPath}`);
              } catch (error) {
                console.error(
                  `Failed to create ${targetPath}:`,
                  (error as Error).message,
                );
              }
            });
          },
        },
        // format_memo のみ外部化した prettier を利用するため node_modules を同梱
        {
          name: "bundle-format-memo-runtime-deps",
          closeBundle() {
            const runtimeDeps = ["prettier"];
            runtimeDeps.forEach((dep: string) => {
              const src = resolve(__dirname, "node_modules", dep);
              const dest = resolve(
                __dirname,
                "dist",
                "format_memo",
                "node_modules",
                dep,
              );
              try {
                cpSync(src, dest, { recursive: true, dereference: true });
                console.log(`Copied: ${src} -> ${dest}`);
              } catch (error) {
                console.error(
                  `Failed to copy ${dep} into format_memo:`,
                  (error as Error).message,
                );
              }
            });
            const formatMemoPkgPath = resolve(
              __dirname,
              "dist",
              "format_memo",
              "package.json",
            );
            try {
              writeFileSync(
                formatMemoPkgPath,
                JSON.stringify(
                  {
                    type: "module",
                    dependencies: {
                      prettier: "*",
                    },
                  },
                  null,
                  2,
                ),
              );
              console.log(`Updated: ${formatMemoPkgPath}`);
            } catch (error) {
              console.error(
                `Failed to update ${formatMemoPkgPath}:`,
                (error as Error).message,
              );
            }
          },
        },
      ],
    },
  },
  resolve: {
    alias: {
      "@types": resolve(__dirname, "types"),
      "@layer": resolve(__dirname, "layer/nodejs"),
    },
  },
});
