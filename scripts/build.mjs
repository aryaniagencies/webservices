import { build } from "esbuild";

await build({
  entryPoints: {
    index: "src/index.js",
    "handlers/http": "src/backend/handlers/http.js",
  },
  outdir: "dist",
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node20",
  sourcemap: true,
  packages: "external",
});