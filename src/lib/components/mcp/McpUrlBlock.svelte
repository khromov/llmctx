<script lang="ts">
	import CopyIcon from '$lib/components/CopyIcon.svelte'
	import toast from 'svelte-french-toast'

	let {
		label,
		url,
		variant = 'default'
	}: {
		label: string
		url: string
		variant?: 'default' | 'command'
	} = $props()

	async function copyToClipboard() {
		try {
			await navigator.clipboard.writeText(url)
			toast.success('Copied to clipboard!')
		} catch {
			toast.error('Failed to copy to clipboard')
		}
	}
</script>

<div class="url-block" class:command={variant === 'command'}>
	{#if label}
		<strong>{label}</strong>
	{/if}
	<code>{url}</code>
	<button class="copy-btn" onclick={copyToClipboard}>
		<CopyIcon />
		Copy
	</button>
</div>

<style>
	.url-block {
		background: #f5f5f7;
		border-radius: 8px;
		padding: 16px;
		font-family:
			'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
		font-size: 13px;
		position: relative;
		border: 1px solid rgba(0, 0, 0, 0.1);
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}

	.url-block.command {
		background: #1e1e1e;
	}

	.url-block.command code {
		color: #e5e7eb;
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
		background: #f5f5f7;
		color: #1d1d1f;
		border: 1px solid rgba(0, 0, 0, 0.08);
		border-radius: 6px;
		padding: 8px 12px;
		font-size: 12px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		gap: 6px;
		white-space: nowrap;
	}

	.command .copy-btn {
		background: #374151;
		color: white;
	}

	.copy-btn:hover {
		background: #007aff;
		color: white;
		transform: translateY(-1px);
	}

	@media (max-width: 768px) {
		.url-block {
			flex-direction: column;
			align-items: flex-start;
		}

		.url-block code {
			min-width: unset;
			width: 100%;
		}
	}
</style>
