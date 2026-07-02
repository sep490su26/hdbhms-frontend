import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import { createConnection, createServer } from "node:net";
import { resolve } from "node:path";

const devDistDir = ".next-dev";
const cacheDirectories = [".next", devDistDir];
const port = Number.parseInt(process.env.PORT ?? "3000", 10);

function canConnect(portNumber, host) {
  return new Promise((resolveCheck) => {
    const socket = createConnection({ host, port: portNumber });
    let settled = false;

    const finish = (connected) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolveCheck(connected);
    };

    socket.setTimeout(500);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

async function checkPortAvailable(portNumber) {
  const activeListeners = await Promise.all([
    canConnect(portNumber, "127.0.0.1"),
    canConnect(portNumber, "::1"),
  ]);

  if (activeListeners.some(Boolean)) return false;

  return new Promise((resolveCheck, reject) => {
    const server = createServer();

    server.once("error", (error) => {
      if (error.code === "EADDRINUSE") {
        resolveCheck(false);
        return;
      }
      reject(error);
    });

    server.listen({ host: "0.0.0.0", port: portNumber, exclusive: true }, () => {
      server.close(() => resolveCheck(true));
    });
  });
}

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error(`[dev] Invalid PORT value: ${process.env.PORT}`);
  process.exit(1);
}

if (!(await checkPortAvailable(port))) {
  console.warn(`[dev] Port ${port} is already in use. A development server may already be running.`);
  console.warn(`[dev] Stop the process using port ${port}, then run npm run dev again.`);
  process.exit(1);
}

for (const directory of cacheDirectories) {
  const cachePath = resolve(process.cwd(), directory);

  try {
    await rm(cachePath, {
      recursive: true,
      force: true,
    });
    console.log(`[dev] Cleared ${directory}.`);
  } catch (error) {
    console.error(
      `[dev] Could not clear ${directory}. Close processes locking this directory, then run npm run dev again.`,
    );
    console.error(`[dev] ${error.message}`);
    process.exit(1);
  }
}

const nextBin = resolve(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const child = spawn(process.execPath, [nextBin, "dev", "--webpack"], {
  env: { ...process.env, NEXT_DIST_DIR: devDistDir },
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("error", (error) => {
  console.error("[dev] Failed to start Next.js.", error);
  process.exitCode = 1;
});

child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
