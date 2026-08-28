import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const biomeCli = require.resolve("@biomejs/biome/bin/biome");

runBiome(["lint", "--write", "--unsafe", "--only=style/useBlockStatements"]);
runBiome(["check", "--write"]);

function runBiome(args) {
  const result = spawnSync(process.execPath, [biomeCli, ...args], {
    stdio: "inherit",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
