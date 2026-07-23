# @productf/cli

Thin local dev-stack bootstrap and Brain MCP bridge for [Product f()](https://productf.io).

This package intentionally contains **no product prompts, schema, or business logic** — the actual monorepo (`CoalitionHouse/Productf`) stays private. This CLI only:

- orchestrates `docker compose` / a bootstrap script that live in a Productf checkout (`up`, `init`), or
- bridges a local stdio MCP client to a hosted Brain MCP server over the network (`brain`).

## Install

```sh
npx @productf/cli --help
```

No global install needed — `npx` fetches the latest version each run.

## Commands

### `productf brain` — Brain MCP bridge (no monorepo needed)

Lets MCP hosts that only speak stdio (Claude Desktop, some Cursor setups) reach your workspace's Brain over the network, via the hosted Brain MCP server (`app/api/mcp/brain` in the Productf app).

1. In your Productf workspace: **Settings → Snapshots → Brain MCP Server → Generate new key**. Copy the key (shown once) and your workspace's MCP URL (`https://<your-instance>/api/mcp/brain`).
2. Add to your MCP host's config:

```json
{
  "mcpServers": {
    "productf-brain": {
      "command": "npx",
      "args": ["@productf/cli", "brain"],
      "env": {
        "PRODUCTF_BRAIN_URL": "https://<your-instance>/api/mcp/brain",
        "PRODUCTF_BRAIN_KEY": "<your key>"
      }
    }
  }
}
```

`--url`/`--key` flags work the same as the env vars, if your host prefers passing args directly.

This bridge is a **generic passthrough** — it queries the remote server's real tool list at connect time and forwards every call, so it needs no update if the Brain server's tools change. It reads no local files and needs no monorepo checkout.

### `productf up` / `productf init` — local dev stack (needs a Productf checkout)

These two commands orchestrate files that live in `CoalitionHouse/Productf` (`docker-compose.local.yml`, `scripts/local-bootstrap.ts`) — they don't bundle a copy. Run them from inside a clone of that repo (or pass `--repo <path>` / set `PRODUCTF_REPO_PATH`):

```sh
git clone https://github.com/CoalitionHouse/Productf   # requires repo access
cd Productf
cp .env.local.example .env.local   # fill in real values
npx @productf/cli up --detach --services db   # start local Postgres + Inngest dev server
npx @productf/cli init                        # run migrations, seed default f_functions
npx @productf/cli up                          # start everything, including the app
```

Both fail with a clear message (not a confusing downstream error) if the expected files aren't found at the target path.

## What's honestly not here yet

- `up`/`init` need a `CoalitionHouse/Productf` checkout, which is currently a private repo — these two commands aren't useful to someone without access to it. `brain` has no such dependency.
- No production Dockerfile exists yet in the monorepo (`docker-compose.local.yml`'s `app` service runs a generic `node:22-alpine` image with inline `npm install && npm run build && npm start`).
- Not exercised end-to-end against a running Docker stack or a live Brain MCP key in the environment this was built in — verified by reading and by exercising each command's error paths, not by a full live run. If you hit something that doesn't work as documented, please open an issue.

## License

Not yet decided — treat as all-rights-reserved until this is updated.
