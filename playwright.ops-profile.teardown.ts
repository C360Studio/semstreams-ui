import { execSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function globalTeardown() {
  if (process.env.CI) {
    console.log("[Playwright] Skipping ops-profile cleanup in CI environment");
    return;
  }

  const composePath = join(__dirname, "docker-compose.ops-profile.yml");

  try {
    console.log("[Playwright] Cleaning up ops-profile Docker Compose stack...");
    execSync(`docker compose -f ${composePath} down`, { stdio: "inherit" });
  } catch (error) {
    console.warn(
      "[Playwright] Ops-profile cleanup failed (may already be stopped):",
      error,
    );
  }
}

export default globalTeardown;
