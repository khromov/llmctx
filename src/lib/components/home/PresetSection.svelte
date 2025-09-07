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
	<header class="section-header">
		<div class="header-decoration"></div>
		<h2>{title}</h2>
		{#if description}
			<p class="section-description">{description}</p>
		{/if}
	</header>

	<div class="preset-grid">
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
	@import url('/src/app.css');

	.presets-section {
		margin-bottom: var(--space-3xl);
		position: relative;
	}

	.section-header {
		margin-bottom: var(--space-xl);
		position: relative;
		padding-left: var(--space-md);
	}

	.header-decoration {
		position: absolute;
		left: 0;
		top: 50%;
		transform: translateY(-50%);
		width: 4px;
		height: 40px;
		background: linear-gradient(180deg, var(--color-sage) 0%, var(--color-rust) 100%);
		border-radius: 2px;
	}

	.section-header h2 {
		font-family: var(--font-serif);
		font-size: var(--text-3xl);
		font-weight: 400;
		margin: 0 0 var(--space-sm) 0;
		color: var(--color-ink);
		letter-spacing: -0.02em;
		position: relative;
		display: inline-block;
	}

	.section-header h2::after {
		content: '';
		position: absolute;
		bottom: -4px;
		left: 0;
		width: 60px;
		height: 1px;
		background: var(--color-rust);
		opacity: 0.4;
		transition: width 0.3s var(--ease-out-expo);
	}

	.presets-section:hover .section-header h2::after {
		width: 100%;
	}

	.section-description {
		font-size: var(--text-base);
		color: var(--color-stone);
		margin: 0;
		line-height: 1.6;
		max-width: 600px;
	}

	.preset-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: var(--space-lg);
		position: relative;
	}

	/* Add staggered animation */
	.preset-grid > :global(*) {
		animation: fade-in-up 0.6s var(--ease-out-expo) both;
	}

	.preset-grid > :global(*:nth-child(1)) {
		animation-delay: 0.05s;
	}
	.preset-grid > :global(*:nth-child(2)) {
		animation-delay: 0.1s;
	}
	.preset-grid > :global(*:nth-child(3)) {
		animation-delay: 0.15s;
	}
	.preset-grid > :global(*:nth-child(4)) {
		animation-delay: 0.2s;
	}
	.preset-grid > :global(*:nth-child(5)) {
		animation-delay: 0.25s;
	}
	.preset-grid > :global(*:nth-child(6)) {
		animation-delay: 0.3s;
	}

	@keyframes fade-in-up {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (max-width: 768px) {
		.presets-section {
			margin-bottom: var(--space-2xl);
		}

		.section-header {
			padding-left: 0;
		}

		.header-decoration {
			display: none;
		}

		.section-header h2 {
			font-size: var(--text-2xl);
		}

		.section-description {
			font-size: var(--text-sm);
		}

		.preset-grid {
			grid-template-columns: 1fr;
			gap: var(--space-md);
		}
	}
</style>
