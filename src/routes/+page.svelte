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
	<div class="page-decoration decoration-1"></div>
	<div class="page-decoration decoration-2"></div>

	<HeroSection isOldHost={data.isOldHost} />

	<div class="content-wrapper">
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

		<!-- Legacy Section -->
		<section class="legacy-section">
			<header class="section-header">
				<div class="header-decoration"></div>
				<h2>Legacy</h2>
			</header>
			<div class="legacy-card">
				<a target="_blank" href="https://v4.svelte.dev/content.json" class="legacy-link">
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
					>
						<path d="M13 2L3 14h9l-1 8l10-12h-9l1-8z" />
					</svg>
					<span>Svelte 4 Legacy + SvelteKit</span>
					<svg
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
						class="arrow"
					>
						<path d="M7 17l10-10M17 7h-10M17 7v10" />
					</svg>
				</a>
			</div>
		</section>

		<IntegrationSection siteUrl={SITE_URL} />

		<!-- JSON API Section -->
		<section class="api-section">
			<header class="section-header">
				<div class="header-decoration"></div>
				<h2>JSON API</h2>
			</header>

			<p class="api-description">
				Access the entire Svelte and SvelteKit documentation programmatically in JSON format.
			</p>

			<div class="api-card">
				<div class="api-endpoint">
					<span class="method-badge">GET</span>
					<a href="{SITE_URL}/api/docs" target="_blank" class="api-url">{SITE_URL}/api/docs</a>
					<button
						class="copy-btn"
						onclick={() => navigator.clipboard.writeText(`${SITE_URL}/api/docs`)}
					>
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
						Copy
					</button>
				</div>

				<div class="api-example">
					<div class="example-header">
						<span class="terminal-prompt">$</span>
						<code>curl {SITE_URL}/api/docs</code>
					</div>
					<pre class="example-response"><code
							>{`{
  "success": true,
  "metadata": { 
    "total_documents": 127, 
    "filtered_documents": 89,
    "total_size_kb": 512,
    "last_updated": "2024-01-15T08:30:00Z"
  },
  "documents": [
    {
      "path": "docs/svelte/01-introduction/01-overview.md",
      "title": "Overview",
      "content": "Svelte is a radical new approach..."
    }
  ]
}`}</code
						></pre>
				</div>
			</div>
		</section>
	</div>

	<SiteFooter />
</main>

<style>
	@import url('/src/app.css');

	main {
		position: relative;
		background: var(--color-cream);
		min-height: 100vh;
		overflow: hidden;
	}

	.page-decoration {
		position: fixed;
		pointer-events: none;
		opacity: 0.03;
		z-index: 0;
	}

	.decoration-1 {
		top: 20%;
		right: -100px;
		width: 400px;
		height: 400px;
		background: radial-gradient(circle, var(--color-sage) 0%, transparent 70%);
		border-radius: 50%;
		animation: float-slow 40s infinite ease-in-out;
	}

	.decoration-2 {
		bottom: 10%;
		left: -150px;
		width: 500px;
		height: 500px;
		background: radial-gradient(circle, var(--color-rust) 0%, transparent 70%);
		border-radius: 50%;
		animation: float-slow 35s infinite ease-in-out reverse;
	}

	@keyframes float-slow {
		0%,
		100% {
			transform: translate(0, 0) scale(1);
		}
		50% {
			transform: translate(50px, -30px) scale(1.1);
		}
	}

	.content-wrapper {
		position: relative;
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 var(--space-xl);
		z-index: 1;
	}

	/* Section Headers */
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
	}

	/* Legacy Section */
	.legacy-section {
		margin-bottom: var(--space-3xl);
	}

	.legacy-card {
		background: var(--color-paper);
		border: 1px solid rgba(139, 109, 71, 0.1);
		border-radius: 12px;
		overflow: hidden;
		transition: all 0.3s var(--ease-out-expo);
	}

	.legacy-card:hover {
		transform: translateY(-2px);
		box-shadow:
			0 10px 30px rgba(139, 109, 71, 0.08),
			0 2px 8px rgba(139, 109, 71, 0.04);
	}

	.legacy-link {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-lg);
		color: var(--color-charcoal);
		text-decoration: none;
		font-weight: 500;
		transition: color 0.2s var(--ease-out-expo);
	}

	.legacy-link:hover {
		color: var(--color-rust);
	}

	.legacy-link svg {
		flex-shrink: 0;
		stroke: var(--color-sage);
		transition: all 0.3s var(--ease-out-expo);
	}

	.legacy-link .arrow {
		margin-left: auto;
		opacity: 0.5;
	}

	.legacy-link:hover .arrow {
		opacity: 1;
		transform: translate(2px, -2px);
	}

	/* API Section */
	.api-section {
		margin-bottom: var(--space-3xl);
	}

	.api-description {
		margin: 0 0 var(--space-lg) 0;
		color: var(--color-stone);
		font-size: var(--text-base);
		line-height: 1.6;
	}

	.api-card {
		background: var(--color-paper);
		border: 1px solid rgba(139, 109, 71, 0.1);
		border-radius: 12px;
		overflow: hidden;
		box-shadow: 0 2px 12px rgba(139, 109, 71, 0.04);
	}

	.api-endpoint {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-lg);
		background: var(--color-cream);
		border-bottom: 1px solid rgba(139, 109, 71, 0.1);
	}

	.method-badge {
		background: var(--color-sage);
		color: var(--color-cream);
		padding: 4px 12px;
		border-radius: 6px;
		font-size: var(--text-xs);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.api-url {
		flex: 1;
		font-family: var(--font-mono);
		font-size: var(--text-sm);
		color: var(--color-sage-dark);
		text-decoration: none;
		word-break: break-all;
	}

	.api-url:hover {
		color: var(--color-rust);
	}

	.copy-btn {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-paper);
		border: 1px solid rgba(139, 109, 71, 0.15);
		border-radius: 8px;
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--color-charcoal);
		cursor: pointer;
		transition: all 0.2s var(--ease-out-expo);
	}

	.copy-btn:hover {
		background: var(--color-sage);
		color: var(--color-cream);
		border-color: var(--color-sage);
		transform: translateY(-1px);
	}

	.api-example {
		padding: 0;
	}

	.example-header {
		padding: var(--space-md) var(--space-lg);
		background: var(--color-charcoal);
		color: var(--color-cream);
		font-family: var(--font-mono);
		font-size: var(--text-sm);
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.terminal-prompt {
		color: var(--color-sage);
		font-weight: 600;
	}

	.example-header code {
		color: var(--color-paper);
	}

	.example-response {
		background: var(--color-ink);
		color: var(--color-parchment);
		padding: var(--space-lg);
		margin: 0;
		font-size: var(--text-xs);
		line-height: 1.6;
		overflow-x: auto;
		font-family: var(--font-mono);
	}

	@media (max-width: 768px) {
		.content-wrapper {
			padding: 0 var(--space-lg);
		}

		.page-decoration {
			display: none;
		}

		.api-endpoint {
			flex-direction: column;
			align-items: stretch;
			gap: var(--space-sm);
		}

		.copy-btn {
			align-self: center;
		}

		.section-header {
			padding-left: 0;
		}

		.header-decoration {
			display: none;
		}
	}
</style>
