import { build } from "esbuild";
import { mkdir, copyFile } from "node:fs/promises";
await mkdir("../solver", { recursive: true });
await build({
  entryPoints: ["worker.js"],
  bundle: true,
  minify: true,
  platform: "browser",
  format: "esm",
  external: ["node:*"],
  outfile: "../solver/worker.mjs",
});
for (const [from, to] of [
  ["cpsat-js/build/portable/cpsat.wasm", "cpsat.wasm"],
  ["cpsat-js/LICENSE", "LICENSE-cpsat-js.txt"],
])
  await copyFile("node_modules/" + from, "../solver/" + to);
