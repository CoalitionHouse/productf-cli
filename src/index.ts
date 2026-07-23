#!/usr/bin/env node
import { parseFlags } from './util.js';
import { runUp } from './commands/up.js';
import { runInit } from './commands/init.js';
import { runBrain } from './commands/brain.js';

const HELP = `productf — local dev-stack bootstrap and Brain MCP bridge for Product f()

Usage:
  productf up [--repo <path>] [--detach] [--services <a,b,c>]
    Start the local dev stack (docker-compose.local.yml: Postgres+pgvector,
    Inngest Dev Server, the app). Run from inside a CoalitionHouse/Productf
    checkout, or pass --repo.

  productf init [--repo <path>]
    Run migrations + seed default f_functions against a running local
    Postgres (start it first: productf up --detach --services db).

  productf brain [--url <url>] [--key <key>]
    Bridge a local stdio MCP client (Claude Desktop, Cursor, etc.) to a
    hosted Brain MCP server. Needs no monorepo checkout — just network
    access and a Brain MCP key from Settings -> Snapshots in your
    Productf workspace. --url/--key can also come from PRODUCTF_BRAIN_URL
    / PRODUCTF_BRAIN_KEY.

  productf --help
    Show this message.

This package is a thin client: it contains no product prompts, schema, or
business logic. "up"/"init" orchestrate files that live in
CoalitionHouse/Productf (currently private); "brain" only ever talks to a
Brain MCP server you already have access to.
`;

async function main() {
  const [, , command, ...rest] = process.argv;
  const { flags } = parseFlags(rest);

  switch (command) {
    case 'up':
      await runUp(flags);
      break;
    case 'init':
      await runInit(flags);
      break;
    case 'brain':
      await runBrain(flags);
      break;
    case '--help':
    case '-h':
    case undefined:
      console.log(HELP);
      break;
    default:
      console.error(`Unknown command: ${command}\n`);
      console.log(HELP);
      process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
