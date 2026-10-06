import { build } from "esbuild";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";

if (process.env.NODE_ENV === "production") throw new Error("Run database tests only against development.");
const dir = await mkdtemp(join(process.cwd(), ".reminder-tests-"));
try {
  const outfile = join(dir, "test.mjs");
  await build({
    entryPoints: ["tests/reminder-db.test.ts"], outfile, bundle: true,
    platform: "node", format: "esm", external: ["pg-native", "pino", "@clerk/express"],
    banner: { js: "import { createRequire } from 'node:module'; globalThis.require = createRequire(import.meta.url);" },
  });
  const code = await new Promise(resolve => {
    const child = spawn(process.execPath, ["--test", outfile], { stdio: "inherit", env: { ...process.env, REMINDER_WORKER_ENABLED: "false" } });
    child.on("exit", resolve);
    child.on("error", () => resolve(1));
  });
  process.exitCode = code ?? 1;
} finally {
  await rm(dir, { recursive: true, force: true });
}
