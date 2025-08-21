<script lang="ts">
	import CopyIcon from '$lib/components/CopyIcon.svelte'
	import toast from 'svelte-french-toast'

	let {
		code,
		variant = 'default'
	}: {
		code: string
		variant?: 'default' | 'config'
	} = $props()

	async function copyToClipboard() {
		try {
			await navigator.clipboard.writeText(code)
			toast.success('Copied to clipboard!')
		} catch {
			toast.error('Failed to copy to clipboard')
		}
	}
</script>

<div class="code-block" class:config={variant === 'config'}>
	{#if variant === 'config'}
		<pre><code>{code}</code></pre>
	{:else}
		<code>{code}</code>
	{/if}
	<button class="copy-btn" onclick={copyToClipboard}>
		<CopyIcon />
		Copy
	</button>
</div>

<style>
	.code-block {
		background: #1e1e1e;
		border-radius: 8px;
		padding: 16px;
		font-family:
			'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
		font-size: 13px;
		position: relative;
		border: 1px solid rgba(0, 0, 0, 0.1);
	}

	.code-block code {
		color: #e5e7eb;
		display: block;
		word-break: break-all;
	}

	.code-block.config pre {
		margin: 0;
		white-space: pre-wrap;
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

	.copy-btn:hover {
		background: #007aff;
		color: white;
		transform: translateY(-1px);
	}

	@media (max-width: 768px) {
		.code-block {
			padding-bottom: 10px;
		}

		.copy-btn {
			position: static;
			margin-top: 12px;
			width: 100%;
			justify-content: center;
		}
	}
</style>
