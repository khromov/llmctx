<script lang="ts">
	import McpClientButton from '$lib/components/mcp/McpClientButton.svelte'
	import McpClientInstructions from '$lib/components/mcp/McpClientInstructions.svelte'

	let { sseEndpoint, streamableEndpoint }: { sseEndpoint: string; streamableEndpoint: string } =
		$props()

	const NPX_COMMAND = `npx mcp-remote ${streamableEndpoint}`

	let selectedClient = $state<string | null>(null)

	const mcpClients = [
		{
			id: 'claude-code',
			name: 'Claude Code',
			icon: '🔧',
			description:
				'The official Anthropic command-line tool. Run this command to add the MCP server:',
			instruction: `claude mcp add --transport sse --scope project svelte-llm ${sseEndpoint}`,
			isCommand: true
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
		margin-bottom: 16px;
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
	}
</style>
