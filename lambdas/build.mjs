import { build } from "esbuild";
import { join } from "path";

const lambdaDirs = [
  "create_memo",
  "delete_memo",
  "get_memo",
  "list_memos",
  "update_memo",
];

async function buildLambdas() {
  for (const dir of lambdaDirs) {
    await build({
      entryPoints: [join(dir, "index.ts")],
      bundle: true,
      platform: "node",
      target: "node22",
      format: "esm",
      outfile: join("dist", dir, "index.js"),
      external: ["@aws-sdk/*"],
      banner: {
        js: `
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
        `.trim(),
      },
    });
    console.log(`✓ Built ${dir}`);
  }

  // Build layer
  await build({
    entryPoints: ["layer/nodejs/utils.ts"],
    bundle: true,
    platform: "node",
    target: "node22",
    format: "esm",
    outfile: "dist/layer/nodejs/utils.js",
    external: ["@aws-sdk/*"],
  });
  console.log("✓ Built layer");
}

buildLambdas().catch((error) => {
  console.error("Build failed:", error);
  process.exit(1);
});
