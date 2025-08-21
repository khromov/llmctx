/**
 * Preset configurations for MCP resources
 * These define the documentation sets available as both prompts and resources
 */

export interface PresetConfig {
	id: string
	title: string
	description: string
	patterns: string[]
}

export const PRESET_CONFIGS: PresetConfig[] = [
	{
		id: 'svelte-core',
		title: 'Svelte Core Documentation',
		description: 'Core Svelte 5 documentation: introduction, runes, template syntax, and styling',
		patterns: [
			'apps/svelte.dev/content/docs/svelte/01-introduction%',
			'apps/svelte.dev/content/docs/svelte/02-runes%',
			'apps/svelte.dev/content/docs/svelte/03-template-syntax%',
			'apps/svelte.dev/content/docs/svelte/04-styling%'
		]
	},
	{
		id: 'svelte-advanced',
		title: 'Svelte Advanced Documentation',
		description: 'Advanced Svelte 5 documentation: special elements, runtime, and miscellaneous',
		patterns: [
			'apps/svelte.dev/content/docs/svelte/05-special-elements%',
			'apps/svelte.dev/content/docs/svelte/06-runtime%',
			'apps/svelte.dev/content/docs/svelte/07-misc%'
		]
	},
	{
		id: 'svelte-complete',
		title: 'Complete Svelte Documentation',
		description: 'Complete Svelte 5 documentation covering all sections',
		patterns: [
			'apps/svelte.dev/content/docs/svelte/01-introduction%',
			'apps/svelte.dev/content/docs/svelte/02-runes%',
			'apps/svelte.dev/content/docs/svelte/03-template-syntax%',
			'apps/svelte.dev/content/docs/svelte/04-styling%',
			'apps/svelte.dev/content/docs/svelte/05-special-elements%',
			'apps/svelte.dev/content/docs/svelte/06-runtime%',
			'apps/svelte.dev/content/docs/svelte/07-misc%'
		]
	},
	{
		id: 'sveltekit-core',
		title: 'SvelteKit Core Documentation',
		description: 'Core SvelteKit documentation: getting started and core concepts',
		patterns: [
			'apps/svelte.dev/content/docs/kit/10-getting-started%',
			'apps/svelte.dev/content/docs/kit/20-core-concepts%'
		]
	},
	{
		id: 'sveltekit-production',
		title: 'SvelteKit Production Documentation',
		description:
			'Production SvelteKit documentation: build & deploy, advanced features, best practices',
		patterns: [
			'apps/svelte.dev/content/docs/kit/25-build-and-deploy%',
			'apps/svelte.dev/content/docs/kit/30-advanced%',
			'apps/svelte.dev/content/docs/kit/40-best-practices%'
		]
	},
	{
		id: 'sveltekit-complete',
		title: 'Complete SvelteKit Documentation',
		description: 'Complete SvelteKit documentation covering all sections',
		patterns: [
			'apps/svelte.dev/content/docs/kit/10-getting-started%',
			'apps/svelte.dev/content/docs/kit/20-core-concepts%',
			'apps/svelte.dev/content/docs/kit/25-build-and-deploy%',
			'apps/svelte.dev/content/docs/kit/30-advanced%',
			'apps/svelte.dev/content/docs/kit/40-best-practices%'
		]
	}
]
