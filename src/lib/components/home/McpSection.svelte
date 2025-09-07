<script lang="ts">
	import McpClientButton from '$lib/components/mcp/McpClientButton.svelte'
	import McpClientInstructions from '$lib/components/mcp/McpClientInstructions.svelte'
	import CopyIcon from '$lib/components/CopyIcon.svelte'
	import toast from 'svelte-french-toast'

	let { sseEndpoint, streamableEndpoint }: { sseEndpoint: string; streamableEndpoint: string } =
		$props()

	const NPX_COMMAND = `npx mcp-remote ${streamableEndpoint}`

	let selectedClient = $state<string | null>(null)
	let promptExpanded = $state(false)

	const MCP_SYSTEM_PROMPT = `When connected to the svelte-llm MCP server, you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

## Available MCP Tools:

### 1. list_sections
Use this FIRST to discover all available documentation sections. Returns a structured list with titles and paths.
Example usage: Always start by calling list_sections when asked about Svelte/SvelteKit topics.

### 2. get_documentation
Retrieves full documentation content for specific sections. Accepts single or multiple sections.
- Can search by title (e.g., "$state", "routing") 
- Can search by path (e.g., "docs/svelte/state.md")
- Supports arrays for fetching multiple sections at once
Strategy: After listing sections, fetch ALL relevant sections for the user's query in a single call.

### 3. Template Prompts (Most Efficient)
Pre-curated documentation sets for instant context:
- svelte-core: Core Svelte 5 (introduction, runes, template syntax, styling)
- svelte-advanced: Advanced Svelte 5 (special elements, runtime, misc)
- svelte-complete: Complete Svelte 5 documentation
- sveltekit-core: Core SvelteKit (getting started, core concepts)
- sveltekit-production: Production SvelteKit (build/deploy, advanced, best practices)
- sveltekit-complete: Complete SvelteKit documentation

### 4. Resources
Direct access to documentation via URIs:
- Preset resources: svelte-llm://svelte-core, svelte-llm://sveltekit-complete, etc.
- Individual docs: svelte-llm://doc/[path] for specific files

## Optimal Usage Strategy:

1. **For General Questions**: Use template prompts (svelte-core, sveltekit-core) for immediate context
2. **For Specific Topics**: Use list_sections → get_documentation for targeted content
3. **For Development**: Access resources directly for reference while coding
4. **For Complete Context**: Combine multiple template prompts as needed

## Best Practices:
- Start with template prompts when possible (they're pre-optimized)
- Use get_documentation with arrays to fetch multiple sections efficiently
- Only use list_sections + get_documentation when template prompts don't cover your needs
- Combine svelte and sveltekit prompts for full-stack questions`

	async function copySystemPrompt() {
		try {
			await navigator.clipboard.writeText(MCP_SYSTEM_PROMPT)
			toast.success('MCP system prompt copied to clipboard!')
		} catch {
			toast.error('Failed to copy to clipboard')
		}
	}

	const mcpClients = [
		{
			id: 'claude-code',
			name: 'Claude Code',
			icon: '🔧',
			description:
				'The official Anthropic command-line tool. Run this command to add the MCP server:',
			instruction: `claude mcp add --transport http --scope project svelte-llm ${streamableEndpoint}`,
			isCommand: true
		},
		{
			id: 'claude-desktop',
			name: 'Claude Desktop',
			icon: '🖥️',
			description: 'The official Claude Desktop application with MCP integration support.',
			url: streamableEndpoint,
			isDesktop: true,
			steps: [
				'Navigate to Settings > Integrations',
				'Locate the "Integrations" section',
				'Click "Add custom integration" at the bottom of the section',
				'Add your integration\'s remote MCP server URL and name it "svelte-llm"',
				'Finish configuring your integration by clicking "Add"'
			]
		},
		{
			id: 'github-copilot',
			name: 'GitHub Copilot',
			icon: '🐙',
			description:
				'GitHub Copilot extension for VS Code - put this in .vscode/mcp.json inside a "servers" object.',
			instruction: `{
  "svelte-llm": {
    "command": "npx",
    "args": ["mcp-remote", "${streamableEndpoint}"]
  }
}`,
			isConfig: true
		},
		{
			id: 'cline',
			name: 'Cline',
			icon: '🧑‍💻',
			url: sseEndpoint,
			description:
				'Add this URL to your Cline MCP settings. Name the MCP svelte-llm or whatever you like.'
		},
		{
			id: 'codex-cli',
			name: 'OpenAI Codex',
			icon: '🧰',
			description: 'Add this to ~/.codex/config.toml',
			instruction: `[mcp_servers.svelte-llm]
command = "npx"
args = ["-y", "mcp-remote", "${streamableEndpoint}"]
`,
			isConfig: true
		},
		{
			id: 'others',
			name: 'Other Clients',
			icon: '🔗',
			description: 'Choose the appropriate endpoint for your MCP client:',
			isOthers: true,
			endpoints: [
				{
					type: 'Server-Sent Events (SSE)',
					description: 'For clients supporting Server-Sent Events',
					value: sseEndpoint
				},
				{
					type: 'Streamable HTTP',
					description: 'For most modern MCP-compatible clients',
					value: streamableEndpoint
				},
				{
					type: 'Local npx command',
					description: 'For older clients that only support local MCP servers',
					value: NPX_COMMAND,
					isCommand: true
				}
			]
		}
	]

	function handleClientSelect(clientId: string) {
		selectedClient = selectedClient === clientId ? null : clientId
	}
</script>

<section class="mcp-section">
	<div class="section-header">
		<div class="mcp-badge-header">
			<span class="recommended-badge">Recommended</span>
			<h2>MCP Server</h2>
		</div>
		<p class="section-description">
			Connect your AI assistant directly to live Svelte documentation using the Model Context
			Protocol. Choose your client below for setup instructions.
		</p>
	</div>

	<!-- System Prompt Section -->
	<div class="system-prompt-container">
		<div class="prompt-header">
			<div class="prompt-title">
				<span class="prompt-icon">💡</span>
				<strong>Recommended System Prompt for MCP Usage</strong>
			</div>
			<div class="prompt-actions">
				<button class="prompt-toggle" onclick={() => (promptExpanded = !promptExpanded)}>
					{promptExpanded ? 'Collapse' : 'Expand'}
				</button>
				<button class="prompt-copy" onclick={copySystemPrompt}>
					<CopyIcon />
					Copy
				</button>
			</div>
		</div>

		{#if !promptExpanded}
			<div class="prompt-preview">
				<code>When connected to the svelte-llm MCP server, you have access to comprehensive...</code
				>
				<button class="expand-hint" onclick={() => (promptExpanded = true)}>
					Click to see full prompt
				</button>
			</div>
		{:else}
			<div class="prompt-content">
				<pre><code>{MCP_SYSTEM_PROMPT}</code></pre>
			</div>
		{/if}

		<div class="prompt-usage">
			<p>
				<strong>How to use:</strong> Add this to your AI assistant's system message or custom instructions
				to help it understand how to use the MCP tools effectively.
			</p>
		</div>
	</div>

	<div class="mcp-clients">
		<div class="client-selector">
			{#each mcpClients as client}
				<McpClientButton
					id={client.id}
					name={client.name}
					icon={client.icon}
					isActive={selectedClient === client.id}
					onclick={() => handleClientSelect(client.id)}
				/>
			{/each}
		</div>

		{#if selectedClient}
			{@const client = mcpClients.find((c) => c.id === selectedClient)}
			{#if client}
				<McpClientInstructions {client} />
			{/if}
		{/if}
	</div>
</section>

<style>
	.mcp-section {
		background: white;
		border-radius: 16px;
		padding: 32px;
		box-shadow:
			0 8px 32px rgba(0, 0, 0, 0.08),
			0 4px 16px rgba(0, 0, 0, 0.04);
		border: 1px solid rgba(0, 0, 0, 0.06);
		margin-bottom: 40px;
		position: relative;
		overflow: hidden;
	}

	.mcp-section::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 4px;
		background: linear-gradient(90deg, #ff3e00 0%, #ff6b35 100%);
	}

	.section-header {
		margin-bottom: 24px;
		padding-top: 12px;
	}

	.section-header h2 {
		font-size: 24px;
		font-weight: 700;
		margin: 0 0 8px 0;
		color: #1d1d1f;
		letter-spacing: -0.01em;
		position: relative;
		padding-bottom: 6px;
	}

	.section-header h2::after {
		content: '';
		position: absolute;
		bottom: 0;
		left: 0;
		width: 60px;
		height: 3px;
		background: linear-gradient(90deg, #ff3e00 0%, #ff6b35 100%);
		border-radius: 2px;
	}

	.section-description {
		font-size: 16px;
		color: #6e6e73;
		margin: 0;
		line-height: 1.5;
		max-width: 600px;
	}

	.mcp-badge-header {
		display: flex;
		align-items: center;
		gap: 16px;
		margin-bottom: 8px;
	}

	.recommended-badge {
		background: linear-gradient(135deg, #4ade80, #22c55e);
		color: white;
		font-size: 12px;
		font-weight: 600;
		padding: 6px 12px;
		border-radius: 8px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3);
	}

	/* System Prompt Styles */
	.system-prompt-container {
		background: #f8fafc;
		border-radius: 12px;
		border: 1px solid rgba(0, 0, 0, 0.08);
		margin-bottom: 24px;
		overflow: hidden;
	}

	.prompt-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px 20px;
		background: white;
		border-bottom: 1px solid rgba(0, 0, 0, 0.08);
	}

	.prompt-title {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 14px;
		color: #374151;
	}

	.prompt-icon {
		font-size: 16px;
	}

	.prompt-actions {
		display: flex;
		gap: 8px;
	}

	.prompt-toggle {
		background: #f3f4f6;
		color: #374151;
		border: 1px solid rgba(0, 0, 0, 0.08);
		border-radius: 6px;
		padding: 6px 12px;
		font-size: 12px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.prompt-toggle:hover {
		background: #e5e7eb;
		transform: translateY(-1px);
	}

	.prompt-copy {
		background: #ff3e00;
		color: white;
		border: none;
		border-radius: 6px;
		padding: 6px 12px;
		font-size: 12px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.prompt-copy:hover {
		background: #e63600;
		transform: translateY(-1px);
	}

	.prompt-preview {
		padding: 16px 20px;
		background: linear-gradient(
			to bottom,
			rgba(248, 250, 252, 1) 0%,
			rgba(248, 250, 252, 0.8) 100%
		);
	}

	.prompt-preview code {
		font-family:
			'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
		font-size: 12px;
		color: #6b7280;
		display: block;
		margin-bottom: 8px;
	}

	.expand-hint {
		background: white;
		color: #ff3e00;
		border: 1px solid #ff3e00;
		border-radius: 6px;
		padding: 6px 12px;
		font-size: 12px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.expand-hint:hover {
		background: #ff3e00;
		color: white;
	}

	.prompt-content {
		max-height: 400px;
		overflow-y: auto;
		padding: 16px 20px;
	}

	.prompt-content pre {
		margin: 0;
	}

	.prompt-content code {
		font-family:
			'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
		font-size: 12px;
		line-height: 1.6;
		color: #1f2937;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.prompt-usage {
		padding: 12px 20px;
		background: #f0f4f8;
		border-top: 1px solid rgba(0, 0, 0, 0.08);
	}

	.prompt-usage p {
		margin: 0;
		font-size: 13px;
		color: #4b5563;
		line-height: 1.5;
	}

	.prompt-usage strong {
		color: #1f2937;
	}

	.client-selector {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
		gap: 12px;
		margin-bottom: 24px;
	}

	@media (max-width: 768px) {
		.mcp-section {
			padding: 24px;
		}

		.mcp-badge-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 8px;
		}

		.client-selector {
			grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		}

		.section-header h2 {
			font-size: 24px;
		}

		.section-description {
			font-size: 16px;
		}

		.prompt-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 12px;
		}

		.prompt-actions {
			width: 100%;
			justify-content: space-between;
		}

		.prompt-title {
			font-size: 13px;
		}
	}
</style>
