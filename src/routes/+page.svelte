<script lang="ts">
	import type { PageData } from './$types'
	import {
		combinedPresets,
		sveltePresets,
		svelteKitPresets,
		otherPresets,
		transformAndSortPresets
	} from '$lib/presets'
	import { SITE_URL } from '$lib/constants'
	import { DistillablePreset } from '$lib/types/db'

	import HeroSection from '$lib/components/home/HeroSection.svelte'
	import McpSection from '$lib/components/home/McpSection.svelte'
	import UsageSection from '$lib/components/home/UsageSection.svelte'
	import PresetSection from '$lib/components/home/PresetSection.svelte'
	import IntegrationSection from '$lib/components/home/IntegrationSection.svelte'
	import SiteFooter from '$lib/components/home/SiteFooter.svelte'

	// Get the streamed data from the load function
	let { data }: { data: PageData } = $props()

	const SSE_ENDPOINT = 'https://svelte-llm.stanislav.garden/mcp/sse'
	const STREAMABLE_ENDPOINT = 'https://svelte-llm.stanislav.garden/mcp/mcp'

	const combinedPresetsFormatted = transformAndSortPresets(combinedPresets)
	const sveltePresetsFormatted = transformAndSortPresets(sveltePresets)
	const svelteKitPresetsFormatted = transformAndSortPresets(svelteKitPresets)
	const otherPresetsFormatted = transformAndSortPresets(otherPresets)

	const svelteDistilledPreset = {
		key: DistillablePreset.SVELTE_DISTILLED,
		title: '🔮 Svelte (LLM Distilled)',
		description: 'AI-condensed version of just the Svelte 5 docs'
	}

	const svelteKitDistilledPreset = {
		key: DistillablePreset.SVELTEKIT_DISTILLED,
		title: '🔮 SvelteKit (LLM Distilled)',
		description: 'AI-condensed version of just the SvelteKit docs'
	}
</script>

<main>
	<HeroSection isOldHost={data.isOldHost} />

	<McpSection sseEndpoint={SSE_ENDPOINT} streamableEndpoint={STREAMABLE_ENDPOINT} />

	<UsageSection siteUrl={SITE_URL} />

	<PresetSection
		title="Combined presets"
		description="Hand-picked combinations of the Svelte 5 + SvelteKit docs in a variety of sizes to fit different LLMs."
		presets={combinedPresetsFormatted}
		presetSizes={data.presetSizes}
		distilledVersionsPromises={data.distilledVersions}
	/>

	<PresetSection
		title="Svelte 5"
		presets={sveltePresetsFormatted}
		extraPresets={[svelteDistilledPreset]}
		presetSizes={data.presetSizes}
		distilledVersionsPromises={data.distilledVersions}
	/>

	<PresetSection
		title="SvelteKit"
		presets={svelteKitPresetsFormatted}
		extraPresets={[svelteKitDistilledPreset]}
		presetSizes={data.presetSizes}
		distilledVersionsPromises={data.distilledVersions}
	/>

	<PresetSection title="Other" presets={otherPresetsFormatted} presetSizes={data.presetSizes} />

	<section class="presets-section">
		<div class="section-header">
			<h2>Legacy</h2>
		</div>
		<div class="preset-list">
			<div class="preset-item">
				<a target="_blank" href="https://v4.svelte.dev/content.json">Svelte 4 Legacy + SvelteKit</a>
			</div>
		</div>
	</section>

	<IntegrationSection siteUrl={SITE_URL} />

	<SiteFooter />
</main>

<style>
	:global(html) {
		font-family:
			-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
		line-height: 1.6;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}

	main {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 24px;
		background: #fbfbfd;
		min-height: 100vh;
	}

	/* Legacy section specific styles */
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

	@media (max-width: 768px) {
		main {
			padding: 0 16px;
		}

		.section-header h2 {
			font-size: 24px;
		}
	}
</style>
