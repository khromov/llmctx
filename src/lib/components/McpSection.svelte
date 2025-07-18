<script lang="ts">
	import toast from 'svelte-french-toast'

	const SSE_ENDPOINT = 'https://svelte-llm.khromov.se/mcp/sse'
	const STREAMABLE_ENDPOINT = 'https://svelte-llm.khromov.se/mcp/mcp'
	const NPX_COMMAND = `npx mcp-remote ${STREAMABLE_ENDPOINT}`

	// SVG icon string to avoid duplication
	const COPY_ICON = `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
		<path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
		<path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
	</svg>`

	// MCP client selection state
	let selectedClient = $state<string | null>(null)

	const mcpClients = [
		{
			id: 'claude-code',
			name: 'Claude Code',
			icon: '🔧',
			description:
				'The official Anthropic command-line tool. Run this command to add the MCP server:',
			instruction: `claude mcp add --transport sse --scope user svelte-llm ${SSE_ENDPOINT}`,
			isCommand: true
		},
		{
			id: 'claude-desktop',
			name: 'Claude Desktop',
			icon: '🖥️',
			description: 'The official Claude Desktop application with MCP integration support.',
			url: SSE_ENDPOINT,
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
    "args": ["mcp-remote", "${STREAMABLE_ENDPOINT}"]
  }
}`,
			isConfig: true
		},
		{
			id: 'cline',
			name: 'Cline',
			icon: '🧑‍💻',
			url: SSE_ENDPOINT,
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
					value: SSE_ENDPOINT
				},
				{
					type: 'Streamable HTTP',
					description: 'For most modern MCP-compatible clients',
					value: STREAMABLE_ENDPOINT
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

	async function copyToClipboard(text: string) {
		try {
			await navigator.clipboard.writeText(text)
			toast.success('Copied to clipboard!')
		} catch {
			toast.error('Failed to copy to clipboard')
		}
	}
</script>

<section class="mcp-section">
	<div class="section-header">
		<div class="mcp-badge-header">
			<span class="recommended-badge">Recommended</span>
			<h2>MCP Server Integration</h2>
		</div>
		<p class="section-description">
			Connect your AI assistant directly to live Svelte documentation using the Model Context
			Protocol. Choose your client below for setup instructions.
		</p>
	</div>

	<div class="mcp-clients">
		<div class="client-selector">
			{#each mcpClients as client}
				<button
					class="client-button"
					class:active={selectedClient === client.id}
					onclick={() => (selectedClient = selectedClient === client.id ? null : client.id)}
				>
					<span class="client-icon">{client.icon}</span>
					<span class="client-name">{client.name}</span>
				</button>
			{/each}
		</div>

		{#if selectedClient}
			{@const client = mcpClients.find((c) => c.id === selectedClient)}
			{#if client}
				<div class="client-instructions">
					<div class="instruction-header">
						<span class="client-icon-large">{client.icon}</span>
						<div>
							<h3>{client.name}</h3>
							<p>{client.description}</p>
						</div>
					</div>

					<div class="instruction-content">
						{#if client.isDesktop}
							<div class="desktop-instructions">
								<div class="url-block">
									<strong>MCP Server URL:</strong>
									<code>{client.url}</code>
									<button class="copy-btn" onclick={() => copyToClipboard(client.url)}>
										{@html COPY_ICON}
										Copy
									</button>
								</div>
								<div class="steps-block">
									<strong>Setup Steps:</strong>
									<ol class="setup-steps">
										{#each client.steps as step}
											<li>{step}</li>
										{/each}
									</ol>
								</div>
							</div>
						{:else if client.isCommand}
							<div class="code-block">
								<code>{client.instruction}</code>
								<button class="copy-btn" onclick={() => copyToClipboard(client.instruction)}>
									{@html COPY_ICON}
									Copy
								</button>
							</div>
						{:else if client.isConfig}
							<div class="config-block">
								<pre><code>{client.instruction}</code></pre>
								<button class="copy-btn" onclick={() => copyToClipboard(client.instruction)}>
									{@html COPY_ICON}
									Copy
								</button>
							</div>
						{:else if client.isOthers}
							<div class="others-endpoints">
								{#each client.endpoints as endpoint}
									<div class="endpoint-item">
										<div class="endpoint-header">
											<strong>{endpoint.type}</strong>
											<span class="endpoint-description">{endpoint.description}</span>
										</div>
										<div class={endpoint.isCommand ? 'code-block' : 'url-block'}>
											<code>{endpoint.value}</code>
											<button class="copy-btn" onclick={() => copyToClipboard(endpoint.value)}>
												{@html COPY_ICON}
												Copy
											</button>
										</div>
									</div>
								{/each}
							</div>
						{:else if client.url}
							<div class="url-block">
								<strong>URL:</strong>
								<code>{client.url}</code>
								<button class="copy-btn" onclick={() => copyToClipboard(client.url)}>
									{@html COPY_ICON}
									Copy
								</button>
							</div>
						{/if}
					</div>
				</div>
			{/if}
		{/if}
	</div>
</section>

<style>
	/* MCP Section */
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
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 12px;
		margin-bottom: 24px;
	}

	.client-button {
		background: #f5f5f7;
		border: 2px solid rgba(0, 0, 0, 0.08);
		border-radius: 12px;
		padding: 16px 12px;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		text-align: center;
	}

	.client-button:hover {
		background: #eef7ff;
		border-color: #007aff;
		transform: translateY(-2px);
		box-shadow: 0 4px 16px rgba(0, 122, 255, 0.15);
	}

	.client-button.active {
		background: #007aff;
		border-color: #007aff;
		color: white;
		transform: translateY(-2px);
		box-shadow: 0 4px 16px rgba(0, 122, 255, 0.3);
	}

	.client-icon {
		font-size: 24px;
		line-height: 1;
	}

	.client-name {
		font-weight: 600;
		font-size: 14px;
	}

	.client-instructions {
		background: #f8fafc;
		border-radius: 12px;
		padding: 24px;
		border: 1px solid rgba(0, 0, 0, 0.06);
		animation: fadeIn 0.3s ease;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.instruction-header {
		display: flex;
		align-items: flex-start;
		gap: 16px;
		margin-bottom: 20px;
	}

	.client-icon-large {
		font-size: 32px;
		line-height: 1;
	}

	.instruction-header h3 {
		font-size: 18px;
		font-weight: 600;
		margin: 0 0 4px 0;
		color: #1d1d1f;
	}

	.instruction-header p {
		margin: 0;
		color: #6e6e73;
		font-size: 14px;
	}

	.desktop-instructions {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.steps-block {
		background: white;
		border-radius: 8px;
		padding: 16px;
		border: 1px solid rgba(0, 0, 0, 0.08);
	}

	.steps-block strong {
		font-size: 14px;
		color: #1d1d1f;
		margin-bottom: 8px;
		display: block;
	}

	.setup-steps {
		margin: 0;
		padding-left: 20px;
		color: #6e6e73;
	}

	.setup-steps li {
		margin: 8px 0;
		line-height: 1.4;
	}

	.others-endpoints {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.endpoint-item {
		background: white;
		border-radius: 8px;
		padding: 16px;
		border: 1px solid rgba(0, 0, 0, 0.08);
	}

	.endpoint-header {
		display: flex;
		align-items: baseline;
		gap: 8px;
		margin-bottom: 8px;
	}

	.endpoint-header strong {
		font-size: 14px;
		color: #1d1d1f;
		min-width: 120px;
		flex-shrink: 0;
	}

	.endpoint-description {
		font-size: 13px;
		color: #6e6e73;
	}

	.code-block,
	.config-block,
	.url-block {
		background: #1e1e1e;
		border-radius: 8px;
		padding: 16px;
		font-family:
			'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
		font-size: 13px;
		position: relative;
		border: 1px solid rgba(0, 0, 0, 0.1);
	}

	.code-block code,
	.config-block code {
		color: #e5e7eb;
		display: block;
		word-break: break-all;
	}

	.config-block pre {
		margin: 0;
		white-space: pre-wrap;
	}

	.url-block {
		background: #f5f5f7;
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}

	.url-block strong {
		color: #1d1d1f;
		font-size: 14px;
	}

	.url-block code {
		color: #007aff;
		font-size: 13px;
		word-break: break-all;
		flex: 1;
		min-width: 200px;
	}

	.copy-btn {
		position: absolute;
		top: 12px;
		right: 12px;
		background: #374151;
		color: white;
		border: none;
		border-radius: 6px;
		padding: 8px 12px;
		font-size: 12px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.url-block .copy-btn {
		position: static;
		background: #f5f5f7;
		color: #1d1d1f;
		border: 1px solid rgba(0, 0, 0, 0.08);
		white-space: nowrap;
	}

	.copy-btn:hover {
		background: #007aff;
		color: white;
		transform: translateY(-1px);
	}

	/* Responsive Design */
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

		.client-instructions .code-block,
		.client-instructions .config-block {
			padding-bottom: 10px;
		}

		.client-instructions .copy-btn {
			position: static;
			margin-top: 12px;
			width: 100%;
			justify-content: center;
		}

		.url-block {
			flex-direction: column;
			align-items: flex-start;
		}

		.url-block code {
			min-width: unset;
			width: 100%;
		}

		.endpoint-header {
			gap: 4px;
		}

		.desktop-instructions {
			gap: 12px;
		}

		.setup-steps {
			padding-left: 16px;
		}
	}
</style>
