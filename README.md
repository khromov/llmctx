## svelte-llm

LLM presets and MCP for Svelte 5 and SvelteKit. Visit the site at [svelte-llm.stanislav.garden](https://svelte-llm.stanislav.garden).

## MCP Endpoint

This service provides an MCP (Model Context Protocol) endpoint for use with AI assistants:

- **Streamable HTTP (Claude Desktop and most other clients)**: `https://svelte-llm.stanislav.garden/mcp/mcp`
- **SSE (Older clients that don't support Streamable)**: `https://svelte-llm.stanislav.garden/mcp/sse`

# Setup

- Create a `.env` file with the content:
  ```
  GITHUB_TOKEN=
  DB_URL=postgres://admin:admin@localhost:5432/db
  ```
- Create [a Classic GitHub token](https://github.com/settings/tokens). It must have `public_repo` permissions.
- Enter this in the .env file.
- Run `docker-compose up`
- Run:

```
nvm use
npm i
npm run dev
```

- Run database migrations: visit http://localhost:5173/api/migrate in your browser after starting the dev server.

You can also visit http://localhost:5173/admin to see all the "hidden" endpoints (default password = "secret")

## Debug MCP

```
NODE_TLS_REJECT_UNAUTHORIZED=0 NODE_OPTIONS="--insecure-http-parser" npx @modelcontextprotocol/inspector
```

http://127.0.0.1:6274

You can also use GitHub Copilot in Agent mode to try the agent locally, see `.vscode/mcp.json` for info on how that works.

### Misc

OG image from https://dynamic-og-image-generator.vercel.app/
