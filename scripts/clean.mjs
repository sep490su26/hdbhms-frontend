import { readdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const protectedDirectory = ".next-build-check";
const projectRoot = process.cwd();
const entries = await readdir(projectRoot, { withFileTypes: true });
const cacheDirectories = entries
  .filter(
    (entry) =>
      entry.isDirectory() &&
      entry.name.startsWith(".next") &&
      entry.name !== protectedDirectory,
  )
  .map((entry) => entry.name)
  .sort();

if (cacheDirectories.length === 0) {
  console.log(`[clean] No .next* directories found. Kept ${protectedDirectory}.`);
  process.exit(0);
}

let failed = false;

for (const directory of cacheDirectories) {
  try {
    await rm(resolve(projectRoot, directory), {
      recursive: true,
      force: true,
    });
    console.log(`[clean] Removed ${directory}.`);
  } catch (error) {
    failed = true;
    console.error(`[clean] Could not remove ${directory}: ${error.message}`);
  }
}

if (failed) {
  console.error("[clean] Close processes locking cache directories, then run npm run clean again.");
  process.exitCode = 1;
} else {
  console.log(`[clean] Complete. Kept ${protectedDirectory}.`);
}
