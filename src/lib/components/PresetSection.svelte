<script lang="ts">
	import PresetListItem from './PresetListItem.svelte'
	import type { DistillablePreset } from '$lib/types/db'

	type Props = {
		title: string
		description?: string
		presets: Array<{
			key: string
			title: string
			description?: string
		}>
		distilledVersions?: Record<
			string,
			Array<{ filename: string; date: string; path: string; sizeKb: number }>
		>
		loadingVersions?: boolean
		distilledError?: string | null
		isLegacy?: boolean
	}

	let {
		title,
		description,
		presets,
		distilledVersions,
		loadingVersions,
		distilledError,
		isLegacy = false
	}: Props = $props()
</script>

<section class="presets-section">
	<div class="section-header">
		<h2>{title}</h2>
		{#if description}
			<p class="section-description">{description}</p>
		{/if}
	</div>

	<div class="preset-list">
		{#if isLegacy}
			<!-- Legacy preset with simple link -->
			<div class="preset-item">
				<a target="_blank" href="https://v4.svelte.dev/content.json">Svelte 4 Legacy + SvelteKit</a>
			</div>
		{:else}
			{#each presets as preset}
				<PresetListItem
					{...preset}
					distilledVersions={distilledVersions?.[preset.key]}
					{loadingVersions}
					{distilledError}
				/>
			{/each}
		{/if}
	</div>
</section>

<style>
	/* Presets Section */
	.presets-section {
		margin-bottom: 25px;
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

	.preset-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.preset-item {
		background: white;
		border-radius: 12px;
		padding: 20px;
		box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
		border: 1px solid rgba(0, 0, 0, 0.06);
		transition: all 0.2s ease;
	}

	.preset-item:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
	}

	.preset-item a {
		color: #007aff;
		text-decoration: none;
		font-weight: 500;
	}

	.preset-item a:hover {
		color: #0056b3;
	}
</style>
