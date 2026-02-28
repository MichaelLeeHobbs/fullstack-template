import { execSync } from 'node:child_process';
import path from 'node:path';

function getProjectRoot(): string {
  // Playwright runs from the config directory (apps/e2e), go up two levels
  return path.resolve(__dirname, '../..');
}

function isDockerRunning(root: string): boolean {
  try {
    execSync('docker compose -f docker-compose.yml ps --status running', {
      cwd: root,
      stdio: 'pipe',
    });
    return true;
  } catch {
    return false;
  }
}

export default async function globalSetup() {
  const root = getProjectRoot();

  if (!isDockerRunning(root)) {
    throw new Error(
      'Docker services are not running. Start them with: pnpm docker:up',
    );
  }

  console.log('[e2e] Running database migrations...');
  execSync('pnpm db:migrate', { cwd: root, stdio: 'inherit' });

  console.log('[e2e] Seeding database...');
  execSync('pnpm db:seed', { cwd: root, stdio: 'inherit' });

  console.log('[e2e] Global setup complete.');
}
