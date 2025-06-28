import type { MinimizeOptions } from './fetchMarkdown'

export type PresetConfig = {
	/** The pretty title of the preset */
	title: string
	/** Optional description of the preset */
	description?: string
	/** The owner of the GitHub repository */
	owner: string
	/** The name of the GitHub repository */
	repo: string
	/** List of glob patterns for including files */
	glob: string[]
	/** List of glob patterns for excluding files */
	ignore?: string[]
	/** Optional prompt to provide additional context or instructions to language models */
	prompt?: string
	/** Minimization options for the content */
	minimize?: MinimizeOptions
	/** Whether this preset is distilled by an LLM */
	distilled?: boolean
	/** For distilled presets, the filename base to use */
	distilledFilenameBase?: string
}

const SVELTE_5_PROMPT =
	'Always use Svelte 5 runes and Svelte 5 syntax. Runes do not need to be imported, they are globals. $state() runes are always declared using `let`, never with `const`. When passing a function to $derived, you must always use $derived.by(() => ...). Error boundaries can only catch errors during component rendering and at the top level of an $effect inside the error boundary. Error boundaries do not catch errors in onclick or other event handlers.'

export const combinedPresets: Record<string, PresetConfig> = {
	'svelte-complete-distilled': {
		title: '🔮 Svelte + SvelteKit (Recommended - LLM Distilled)',
		description: 'AI-condensed version of the docs focused on code examples and key concepts',
		owner: 'sveltejs',
		repo: 'svelte.dev',
		glob: [
			// Svelte
			'**/apps/svelte.dev/content/docs/svelte/**/*.md',
			// SvelteKit
			'**/apps/svelte.dev/content/docs/kit/**/*.md'
		],
		minimize: {
			normalizeWhitespace: false,
			removeLegacy: true,
			removePlaygroundLinks: true,
			removePrettierIgnore: true,
			removeNoteBlocks: false,
			removeDetailsBlocks: false,
			removeHtmlComments: true,
			removeDiffMarkers: true
		},
		ignore: [
			// Svelte ignores (same as medium preset)
			'**/apps/svelte.dev/content/docs/svelte/07-misc/04-custom-elements.md',
			'**/apps/svelte.dev/content/docs/svelte/07-misc/06-v4-migration-guide.md',
			'**/apps/svelte.dev/content/docs/svelte/07-misc/07-v5-migration-guide.md',
			'**/apps/svelte.dev/content/docs/svelte/07-misc/99-faq.md',
			'**/apps/svelte.dev/content/docs/svelte/07-misc/xx-reactivity-indepth.md',
			'**/apps/svelte.dev/content/docs/svelte/98-reference/21-svelte-legacy.md',
			'**/apps/svelte.dev/content/docs/svelte/99-legacy/**/*.md',
			'**/apps/svelte.dev/content/docs/svelte/98-reference/**/*.md',
			'**/xx-*.md',
			// SvelteKit ignores (same as medium preset)
			'**/apps/svelte.dev/content/docs/kit/25-build-and-deploy/*adapter-*.md',
			'**/apps/svelte.dev/content/docs/kit/25-build-and-deploy/99-writing-adapters.md',
			'**/apps/svelte.dev/content/docs/kit/30-advanced/70-packaging.md',
			'**/apps/svelte.dev/content/docs/kit/40-best-practices/05-performance.md',
			'**/apps/svelte.dev/content/docs/kit/40-best-practices/10-accessibility.md',
			'**/apps/svelte.dev/content/docs/kit/60-appendix/**/*.md',
			'**/apps/svelte.dev/content/docs/kit/98-reference/**/*.md',
			'**/xx-*.md'
		],
		prompt: SVELTE_5_PROMPT,
		distilled: true,
		distilledFilenameBase: 'svelte-complete-distilled'
	},
	'svelte-complete-medium': {
		title: '⭐️ Svelte + SvelteKit (Medium preset)',
		description:
			'Complete Svelte + SvelteKit docs excluding certain advanced sections, legacy, notes and migration docs',
		owner: 'sveltejs',
		repo: 'svelte.dev',
		glob: [
			// Svelte
			'**/apps/svelte.dev/content/docs/svelte/**/*.md',
			// SvelteKit
			'**/apps/svelte.dev/content/docs/kit/**/*.md'
		],
		ignore: [
			// Svelte ignores
			'**/apps/svelte.dev/content/docs/svelte/07-misc/04-custom-elements.md',
			'**/apps/svelte.dev/content/docs/svelte/07-misc/06-v4-migration-guide.md',
			'**/apps/svelte.dev/content/docs/svelte/07-misc/07-v5-migration-guide.md',
			'**/apps/svelte.dev/content/docs/svelte/07-misc/99-faq.md',
			'**/apps/svelte.dev/content/docs/svelte/07-misc/xx-reactivity-indepth.md',
			'**/apps/svelte.dev/content/docs/svelte/98-reference/21-svelte-legacy.md',
			'**/apps/svelte.dev/content/docs/svelte/99-legacy/**/*.md',
			'**/apps/svelte.dev/content/docs/svelte/98-reference/30-runtime-errors.md',
			'**/apps/svelte.dev/content/docs/svelte/98-reference/30-runtime-warnings.md',
			'**/apps/svelte.dev/content/docs/svelte/98-reference/30-compiler-errors.md',
			'**/apps/svelte.dev/content/docs/svelte/98-reference/30-compiler-warnings.md',
			'**/xx-*.md',
			// SvelteKit ignores
			'**/apps/svelte.dev/content/docs/kit/25-build-and-deploy/*adapter-*.md',
			'**/apps/svelte.dev/content/docs/kit/25-build-and-deploy/99-writing-adapters.md',
			'**/apps/svelte.dev/content/docs/kit/30-advanced/70-packaging.md',
			'**/apps/svelte.dev/content/docs/kit/40-best-practices/05-performance.md',
			'**/apps/svelte.dev/content/docs/kit/40-best-practices/10-accessibility.md', // May the a11y gods have mercy on our souls
			'**/apps/svelte.dev/content/docs/kit/60-appendix/**/*.md',
			'**/xx-*.md'
		],
		prompt: SVELTE_5_PROMPT,
		minimize: {
			removeLegacy: true,
			removePlaygroundLinks: true,
			removeNoteBlocks: true,
			removeDetailsBlocks: true,
			removeHtmlComments: true,
			normalizeWhitespace: true
		}
	},
	'svelte-complete': {
		title: 'Svelte + SvelteKit (Large preset)',
		description: 'Complete Svelte + SvelteKit docs excluding legacy, notes and migration docs',
		owner: 'sveltejs',
		repo: 'svelte.dev',
		glob: [
			'**/apps/svelte.dev/content/docs/svelte/**/*.md',
			'**/apps/svelte.dev/content/docs/kit/**/*.md'
		],
		ignore: [],
		prompt: SVELTE_5_PROMPT,
		minimize: {
			removeLegacy: true,
			removePlaygroundLinks: true,
			removeNoteBlocks: true,
			removeDetailsBlocks: true,
			removeHtmlComments: true,
			normalizeWhitespace: true
		}
	},
	'svelte-complete-tiny': {
		title: 'Svelte + SvelteKit (Tiny preset)',
		description: 'Tutorial content only',
		owner: 'sveltejs',
		repo: 'svelte.dev',
		glob: [
			'**/apps/svelte.dev/content/tutorial/**/*.md',
			'**/apps/svelte.dev/content/docs/svelte/02-runes/**/*.md'
		],
		ignore: [],
		prompt: SVELTE_5_PROMPT,
		minimize: {
			removeLegacy: true,
			removePlaygroundLinks: true,
			removeNoteBlocks: true,
			removeDetailsBlocks: true,
			removeHtmlComments: true,
			normalizeWhitespace: true
		}
	},
	'svelte-migration': {
		title: 'Svelte + SvelteKit migration guide',
		description: 'Only Svelte + SvelteKit docs for migrating ',
		owner: 'sveltejs',
		repo: 'svelte.dev',
		glob: [
			// Svelte
			'**/apps/svelte.dev/content/docs/svelte/07-misc/07-v5-migration-guide.md',
			// SvelteKit
			'**/apps/svelte.dev/content/docs/kit/60-appendix/30-migrating-to-sveltekit-2.md'
		],
		ignore: [],
		prompt: SVELTE_5_PROMPT,
		minimize: {
			removeLegacy: true,
			removePlaygroundLinks: true,
			removeNoteBlocks: true,
			removeDetailsBlocks: true,
			removeHtmlComments: true,
			normalizeWhitespace: true
		}
	}
}

export const sveltePresets: Record<string, PresetConfig> = {
	svelte: {
		title: 'Svelte (Full)',
		description: 'Complete documentation including legacy and reference',
		owner: 'sveltejs',
		repo: 'svelte.dev',
		glob: ['**/apps/svelte.dev/content/docs/svelte/**/*.md'],
		ignore: [],
		prompt: SVELTE_5_PROMPT,
		minimize: {}
	},
	'svelte-medium': {
		title: 'Svelte (Medium)',
		description: 'Complete documentation including legacy and reference',
		owner: 'sveltejs',
		repo: 'svelte.dev',
		glob: ['**/apps/svelte.dev/content/docs/svelte/**/*.md'],
		ignore: [
			// Svelte ignores
			'**/apps/svelte.dev/content/docs/svelte/07-misc/04-custom-elements.md',
			'**/apps/svelte.dev/content/docs/svelte/07-misc/06-v4-migration-guide.md',
			'**/apps/svelte.dev/content/docs/svelte/07-misc/07-v5-migration-guide.md',
			'**/apps/svelte.dev/content/docs/svelte/07-misc/99-faq.md',
			'**/apps/svelte.dev/content/docs/svelte/07-misc/xx-reactivity-indepth.md',
			'**/apps/svelte.dev/content/docs/svelte/98-reference/21-svelte-legacy.md',
			'**/apps/svelte.dev/content/docs/svelte/99-legacy/**/*.md',
			'**/apps/svelte.dev/content/docs/svelte/98-reference/30-runtime-errors.md',
			'**/apps/svelte.dev/content/docs/svelte/98-reference/30-runtime-warnings.md',
			'**/apps/svelte.dev/content/docs/svelte/98-reference/30-compiler-errors.md',
			'**/apps/svelte.dev/content/docs/svelte/98-reference/30-compiler-warnings.md'
		],
		prompt: SVELTE_5_PROMPT,
		minimize: {
			removeLegacy: true,
			removePlaygroundLinks: true,
			removeNoteBlocks: true,
			removeDetailsBlocks: true,
			removeHtmlComments: true,
			normalizeWhitespace: true
		}
	}
}

export const svelteKitPresets: Record<string, PresetConfig> = {
	sveltekit: {
		title: 'SvelteKit (Full)',
		description: 'Complete documentation including legacy and reference',
		owner: 'sveltejs',
		repo: 'svelte.dev',
		prompt: SVELTE_5_PROMPT,
		glob: ['**/apps/svelte.dev/content/docs/kit/**/*.md'],
		minimize: {}
	},
	'sveltekit-medium': {
		title: 'SvelteKit (Medium)',
		description: 'Complete documentation including legacy and reference',
		owner: 'sveltejs',
		repo: 'svelte.dev',
		prompt: SVELTE_5_PROMPT,
		glob: ['**/apps/svelte.dev/content/docs/kit/**/*.md'],
		minimize: {
			removeLegacy: true,
			removePlaygroundLinks: true,
			removeNoteBlocks: true,
			removeDetailsBlocks: true,
			removeHtmlComments: true,
			normalizeWhitespace: true
		},
		ignore: [
			// SvelteKit ignores
			'**/apps/svelte.dev/content/docs/kit/25-build-and-deploy/*adapter-*.md',
			'**/apps/svelte.dev/content/docs/kit/25-build-and-deploy/99-writing-adapters.md',
			'**/apps/svelte.dev/content/docs/kit/30-advanced/70-packaging.md',
			'**/apps/svelte.dev/content/docs/kit/40-best-practices/05-performance.md',
			'**/apps/svelte.dev/content/docs/kit/40-best-practices/10-accessibility.md', // May the a11y gods have mercy on our souls
			'**/apps/svelte.dev/content/docs/kit/60-appendix/**/*.md',
			'**/xx-*.md'
		]
	}
}

export const otherPresets: Record<string, PresetConfig> = {
	'svelte-cli': {
		title: 'Svelte CLI - npx sv',
		owner: 'sveltejs',
		repo: 'svelte.dev',
		glob: ['**/apps/svelte.dev/content/docs/cli/**/*.md'],
		ignore: [],
		minimize: {}
	}
}

export const presets = {
	...combinedPresets,
	...sveltePresets,
	...svelteKitPresets,
	...otherPresets
}

export function transformAndSortPresets(presetsObject: Record<string, PresetConfig>) {
	return Object.entries(presetsObject)
		.map(([key, value]) => ({
			key: key.toLowerCase(),
			...value
		}))
		.sort((a, b) => a.key.localeCompare(b.key))
}
