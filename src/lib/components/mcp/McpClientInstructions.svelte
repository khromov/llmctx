<script lang="ts">
	import McpUrlBlock from './McpUrlBlock.svelte'
	import McpCodeBlock from './McpCodeBlock.svelte'
	import McpDesktopSteps from './McpDesktopSteps.svelte'

	interface McpClient {
		id: string
		name: string
		icon: string
		description: string
		instruction?: string
		url?: string
		isCommand?: boolean
		isDesktop?: boolean
		isConfig?: boolean
		isOthers?: boolean
		steps?: string[]
		endpoints?: Array<{
			type: string
			description: string
			value: string
			isCommand?: boolean
		}>
	}

	let { client }: { client: McpClient } = $props()
</script>

<div class="client-instructions">
	<div class="instruction-header">
		<span class="client-icon-large">{client.icon}</span>
		<div>
			<h3>{client.name}</h3>
			<p>{client.description}</p>
		</div>
	</div>

	<div class="instruction-content">
		{#if client.isDesktop && client.url && client.steps}
			<McpDesktopSteps url={client.url} steps={client.steps} />
		{:else if client.isCommand && client.instruction}
			<McpCodeBlock code={client.instruction} />
		{:else if client.isConfig && client.instruction}
			<McpCodeBlock code={client.instruction} variant="config" />
		{:else if client.isOthers && client.endpoints}
			<div class="others-endpoints">
				{#each client.endpoints as endpoint}
					<div class="endpoint-item">
						<div class="endpoint-header">
							<strong>{endpoint.type}</strong>
							<span class="endpoint-description">{endpoint.description}</span>
						</div>
						{#if endpoint.isCommand}
							<McpCodeBlock code={endpoint.value} />
						{:else}
							<McpUrlBlock label="" url={endpoint.value} />
						{/if}
					</div>
				{/each}
			</div>
		{:else if client.url}
			<McpUrlBlock label="URL:" url={client.url} />
		{/if}
	</div>
</div>

<style>
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

	@media (max-width: 768px) {
		.endpoint-header {
			gap: 4px;
		}
	}
</style>
