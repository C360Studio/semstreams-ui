/**
 * Global teardown for Playwright tests
 * Cleans up Docker Compose stack after all tests complete
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function globalTeardown() {
	// Only cleanup if not in CI (CI manages its own lifecycle)
	if (process.env.CI) {
		console.log('[Playwright] Skipping Docker cleanup in CI environment');
		return;
	}

	console.log('[Playwright] Cleaning up Docker Compose stack...');

	try {
		// Stop docker-compose.e2e.yml stack
		const composePath = join(__dirname, 'docker-compose.e2e.yml');
		execSync(`docker compose -f ${composePath} down`, {
			stdio: 'inherit'
		});
		console.log('[Playwright] Docker cleanup completed');
	} catch (error) {
		console.warn('[Playwright] Docker cleanup failed (may already be stopped):', error);
		// Don't fail the test run if cleanup fails
	}
}

export default globalTeardown;
