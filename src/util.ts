/**
 * Shared helpers for the `up`/`init` commands. Both operate on a local
 * clone of CoalitionHouse/Productf (currently private) — this CLI is a
 * thin orchestrator that shells out to files already in that repo
 * (docker-compose.local.yml, scripts/local-bootstrap.ts), never a copy of
 * them. That's a deliberate scope boundary: this package ships no schema,
 * prompts, or business logic of its own.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

export interface RepoCheck {
  ok: boolean;
  root: string;
  missing: string[];
}

/**
 * Resolve the Productf monorepo root to operate against: `--repo <path>`
 * if given, else `PRODUCTF_REPO_PATH`, else the current working directory.
 * Verifies the two files this CLI actually depends on are present rather
 * than assuming — a wrong `--repo` value should fail with a clear message,
 * not a confusing downstream error from `docker compose` or `tsx`.
 */
export function resolveRepoRoot(repoArg: string | undefined): RepoCheck {
  const root = path.resolve(repoArg ?? process.env.PRODUCTF_REPO_PATH ?? process.cwd());
  const required = ['docker-compose.local.yml', path.join('supabase', 'migrations')];
  const missing = required.filter((rel) => !existsSync(path.join(root, rel)));
  return { ok: missing.length === 0, root, missing };
}

export function printRepoNotFoundError(check: RepoCheck): void {
  console.error(
    `Could not find a Productf monorepo checkout at ${check.root}.\n` +
      `Missing: ${check.missing.join(', ')}\n\n` +
      'This command orchestrates files that live in CoalitionHouse/Productf ' +
      '(currently private) — it does not bundle a copy of them. Run this ' +
      'command from inside a clone of that repo, or pass --repo <path> / set ' +
      'PRODUCTF_REPO_PATH.',
  );
}

/** Spawn a child process with inherited stdio (so the user sees real-time
 *  docker/tsx output), resolving/rejecting on exit code. */
export function runInherit(cmd: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

/** Parse `--flag value` / `--flag=value` pairs out of argv, returning the
 *  rest as positional args. Deliberately hand-rolled instead of adding a
 *  CLI-parsing dependency — this tool only ever has a handful of flags. */
export function parseFlags(argv: string[]): { flags: Record<string, string>; rest: string[] } {
  const flags: Record<string, string> = {};
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      if (eq !== -1) {
        flags[arg.slice(2, eq)] = arg.slice(eq + 1);
      } else {
        const next = argv[i + 1];
        if (next && !next.startsWith('--')) {
          flags[arg.slice(2)] = next;
          i++;
        } else {
          flags[arg.slice(2)] = 'true';
        }
      }
    } else {
      rest.push(arg);
    }
  }
  return { flags, rest };
}
