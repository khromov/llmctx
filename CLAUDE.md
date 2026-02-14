# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Development

Note: Run "npm run format" after making code changes to fix formatting.
Note: Run "npm run check" after changes to check for TypeScript errors

- `npm run dev` - Start development server
- `npm run build` - Build production bundle
- `npm run build:node` - Build for Node.js deployment
- `npm run preview` - Preview production build
- `npm run bp` - Build and run with garbage collection enabled (for memory profiling)

### Testing and Quality

- `npm run test` - Run all tests (unit tests via vitest)
- `npm run test:unit` - Run unit tests in watch mode
- `npm run check` - Type check with svelte-check
- `npm run check:watch` - Type check in watch mode
- `npm run lint` - Check code formatting and linting
- `npm run eslint:fix` - Auto-fix eslint issues
- `npm run format` - Auto-format code with prettier
- `npm run stress-test` - Run stress tests against the server

### Database Operations

- Visit `/api/migrate` - Run database migrations (must be done after setting up PostgreSQL)
- `npm run clear-db` - Clear all database tables (development only)
- Adminer UI - Available at http://localhost:8080 for database management (when using docker-compose)

### MCP Development

- `npm run mcp` - Debug MCP endpoint using MCP inspector
- `.vscode/mcp.json` - Configuration for using MCP with GitHub Copilot agent mode

### Admin Interface

- Visit `/admin` - Access admin panel (default password: "secret")
- Admin panel provides access to internal endpoints and status information

## Architecture Overview

This is a SvelteKit application that provides Svelte 5 and SvelteKit documentation in LLM-friendly formats. Key architectural components:

### Core Functionality

- **Documentation Transformation**: Fetches markdown files from GitHub repositories and processes them into LLM-optimized formats
- **Preset System**: Configurable documentation bundles defined in `src/lib/presets.ts` with different sizes and content filters
- **Database Storage**: PostgreSQL database for storing processed documentation and caching
- **Distilled Content**: AI-processed versions of documentation stored in the database
- **Content Synchronization**: Automated scheduler service for keeping documentation up-to-date

### Key Routes

#### Documentation Endpoints

- `/[preset]` - Main documentation endpoint that serves processed markdown
- `/[preset]/size` - Get size information for a preset

#### API Endpoints

- `/api/migrate` - Run database migrations
- `/api/update-distilled` - Trigger AI distillation process (requires DISTILL_SECRET_KEY)
- `/api/distilled-versions` - Manage distilled documentation versions
- `/api/preset-content/[presetKey]/[version]` - Retrieve specific versions of preset content
- `/api/sync-content` - Manually trigger content synchronization (requires CONTENT_SYNC_SECRET_KEY)
- `/api/content-status` - Check content synchronization status
- `/api/scheduler-status` - View scheduler status
- `/api/memory-status` - Check memory usage
- `/api/heap-snapshot` - Generate heap snapshot for debugging (requires secret_key)
- `/api/docs` - API documentation

#### MCP Endpoints

- `/mcp/mcp` - MCP server (Streamable HTTP for Claude Desktop and most clients)
- `/mcp/sse` - MCP server (SSE for older clients)

### Important Files

- `src/lib/presets.ts` - Defines all available documentation presets and their configurations
- `src/lib/mcpPresets.ts` - MCP-specific preset configurations
- `src/lib/fetchMarkdown.ts` - Core logic for fetching and processing GitHub markdown content
- `src/lib/presetCache.ts` - Database caching system with staleness detection
- `src/lib/mcpHandler.ts` - MCP protocol handler implementation
- `src/lib/handlers/` - MCP tool handlers (list_sections, get_documentation)
- `src/lib/server/presetDb.ts` - Database service layer for preset operations
- `src/lib/server/contentDb.ts` - Database service for content operations
- `src/lib/server/contentDistilledDb.ts` - Database service for distilled content
- `src/lib/server/contentSync.ts` - Content synchronization service
- `src/lib/server/schedulerService.ts` - Background scheduler for content updates
- `src/routes/[preset]/+server.ts` - Main documentation serving endpoint
- `migrations/` - Database migration files

### Database Schema

The application uses PostgreSQL with the following main tables:

- `presets` - Stores preset content and metadata
- `content` - Stores raw documentation content
- `content_distilled` - Stores AI-distilled documentation
- `distillation_jobs` - Tracks AI distillation processes
- `distillation_results` - Results from AI processing
- `cache` - General-purpose cache table

### Environment Setup

Required environment variables (see `.env.example`):

- `GITHUB_TOKEN` - Classic GitHub token with `public_repo` permissions for GitHub API access
- `DB_URL` - PostgreSQL connection string (default: `postgres://admin:admin@localhost:5432/db`)
- `ANTHROPIC_API_KEY` - Required for AI distillation features
- `DISTILL_SECRET_KEY` - Secret key for protected distillation endpoint (default: "secret")
- `CONTENT_SYNC_SECRET_KEY` - Secret key for content sync endpoint

Technical details:

- Uses Svelte 5 with runes syntax throughout the codebase
- Built with TypeScript and uses Vitest for testing
- Uses Zod for schema validation throughout the codebase

#### Initial Setup Steps

1. Copy `.env.example` to `.env` and fill in required values
2. Create a [Classic GitHub token](https://github.com/settings/tokens) with `public_repo` permissions
3. Set up PostgreSQL using `docker-compose up` (includes PostgreSQL, Adminer, Redis)
4. Run `npm install` to install dependencies
5. Run `npm run dev` to start the development server
6. Visit http://localhost:5173/api/migrate to run database migrations

#### Docker Services

The `docker-compose.yml` includes:

- **PostgreSQL** (port 5432) - Main database
- **Adminer** (port 8080) - Web-based database management UI
- **Redis** (port 6379) - Cache layer (optional)
- **Redis Commander** (port 8081) - Redis management UI
- **MCP Server** (port 3002) - Containerized MCP server

### MCP Integration

The application provides MCP endpoints for AI assistants:

- Streamable HTTP endpoint: `/mcp/mcp` (recommended for Claude Desktop and most clients)
- SSE endpoint: `/mcp/sse` (for older clients that don't support Streamable)
- Tools: `list_sections` and `get_documentation` for querying Svelte/SvelteKit docs

MCP local testing:

- Use `npm run mcp` to run the MCP inspector
- Configure `.vscode/mcp.json` for GitHub Copilot agent mode integration
- Production endpoint: `https://svelte-llm.stanislav.garden/mcp/mcp`

### Deployment Notes

- Uses Node.js adapter for production deployment
- Supports Docker deployment via included Dockerfile
- Database migrations are handled via `/api/migrate` endpoint
- All content is served from the database in production
- Scheduler service runs in production to keep content synchronized

## Development Workflow

### Adding New Presets

1. Edit `src/lib/presets.ts` and add new preset configuration
2. Preset structure includes: `title`, `description`, `glob` patterns, optional `prompt`, `minimize`, and `distilled` options
3. Glob patterns support include/exclude syntax (use `!pattern` in ignore array to exclude)
4. Test preset by visiting `/{preset-key}` endpoint
5. For MCP integration, also update `src/lib/mcpPresets.ts` if needed

### Distillation Process

- AI distillation uses Anthropic's Claude to condense documentation
- Triggered via `/api/update-distilled?secret_key=YOUR_KEY` endpoint
- Results stored in database with versioning (latest + date-based versions)
- In dev mode, processing is limited to 10 files for faster testing
- Creates separate Svelte-only and SvelteKit-only distilled versions
- Requires `ANTHROPIC_API_KEY` in environment variables

### Content Synchronization

- Automated scheduler runs in production to sync content from GitHub
- Manual sync available via `/api/sync-content?secret_key=YOUR_KEY`
- Check sync status at `/api/content-status`
- Scheduler status available at `/api/scheduler-status`

### Key Development Patterns

- All database operations go through service classes in `src/lib/server/`
- Content fetching and processing handled by `src/lib/fetchMarkdown.ts`
- Preset caching system in `src/lib/presetCache.ts` handles staleness detection
- MCP handlers in `src/lib/handlers/` implement specific tools
- MCP protocol handling in `src/lib/mcpHandler.ts`
- Uses Zod for schema validation throughout the codebase

## Guidelines

- Use comments sparingly
