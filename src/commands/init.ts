import { existsSync } from 'node:fs';
import path from 'node:path';
import { resolveRepoRoot, printRepoNotFoundError, runInherit } from '../util.js';

/**
 * `productf init` — runs the monorepo's scripts/local-bootstrap.ts against
 * a running local Postgres (start it first with `productf up -d db`):
 * applies supabase/migrations/*.sql in order and seeds default f_functions.
 * A thin `npx tsx` wrapper — the actual bootstrap logic lives in the
 * monorepo, not duplicated here.
 */
export async function runInit(flags: Record<string, string>): Promise<void> {
  const check = resolveRepoRoot(flags.repo);
  if (!check.ok) {
    printRepoNotFoundError(check);
    process.exitCode = 1;
    return;
  }

  const bootstrapScript = path.join(check.root, 'scripts', 'local-bootstrap.ts');
  if (!existsSync(bootstrapScript)) {
    console.error(
      `Found a Productf checkout at ${check.root}, but scripts/local-bootstrap.ts is missing. ` +
        'This CLI targets the Phase 8 local-CLI groundwork — pull the latest alpha branch.',
    );
    process.exitCode = 1;
    return;
  }

  console.log(`Running: npx tsx scripts/local-bootstrap.ts  (in ${check.root})`);
  await runInherit('npx', ['tsx', 'scripts/local-bootstrap.ts'], check.root);
}
