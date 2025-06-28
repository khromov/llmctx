# svelte-llm

LLM presets for Svelte 5 and SvelteKit. Visit the site at [svelte-llm.khromov.se](https://svelte-llm.khromov.se).

## MCP Endpoint

This service provides an MCP (Model Context Protocol) endpoint for use with AI assistants:

- **SSE (Claude Desktop)**: `https://svelte-llm.khromov.se/mcp/sse`
- **Streamable HTTP (most other clients)**: `https://svelte-llm.khromov.se/mcp/mcp`

OG image from <https://dynamic-og-image-generator.vercel.app/>

# Setup

- Create a `.env` file with the content:

  ```
  GITHUB_TOKEN=
  DB_URL=postgres://admin:admin@localhost:5432/db
  ```

- Create [a Classic GitHub token](https://github.com/settings/tokens). It must have `public_repo` permissions.
- Enter this in the .env file.
- Set up PostgreSQL (you can use the included docker-compose.yml)
- Run database migrations: visit `/api/migrate` in your browser after starting the dev server

# llmctx

llmctx transforms technical documentation into AI-ready formats. It provides a simple way to access condensed, LLM-friendly versions of popular framework and library documentation through preset URLs. This makes it easier for developers to use AI coding assistants like Cursor or Zed with accurate, up-to-date context from official documentation sources.

- Preset URLs for quick access to LLM-optimized documentation
- Regularly updated content from official documentation
- Database-powered caching for fast response times
- AI-distilled versions for more concise documentation

## Supported presets

Visit [llmctx.com](https://llmctx.com) to see all presets.

### Adding presets

To add a new preset:

1. Fork this repo.
2. Open the `src/lib/presets.ts` file.
3. Add a new entry to the `presets` object with the following structure:

   ```ts
   [presetKey]: {
     title: 'Preset Title',
     owner: 'github-owner',
     repo: 'github-repo',
     glob: ['**/*.md', '**/*.mdx', '!**/excluded/**'], // Required, supports glob patterns
     prompt: 'Optional prompt for additional context'
   }
   ```

4. Create a pull request with your changes.

The `glob` field supports glob patterns, providing flexible file matching:

- Use `**/*.md` to match all Markdown files in any subdirectory
- Use `**/*.mdx` to match all MDX files in any subdirectory
- Use `!pattern` to exclude files/directories matching the pattern
- Combine patterns for fine-grained control, e.g., `['**/*.md', '**/*.mdx', '!**/excluded/**']`
- Patterns are processed in order, so you can include files and then exclude specific ones

Please ensure that the documentation source is reliable and actively maintained.

## Debug MCP

```
NODE_TLS_REJECT_UNAUTHORIZED=0 NODE_OPTIONS="--insecure-http-parser" npx @modelcontextprotocol/inspector
```

<http://127.0.0.1:6274>

You can also use GitHub Copilot in Agent mode to try the agent locally, see `.vscode/mcp.json` for info on how that works.
