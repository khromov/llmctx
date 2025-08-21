# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Development

Note: Never run "npm run dev", test changes with "npm run build".
Note: Run "npm run format" after making code changes to fix formatting.
Note: Run "npm run check" after changes to check for TypeScript errors

- `npm run dev` - Start development server
- `npm run build` - Build production bundle
- `npm run build:node` - Build for Node.js deployment
- `npm run preview` - Preview production build

### Testing and Quality

- `npm run test` - Run all tests (unit tests via vitest)
- `npm run test:unit` - Run unit tests only
- `npm run check` - Type check with svelte-check
- `npm run check:watch` - Type check in watch mode
- `npm run lint` - Check code formatting and linting
- `npm run eslint:fix` - Auto-fix eslint issues
- `npm run format` - Auto-format code with prettier

### Database Operations

- Visit `/api/migrate` - Run database migrations (must be done after setting up PostgreSQL)
- Visit `/api/update-distilled?secret_key=YOUR_KEY` - Trigger AI distillation process (requires DISTILL_SECRET_KEY)

### MCP Development

- Debug MCP endpoint: `NODE_TLS_REJECT_UNAUTHORIZED=0 NODE_OPTIONS="--insecure-http-parser" npx @modelcontextprotocol/inspector`

## Architecture Overview

This is a SvelteKit application that provides Svelte 5 and SvelteKit documentation in LLM-friendly formats. Key architectural components:

### Core Functionality

- **Documentation Transformation**: Fetches markdown files from GitHub repositories and processes them into LLM-optimized formats
- **Preset System**: Configurable documentation bundles defined in `src/lib/presets.ts` with different sizes and content filters
- **Database Storage**: PostgreSQL database for storing processed documentation and caching
- **Distilled Content**: AI-processed versions of documentation stored in the database

### Key Routes

- `/[preset]` - Main documentation endpoint that serves processed markdown
- `/mcp/[...rest]` - MCP (Model Context Protocol) server for AI assistant integration
- `/api/distilled-versions` - API for managing distilled documentation versions
- `/api/update-distilled` - API for updating distilled content
- `/api/preset-content/[presetKey]/[version]` - API for retrieving specific versions of preset content

### Important Files

- `src/lib/presets.ts` - Defines all available documentation presets and their configurations
- `src/lib/fetchMarkdown.ts` - Core logic for fetching and processing GitHub markdown content
- `src/lib/presetCache.ts` - Database caching system with staleness detection
- `src/lib/server/presetDb.ts` - Database service layer for preset operations
- `src/routes/[preset]/+server.ts` - Main documentation serving endpoint

### Database Schema

The application uses PostgreSQL with the following main tables:

- `presets` - Stores preset content and metadata
- `distillation_jobs` - Tracks AI distillation processes
- `distillation_results` - Results from AI processing

### Environment Setup

- Requires `GITHUB_TOKEN` in `.env` file with `public_repo` permissions for GitHub API access
- Requires `DB_URL` for PostgreSQL connection (default: `postgres://admin:admin@localhost:5432/db`)
- Optional `DISTILL_SECRET_KEY` for protected distillation endpoint
- Uses Svelte 5 with runes syntax throughout the codebase
- Built with TypeScript and uses Vitest for testing

#### Initial Setup Steps

1. Copy `.env.example` to `.env` and fill in required values
2. Create a [Classic GitHub token](https://github.com/settings/tokens) with `public_repo` permissions
3. Set up PostgreSQL (can use included `docker-compose.yml`)
4. Run database migrations by visiting `/api/migrate` after starting the dev server

### MCP Integration

The application provides MCP endpoints for AI assistants:

- SSE endpoint: `/mcp/sse` (for Claude Desktop)
- HTTP endpoint: `/mcp/mcp` (for other clients)
- Tools: `list_sections` and `get_documentation` for querying Svelte/SvelteKit docs

### Deployment Notes

- Uses Node.js adapter for production deployment
- Supports Docker deployment via included Dockerfile
- Database migrations are handled via `/api/migrate` endpoint
- All content is served from the database in production

## Development Workflow

### Adding New Presets

1. Edit `src/lib/presets.ts` and add new preset configuration
2. Preset structure includes: `title`, `owner`, `repo`, `glob` patterns, optional `prompt` and `minimize` options
3. Glob patterns support include/exclude syntax (use `!pattern` to exclude)
4. Test preset by visiting `/{preset-key}` endpoint

### Distillation Process

- AI distillation uses Anthropic's Claude to condense documentation
- Triggered via `/api/update-distilled` endpoint with secret key
- Results stored in database with versioning (latest + date-based versions)
- In dev mode, processing is limited to 10 files for faster testing
- Creates separate Svelte-only and SvelteKit-only distilled versions

### Key Development Patterns

- All database operations go through `PresetDbService` in `src/lib/server/presetDb.ts`
- Content fetching and processing handled by `src/lib/fetchMarkdown.ts`
- Preset caching system in `src/lib/presetCache.ts` handles staleness detection
- MCP handlers in `src/lib/mcpHandler.ts` provide AI assistant integration
- Uses Zod for schema validation throughout the codebase

## Guidelines

- Use comments sparingly
