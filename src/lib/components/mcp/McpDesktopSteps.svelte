<script lang="ts">
	import McpUrlBlock from './McpUrlBlock.svelte'

	let { url, steps }: { url: string; steps: string[] } = $props()
</script>

<div class="desktop-instructions">
	<McpUrlBlock label="MCP Server URL:" {url} />
	<div class="steps-block">
		<strong>Setup Steps:</strong>
		<ol class="setup-steps">
			{#each steps as step}
				<li>{step}</li>
			{/each}
		</ol>
	</div>
</div>

<style>
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

	@media (max-width: 768px) {
		.desktop-instructions {
			gap: 12px;
		}

		.setup-steps {
			padding-left: 16px;
		}
	}
</style>
