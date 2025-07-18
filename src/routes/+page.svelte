<script lang="ts">
	import { onMount } from 'svelte'
	import {
		combinedPresets,
		sveltePresets,
		svelteKitPresets,
		otherPresets,
		transformAndSortPresets
	} from '$lib/presets'
	import { DistillablePreset } from '$lib/types/db'
	import { logErrorAlways } from '$lib/log'

	// Import components
	import HeroSection from '$lib/components/HeroSection.svelte'
	import McpSection from '$lib/components/McpSection.svelte'
	import UsageSection from '$lib/components/UsageSection.svelte'
	import PresetSection from '$lib/components/PresetSection.svelte'
	import IntegrationSection from '$lib/components/IntegrationSection.svelte'
	import SiteFooter from '$lib/components/SiteFooter.svelte'

	const combinedPresetsFormatted = transformAndSortPresets(combinedPresets)
	const sveltePresetsFormatted = transformAndSortPresets(sveltePresets)
	const svelteKitPresetsFormatted = transformAndSortPresets(svelteKitPresets)
	const otherPresetsFormatted = transformAndSortPresets(otherPresets)

	// Define virtual distilled presets using the enum
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

	type DistilledVersion = {
		filename: string
		date: string
		path: string
		sizeKb: number
	}

	let distilledVersions = $state<Record<string, DistilledVersion[]>>({
		[DistillablePreset.SVELTE_COMPLETE_DISTILLED]: [],
		[DistillablePreset.SVELTE_DISTILLED]: [],
		[DistillablePreset.SVELTEKIT_DISTILLED]: []
	})
	let loadingVersions = $state(true)
	let distilledError = $state<string | null>(null)

	const loadVersions = async (preset: string) => {
		try {
			const response = await fetch(`/api/distilled-versions?preset=${preset}`)
			if (response.ok) {
				return await response.json()
			} else {
				throw new Error(`Failed to load versions: ${response.status} ${response.statusText}`)
			}
		} catch (e) {
			logErrorAlways(`Failed to load distilled versions for ${preset}:`, e)
			throw e
		}
	}

	onMount(async () => {
		try {
			loadingVersions = true

			// Load all versions in parallel
			const presetKeys = Object.keys(distilledVersions)
			const versionPromises = presetKeys.map((key) => loadVersions(key))
			const allVersions = await Promise.all(versionPromises)

			// Store results
			presetKeys.forEach((key, index) => {
				distilledVersions[key] = allVersions[index]
			})
		} catch (e) {
			distilledError = `Error loading versions: ${e instanceof Error ? e.message : String(e)}`
		} finally {
			loadingVersions = false
		}
	})
</script>

<main>
	<HeroSection />

	<McpSection />

	<UsageSection />

	<PresetSection
		title="Combined presets"
		description="Hand-picked combinations of the Svelte 5 + SvelteKit docs in a variety of sizes to fit different LLMs."
		presets={combinedPresetsFormatted}
		{distilledVersions}
		{loadingVersions}
		{distilledError}
	/>

	<PresetSection
		title="Svelte 5"
		presets={[svelteDistilledPreset, ...sveltePresetsFormatted]}
		{distilledVersions}
		{loadingVersions}
		{distilledError}
	/>

	<PresetSection
		title="SvelteKit"
		presets={[svelteKitDistilledPreset, ...svelteKitPresetsFormatted]}
		{distilledVersions}
		{loadingVersions}
		{distilledError}
	/>

	<PresetSection title="Other" presets={otherPresetsFormatted} />

	<PresetSection title="Legacy" presets={[]} isLegacy={true} />

	<IntegrationSection />

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

	/* Responsive Design */
	@media (max-width: 768px) {
		main {
			padding: 0 16px;
		}
	}
</style>
