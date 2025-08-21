<script lang="ts">
	import PresetListItem from '$lib/components/PresetListItem.svelte'
	import type { DistillablePreset } from '$lib/types/db'

	interface PresetData {
		key: string
		title: string
		description?: string
		distilled?: boolean
		distilledFilenameBase?: string
	}

	interface DistilledVersion {
		filename: string
		date: string
		path: string
		sizeKb: number
	}

	let {
		title,
		description,
		presets,
		presetSizes,
		distilledVersionsPromises,
		extraPresets = []
	}: {
		title: string
		description?: string
		presets: PresetData[]
		presetSizes?: Record<string, Promise<{ key: string; sizeKb: number | null; error?: string }>>
		distilledVersionsPromises?: Record<
			string,
			Promise<{ key: string; versions: DistilledVersion[]; error?: string }>
		>
		extraPresets?: PresetData[]
	} = $props()
</script>

<section class="presets-section">
	<div class="section-header">
		<h2>{title}</h2>
		{#if description}
			<p class="section-description">{description}</p>
		{/if}
	</div>
	<div class="preset-list">
		{#each extraPresets as preset}
			<PresetListItem
				{...preset}
				presetSizePromise={presetSizes?.[preset.key]}
				distilledVersionsPromise={distilledVersionsPromises?.[preset.key]}
			/>
		{/each}
		{#each presets as preset}
			<PresetListItem
				{...preset}
				presetSizePromise={presetSizes?.[preset.key]}
				distilledVersionsPromise={distilledVersionsPromises?.[preset.key]}
			/>
		{/each}
	</div>
</section>

<style>
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

	@media (max-width: 768px) {
		.section-header h2 {
			font-size: 24px;
		}

		.section-description {
			font-size: 16px;
		}
	}
</style>
