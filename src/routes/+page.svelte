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

	<!-- JSON API Section - Condensed -->
	<section class="json-api-section">
		<div class="section-header">
			<h2>JSON API</h2>
		</div>

		<div class="api-card">
			<div class="api-url">
				<code>GET <a href="{SITE_URL}/api/docs" target="_blank">{SITE_URL}/api/docs</a></code>
				<button
					class="copy-btn"
					onclick={() => navigator.clipboard.writeText(`${SITE_URL}/api/docs`)}
				>
					Copy
				</button>
			</div>

			<div class="api-example">
				<div class="example-section">
					<strong>curl {SITE_URL}/api/docs</strong>
				</div>
				<pre><code
						>{`{
  "success": true,
  "metadata": { "total_documents": 127, "filtered_documents": 89, [...] },
  "documents": [
    {
      "path": "apps/svelte.dev/content/docs/svelte/01-introduction/01-overview.md",
      "title": "Overview",
      "content": "The command line interface (CLI), sv, is a toolkit...",
      [...]
    }
  ]
}`}</code
					></pre>
			</div>
		</div>
	</section>

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

	/* JSON API Section - Condensed Styles */
	.json-api-section {
		margin-bottom: 40px;
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
		background: linear-gradient(90deg, #10b981 0%, #059669 100%);
		border-radius: 2px;
	}

	.api-card {
		background: white;
		border-radius: 12px;
		padding: 20px;
		box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
		border: 1px solid rgba(0, 0, 0, 0.06);
	}

	.api-url {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 16px;
		padding: 12px;
		background: #f8fafc;
		border-radius: 8px;
		border: 1px solid rgba(0, 0, 0, 0.08);
	}

	.api-url code {
		flex: 1;
		font-family:
			'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
		font-size: 14px;
		color: #374151;
		font-weight: 600;
	}

	.api-url code a {
		color: #10b981;
		text-decoration: none;
		transition: color 0.2s ease;
	}

	.api-url code a:hover {
		color: #059669;
		text-decoration: underline;
	}

	.copy-btn {
		background: #10b981;
		color: white;
		border: none;
		border-radius: 6px;
		padding: 6px 12px;
		font-size: 12px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.copy-btn:hover {
		background: #059669;
		transform: translateY(-1px);
	}

	.api-example {
		background: #f8fafc;
		border-radius: 8px;
		border: 1px solid rgba(0, 0, 0, 0.08);
		overflow: hidden;
	}

	.example-section {
		padding: 12px 16px;
		background: #10b981;
		color: white;
		font-family:
			'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
		font-size: 13px;
		font-weight: 500;
	}

	.api-example pre {
		background: #1e1e1e;
		color: #e5e7eb;
		padding: 16px;
		margin: 0;
		font-size: 12px;
		line-height: 1.4;
		overflow-x: auto;
	}

	/* Legacy section specific styles */
	.presets-section {
		margin-bottom: 25px;
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

		.api-url {
			flex-direction: column;
			align-items: stretch;
		}

		.copy-btn {
			align-self: center;
		}

		.section-header h2 {
			font-size: 24px;
		}
	}
</style>
