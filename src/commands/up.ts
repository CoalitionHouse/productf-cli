import { resolveRepoRoot, printRepoNotFoundError, runInherit } from '../util.js';

/**
 * `productf up` — starts the local dev stack defined in the monorepo's
 * docker-compose.local.yml (local Postgres+pgvector, local Inngest Dev
 * Server, the app itself). A thin `docker compose` wrapper, nothing more —
 * see docs there for what's real vs. illustrative in that compose file.
 */
export async function runUp(flags: Record<string, string>): Promise<void> {
  const check = resolveRepoRoot(flags.repo);
  if (!check.ok) {
    printRepoNotFoundError(check);
    process.exitCode = 1;
    return;
  }

  const detached = flags.detach === 'true' || flags.d === 'true';
  const services = flags.services ? flags.services.split(',') : [];
  const args = ['compose', '-f', 'docker-compose.local.yml', 'up', ...(detached ? ['-d'] : []), ...services];

  console.log(`Running: docker ${args.join(' ')}  (in ${check.root})`);
  await runInherit('docker', args, check.root);
}
