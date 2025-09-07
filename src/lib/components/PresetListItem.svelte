<script lang="ts">
	import { onMount } from 'svelte'
	import toast from 'svelte-french-toast'

	let { title, key, description, presetSizePromise, distilledVersionsPromise } = $props<{
		title: string
		key: string
		description?: string
		presetSizePromise?: Promise<{ key: string; sizeKb: number | null; error?: string }>
		distilledVersionsPromise?: Promise<{
			key: string
			versions: Array<{ filename: string; date: string; path: string; sizeKb: number }>
			error?: string
		}>
	}>()

	let sizeKb = $state<number | undefined>(undefined)
	let sizeLoading = $state<boolean>(true)
	let sizeError = $state<string | undefined>(undefined)
	let dialog = $state<HTMLDialogElement | null>(null)

	// Distilled versions state
	let distilledVersions = $state<
		Array<{ filename: string; date: string; path: string; sizeKb: number }>
	>([])
	let loadingVersions = $state<boolean>(true)
	let distilledError = $state<string | null>(null)

	// Use the streamed promise from the server load function for size
	onMount(async () => {
		if (presetSizePromise) {
			try {
				const result = await presetSizePromise
				if (result.error) {
					sizeError = result.error
				} else {
					sizeKb = result.sizeKb || undefined
				}
			} catch (error) {
				sizeError = 'Failed to load size'
			} finally {
				sizeLoading = false
			}
		} else {
			sizeError = 'Size data not available'
			sizeLoading = false
		}

		// Use the streamed promise from the server load function for distilled versions
		if (distilledVersionsPromise) {
			try {
				const result = await distilledVersionsPromise
				if (result.error) {
					distilledError = result.error
				} else {
					distilledVersions = result.versions
				}
			} catch (error) {
				distilledError = error instanceof Error ? error.message : 'Failed to load versions'
			} finally {
				loadingVersions = false
			}
		} else {
			loadingVersions = false
		}
	})

	async function copyToClipboard(e: Event) {
		e.preventDefault()

		const copyPromise = async () => {
			const response = await fetch(`/${key}`)
			if (!response.ok) {
				throw new Error('Failed to fetch content')
			}

			const text = await response.text()
			await navigator.clipboard.writeText(text)

			return text
		}

		toast.promise(copyPromise(), {
			loading: 'Copying...',
			success: 'Copied to clipboard!',
			error: 'Failed to copy content.'
		})
	}

	// Determine icon based on title
	function getPresetIcon(title: string): string {
		if (title.includes('🔮')) return 'crystal'
		if (title.includes('⭐')) return 'star'
		if (title.includes('Tiny')) return 'seed'
		if (title.includes('Medium')) return 'book'
		if (title.includes('Large') || title.includes('Full')) return 'library'
		if (title.includes('migration')) return 'arrow'
		if (title.includes('CLI')) return 'terminal'
		return 'document'
	}

	const iconType = getPresetIcon(title)
</script>

<article class="preset-card">
	<div class="preset-header">
		<div class="preset-icon" data-icon={iconType}>
			{#if iconType === 'crystal'}
				<svg
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
				>
					<path d="M12 2L8 7L12 12L16 7L12 2Z" />
					<path d="M8 7L4 12L8 17L12 12L8 7Z" />
					<path d="M16 7L12 12L16 17L20 12L16 7Z" />
					<path d="M12 12L8 17L12 22L16 17L12 12Z" />
				</svg>
			{:else if iconType === 'star'}
				<svg
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
				>
					<path
						d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
					/>
				</svg>
			{:else if iconType === 'book'}
				<svg
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
				>
					<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
					<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
				</svg>
			{:else if iconType === 'library'}
				<svg
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
				>
					<path d="M4 6h7v14H4z" />
					<path d="M14 6h7v14h-7z" />
					<path d="M4 2h7v2H4zM14 2h7v2h-7z" />
				</svg>
			{:else if iconType === 'seed'}
				<svg
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
				>
					<circle cx="12" cy="12" r="3" />
					<path d="M12 9V2M12 15v7M15 12h7M9 12H2" />
				</svg>
			{:else if iconType === 'arrow'}
				<svg
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
				>
					<path d="M7 7l10 10M17 7v10H7" />
				</svg>
			{:else if iconType === 'terminal'}
				<svg
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
				>
					<path d="M4 17l6-6-6-6M12 19h8" />
				</svg>
			{:else}
				<svg
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
				>
					<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
					<path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
				</svg>
			{/if}
		</div>

		<div class="preset-title-group">
			<h3>
				<a href="/{key}" class="preset-link">
					{title.replace(/[🔮⭐️]/g, '').trim()}
				</a>
			</h3>
			{#if description}
				<button
					class="info-button"
					onclick={() => dialog?.showModal()}
					aria-label="More information"
				>
					<svg
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<circle cx="12" cy="12" r="10" />
						<path d="M12 16v-4M12 8h.01" />
					</svg>
				</button>
			{/if}
		</div>

		{#if sizeKb}
			<div class="size-badge" data-loading="false">
				~{sizeKb}KB
			</div>
		{:else if sizeLoading}
			<div class="size-badge" data-loading="true">
				<span class="loading-dots">...</span>
			</div>
		{/if}
	</div>

	{#if description}
		<p class="preset-description">{description}</p>
	{/if}

	<div class="preset-actions">
		<a href="/{key}" class="action-button download">
			<svg
				width="14"
				height="14"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
			>
				<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
			</svg>
			<span>Download</span>
		</a>

		<button class="action-button copy" onclick={copyToClipboard}>
			<svg
				width="14"
				height="14"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
			>
				<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
				<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
			</svg>
			<span>Copy</span>
		</button>
	</div>

	{#if distilledVersionsPromise && distilledVersions?.length > 0}
		<details class="versions-details">
			<summary>
				<span>Previous versions</span>
				<svg
					width="12"
					height="12"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<path d="M6 9l6 6 6-6" />
				</svg>
			</summary>
			<ul class="versions-list">
				{#each distilledVersions as version}
					<li>
						<a href="/{key}?version={version.date}" class="version-link">
							{version.date}
							<span class="version-size">({version.sizeKb}KB)</span>
						</a>
					</li>
				{/each}
			</ul>
		</details>
	{/if}

	{#if description}
		<dialog bind:this={dialog} class="info-dialog">
			<form method="dialog">
				<div class="dialog-content">
					<h3>About this preset</h3>
					<p>{description}</p>
					<button class="dialog-close" autofocus>Close</button>
				</div>
			</form>
		</dialog>
	{/if}
</article>

<style>
	@import url('/src/app.css');

	.preset-card {
		background: var(--color-paper);
		border: 1px solid rgba(139, 109, 71, 0.1);
		border-radius: 12px;
		padding: var(--space-lg);
		position: relative;
		transition: all 0.3s var(--ease-out-expo);
		overflow: hidden;
	}

	.preset-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 3px;
		background: linear-gradient(
			90deg,
			var(--color-sage) 0%,
			var(--color-rust) 50%,
			var(--color-clay) 100%
		);
		transform: scaleX(0);
		transform-origin: left;
		transition: transform 0.3s var(--ease-out-expo);
	}

	.preset-card:hover {
		transform: translateY(-2px);
		box-shadow:
			0 10px 30px rgba(139, 109, 71, 0.08),
			0 2px 8px rgba(139, 109, 71, 0.04);
	}

	.preset-card:hover::before {
		transform: scaleX(1);
	}

	.preset-header {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		margin-bottom: var(--space-sm);
	}

	.preset-icon {
		flex-shrink: 0;
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-cream);
		border: 1px solid rgba(107, 124, 91, 0.2);
		border-radius: 10px;
		color: var(--color-sage-dark);
		transition: all 0.3s var(--ease-out-expo);
	}

	.preset-icon[data-icon='crystal'] {
		color: var(--color-rust);
		border-color: rgba(194, 105, 79, 0.2);
	}

	.preset-card:hover .preset-icon {
		transform: rotate(10deg) scale(1.05);
	}

	.preset-title-group {
		flex: 1;
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.preset-title-group h3 {
		margin: 0;
		font-family: var(--font-serif);
		font-size: var(--text-lg);
		font-weight: 600;
	}

	.preset-link {
		color: var(--color-charcoal);
		text-decoration: none;
		position: relative;
	}

	.preset-link::after {
		content: '';
		position: absolute;
		bottom: -2px;
		left: 0;
		width: 0;
		height: 1px;
		background: var(--color-rust);
		transition: width 0.3s var(--ease-out-expo);
	}

	.preset-link:hover {
		color: var(--color-rust);
	}

	.preset-link:hover::after {
		width: 100%;
	}

	.info-button {
		background: none;
		border: none;
		color: var(--color-stone);
		cursor: help;
		padding: 4px;
		border-radius: 4px;
		transition: all 0.2s var(--ease-out-expo);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.info-button:hover {
		color: var(--color-sage-dark);
		background: rgba(107, 124, 91, 0.1);
	}

	.size-badge {
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-sage);
		color: var(--color-cream);
		font-size: var(--text-xs);
		font-weight: 600;
		font-family: var(--font-mono);
		border-radius: 20px;
		letter-spacing: 0.5px;
	}

	.size-badge[data-loading='true'] {
		background: var(--color-stone);
		opacity: 0.5;
	}

	.loading-dots {
		animation: pulse 1.5s infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 0.3;
		}
		50% {
			opacity: 1;
		}
	}

	.preset-description {
		color: var(--color-charcoal);
		font-size: var(--text-sm);
		line-height: 1.6;
		margin: 0 0 var(--space-md) 0;
		opacity: 0.9;
	}

	.preset-actions {
		display: flex;
		gap: var(--space-sm);
	}

	.action-button {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-xs) var(--space-md);
		background: var(--color-cream);
		border: 1px solid rgba(139, 109, 71, 0.15);
		border-radius: 8px;
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--color-charcoal);
		text-decoration: none;
		cursor: pointer;
		transition: all 0.2s var(--ease-out-expo);
	}

	.action-button svg {
		flex-shrink: 0;
		width: 14px;
		height: 14px;
		stroke: currentColor;
	}

	.action-button:hover {
		background: var(--color-sage);
		color: var(--color-cream);
		border-color: var(--color-sage);
		transform: translateY(-1px);
	}

	.action-button.download:hover {
		background: var(--color-rust);
		border-color: var(--color-rust);
	}

	.versions-details {
		margin-top: var(--space-md);
		padding-top: var(--space-md);
		border-top: 1px dashed rgba(139, 109, 71, 0.15);
	}

	.versions-details summary {
		cursor: pointer;
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--color-stone);
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		transition: color 0.2s var(--ease-out-expo);
	}

	.versions-details summary:hover {
		color: var(--color-sage-dark);
	}

	.versions-details summary svg {
		transition: transform 0.2s var(--ease-out-expo);
	}

	.versions-details[open] summary svg {
		transform: rotate(180deg);
	}

	.versions-list {
		margin: var(--space-sm) 0 0 0;
		padding: 0 0 0 var(--space-lg);
		list-style: none;
	}

	.versions-list li {
		margin: var(--space-xs) 0;
	}

	.version-link {
		color: var(--color-sage-dark);
		font-size: var(--text-sm);
		text-decoration: none;
	}

	.version-link:hover {
		color: var(--color-rust);
	}

	.version-size {
		color: var(--color-stone);
		font-size: var(--text-xs);
		margin-left: var(--space-xs);
	}

	/* Dialog Styles */
	.info-dialog {
		border: none;
		border-radius: 16px;
		padding: 0;
		background: var(--color-paper);
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
		max-width: 400px;
		width: 90vw;
	}

	.info-dialog::backdrop {
		background: rgba(26, 24, 22, 0.4);
		backdrop-filter: blur(8px);
	}

	.dialog-content {
		padding: var(--space-xl);
	}

	.dialog-content h3 {
		margin: 0 0 var(--space-md) 0;
		font-family: var(--font-serif);
		font-size: var(--text-xl);
		color: var(--color-ink);
	}

	.dialog-content p {
		margin: 0 0 var(--space-lg) 0;
		color: var(--color-charcoal);
		line-height: 1.6;
		font-size: var(--text-base);
	}

	.dialog-close {
		background: var(--color-sage);
		color: var(--color-cream);
		border: none;
		border-radius: 8px;
		padding: var(--space-sm) var(--space-lg);
		font-size: var(--text-sm);
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s var(--ease-out-expo);
		margin-left: auto;
		display: block;
	}

	.dialog-close:hover {
		background: var(--color-sage-dark);
		transform: translateY(-1px);
	}

	@media (max-width: 768px) {
		.preset-card {
			padding: var(--space-md);
		}

		.preset-header {
			flex-wrap: wrap;
		}

		.preset-actions {
			flex-direction: column;
			gap: var(--space-xs);
		}

		.action-button {
			justify-content: center;
			width: 100%;
		}
	}
</style>
