import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

/**
 * `productf brain` — a stdio<->HTTP MCP bridge. MCP hosts that only speak
 * stdio (Claude Desktop, some Cursor configs) can't talk to a hosted
 * Streamable-HTTP endpoint directly; this connects outbound to a Brain MCP
 * server (app/api/mcp/brain/route.ts in CoalitionHouse/Productf, one per
 * workspace) as a client, then re-exposes whatever tools it finds as a
 * local stdio MCP server. It is a *generic* passthrough — it doesn't know
 * or hardcode the Brain server's specific tool names/schemas, so it needs
 * no update if that server's tool set changes.
 *
 * Unlike `up`/`init`, this command needs no monorepo checkout — it only
 * talks to the network. That's what "thin" means for this subcommand: no
 * schema, no prompts, no business logic, just a protocol bridge.
 */
export async function runBrain(flags: Record<string, string>): Promise<void> {
  const url = flags.url ?? process.env.PRODUCTF_BRAIN_URL;
  const key = flags.key ?? process.env.PRODUCTF_BRAIN_KEY;

  if (!url) {
    console.error(
      'Missing Brain MCP server URL. Pass --url <https://your-productf-instance/api/mcp/brain> ' +
        'or set PRODUCTF_BRAIN_URL. There is no default — this bridge does not assume which ' +
        'Productf instance you run.',
    );
    process.exitCode = 1;
    return;
  }
  if (!key) {
    console.error(
      'Missing Brain MCP key. Pass --key <key> or set PRODUCTF_BRAIN_KEY. Generate one from ' +
        'Settings -> Snapshots -> "Brain MCP Server" in your Productf workspace.',
    );
    process.exitCode = 1;
    return;
  }

  const remote = new Client({ name: 'productf-cli-brain-bridge', version: '0.1.0' });
  const transport = new StreamableHTTPClientTransport(new URL(url), {
    requestInit: { headers: { Authorization: `Bearer ${key}` } },
  });

  try {
    await remote.connect(transport);
  } catch (err) {
    console.error(`Failed to connect to Brain MCP server at ${url}: ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
    return;
  }

  const local = new Server({ name: 'productf-brain', version: '0.1.0' }, { capabilities: { tools: {} } });

  local.setRequestHandler(ListToolsRequestSchema, async () => {
    const { tools } = await remote.listTools();
    return { tools };
  });

  local.setRequestHandler(CallToolRequestSchema, async (request) => {
    return remote.callTool({
      name: request.params.name,
      arguments: request.params.arguments ?? {},
    });
  });

  const stdio = new StdioServerTransport();
  await local.connect(stdio);

  const cleanup = async () => {
    await remote.close().catch(() => {});
    process.exit(0);
  };
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}
