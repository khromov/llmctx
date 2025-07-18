<script lang="ts">
	import { onMount } from 'svelte'
	import toast from 'svelte-french-toast'
	import CopyIcon from './CopyIcon.svelte'
	import DownloadIcon from './DownloadIcon.svelte'

	let { title, key, description, distilledVersions, loadingVersions, distilledError } = $props<{
		title: string
		key: string
		description?: string
		distilledVersions?: Array<{ filename: string; date: string; path: string; sizeKb: number }>
		loadingVersions?: boolean
		distilledError?: string | null
	}>()

	let sizeKb = $state<number | undefined>(undefined)
	let sizeLoading = $state<boolean | undefined>(undefined)
	let sizeError = $state<string | undefined>(undefined)
	let dialog = $state<HTMLDialogElement | null>(null)

	onMount(async () => {
		try {
			sizeLoading = true
			const response = await fetch(`/${key}/size`)
			if (!response.ok) throw new Error('Failed to fetch size')
			const data = await response.json()
			sizeKb = data.sizeKb
		} catch {
			sizeError = 'Failed to load size'
		} finally {
			sizeLoading = false
		}
	})

	async function copyToClipboard(e: Event) {
		e.preventDefault()

		const copyPromise = async () => {
			// Fetch the preset content
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
</script>

<div class="preset-item">
	<div class="preset-header">
		<a href="/{key}" class="preset-title">{title}</a>
		{#if description}
			<button class="info-button" onclick={() => dialog?.showModal()}>
				<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
					<circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" fill="none" />
					<text x="8" y="12" text-anchor="middle" font-size="10" font-weight="600">?</text>
				</svg>
			</button>
			<dialog bind:this={dialog} class="info-dialog">
				<form method="dialog">
					<div class="dialog-content">
						<h3>About this preset</h3>
						<p>{description}</p>
						<!-- svelte-ignore a11y_autofocus -->
						<button autofocus class="close-button">Close</button>
					</div>
				</form>
			</dialog>
		{/if}
	</div>

	{#if description}
		<p class="preset-description">{description}</p>
	{/if}

	<div class="preset-actions">
		<div class="action-buttons">
			<a href="/{key}" class="download-button">
				<DownloadIcon />
				Download
			</a>
			<button class="copy-button" onclick={copyToClipboard}>
				<CopyIcon />
				Copy preset to clipboard
			</button>
		</div>

		<div class="size-info">
			{#if sizeKb}
				<span class="size-badge">~{sizeKb}KB</span>
			{:else if sizeLoading}
				<span class="size-badge loading">Loading...</span>
			{:else if sizeError}
				<span class="size-badge error">Size unavailable</span>
			{/if}
		</div>
	</div>

	{#if distilledVersions !== undefined}
		{#if loadingVersions}
			<div class="versions-status"><em>Loading previous distilled versions...</em></div>
		{:else if distilledError}
			<div class="versions-status error"><em>Error: {distilledError}</em></div>
		{:else if distilledVersions?.length > 0}
			<div class="distilled-versions">
				<details>
					<summary>Previous distilled versions</summary>
					<ul>
						{#each distilledVersions as version}
							<li>
								<a href="/{key}?version={version.date}">
									{version.date}
								</a>
								<span class="version-size-badge">({version.sizeKb}KB)</span>
							</li>
						{/each}
					</ul>
				</details>
			</div>
		{/if}
	{/if}
</div>

<style>
	.preset-item {
		background: white;
		border-radius: 10px;
		padding: 16px;
		box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
		border: 1px solid rgba(0, 0, 0, 0.06);
		transition: all 0.2s ease;
	}

	.preset-item:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
	}

	.preset-header {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 6px;
	}

	.preset-title {
		color: #007aff;
		text-decoration: none;
		font-weight: 600;
		font-size: 16px;
		flex: 1;
		transition: color 0.2s ease;
	}

	.preset-title:hover {
		color: #0056b3;
	}

	.info-button {
		background: none;
		border: none;
		color: #6e6e73;
		cursor: help;
		padding: 2px;
		border-radius: 4px;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.info-button:hover {
		color: #007aff;
		background: rgba(0, 122, 255, 0.1);
	}

	.preset-description {
		color: #6e6e73;
		font-size: 13px;
		line-height: 1.4;
		margin: 0 0 10px 0;
	}

	.preset-actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
	}

	.action-buttons {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}

	.copy-button,
	.download-button {
		background: #f5f5f7;
		border: 1px solid rgba(0, 0, 0, 0.08);
		border-radius: 8px;
		padding: 8px 12px;
		font-size: 12px;
		font-weight: 500;
		color: #1d1d1f;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		gap: 6px;
		text-decoration: none;
	}

	.copy-button:hover,
	.download-button:hover {
		background: #007aff;
		color: white;
		border-color: #007aff;
		transform: translateY(-1px);
	}

	.size-info {
		display: flex;
		align-items: center;
	}

	.size-badge {
		background: #f5f5f7;
		color: #6e6e73;
		font-size: 11px;
		font-weight: 500;
		padding: 4px 8px;
		border-radius: 6px;
		border: 1px solid rgba(0, 0, 0, 0.06);
	}

	.size-badge.loading {
		color: #007aff;
	}

	.size-badge.error {
		color: #ff3b30;
		background: #fff5f5;
		border-color: rgba(255, 59, 48, 0.2);
	}

	/* Dialog Styles */
	.info-dialog {
		border: none;
		border-radius: 16px;
		padding: 0;
		box-shadow:
			0 8px 32px rgba(0, 0, 0, 0.12),
			0 4px 16px rgba(0, 0, 0, 0.08);
		max-width: 400px;
		width: 90vw;
	}

	.info-dialog::backdrop {
		background: rgba(0, 0, 0, 0.4);
		backdrop-filter: blur(4px);
	}

	.dialog-content {
		padding: 24px;
	}

	.dialog-content h3 {
		margin: 0 0 12px 0;
		font-size: 18px;
		font-weight: 600;
		color: #1d1d1f;
	}

	.dialog-content p {
		margin: 0 0 20px 0;
		color: #6e6e73;
		line-height: 1.5;
		font-size: 14px;
	}

	.close-button {
		background: #007aff;
		color: white;
		border: none;
		border-radius: 8px;
		padding: 10px 20px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		margin-left: auto;
		display: block;
	}

	.close-button:hover {
		background: #0056b3;
		transform: translateY(-1px);
	}

	/* Distilled Versions */
	.distilled-versions {
		margin-top: 16px;
		font-size: 14px;
	}

	.distilled-versions details {
		background: #f5f5f7;
		border-radius: 8px;
		padding: 12px;
		border: 1px solid rgba(0, 0, 0, 0.06);
	}

	.distilled-versions summary {
		cursor: pointer;
		font-weight: 500;
		color: #6e6e73;
		padding: 4px 0;
	}

	.distilled-versions ul {
		margin: 8px 0 0 0;
		padding-left: 16px;
	}

	.distilled-versions li {
		margin: 4px 0;
	}

	.distilled-versions a {
		color: #007aff;
		text-decoration: none;
	}

	.distilled-versions a:hover {
		color: #0056b3;
	}

	.version-size-badge {
		color: #6e6e73;
		font-size: 12px;
		margin-left: 8px;
	}

	.versions-status {
		margin-top: 16px;
		font-size: 14px;
		color: #6e6e73;
		padding: 12px;
		background: #f5f5f7;
		border-radius: 8px;
		border: 1px solid rgba(0, 0, 0, 0.06);
	}

	.versions-status.error {
		color: #ff3b30;
		background: #fff5f5;
		border-color: rgba(255, 59, 48, 0.2);
	}

	@media (max-width: 768px) {
		.preset-actions {
			flex-direction: column;
			align-items: stretch;
			gap: 12px;
		}

		.action-buttons {
			justify-content: center;
		}

		.copy-button,
		.download-button {
			justify-content: center;
			flex: 1;
		}
	}
</style>
