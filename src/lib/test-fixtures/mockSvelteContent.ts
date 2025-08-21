import type { DbContent } from '$lib/types/db'

/**
 * Mock Svelte content data for testing MCP handlers
 * This represents typical documentation content from the database
 */
export const mockSvelteContent: DbContent[] = [
	{
		id: 1,
		path: 'apps/svelte.dev/content/docs/svelte/01-introduction.md',
		filename: '01-introduction.md',
		content:
			'# Introduction\n\nSvelte is a radical new approach to building user interfaces. Unlike traditional frameworks, Svelte compiles your components at build time instead of running in the browser. This means your applications start faster and have smaller bundle sizes. Svelte makes building interactive UIs a breeze with its simple and powerful reactivity system.',
		size_bytes: 400,
		metadata: { title: 'Introduction' },
		created_at: new Date(),
		updated_at: new Date()
	},
	{
		id: 2,
		path: 'apps/svelte.dev/content/docs/svelte/02-runes.md',
		filename: '02-runes.md',
		content:
			'# $state\n\nThe $state rune is used to create reactive state in Svelte 5. It replaces the traditional variable declarations and automatically tracks changes to your data. When you use $state, Svelte will re-render your component whenever the state changes, providing a seamless reactive experience.',
		size_bytes: 300,
		metadata: { title: '$state' },
		created_at: new Date(),
		updated_at: new Date()
	},
	{
		id: 3,
		path: 'apps/svelte.dev/content/docs/svelte/03-derived.md',
		filename: '03-derived.md',
		content:
			'# $derived\n\nThe $derived rune is used to create derived state that automatically updates when its dependencies change. This is perfect for computed values that depend on other reactive state. Derived state is lazily evaluated and cached for performance.',
		size_bytes: 280,
		metadata: { title: '$derived' },
		created_at: new Date(),
		updated_at: new Date()
	},
	{
		id: 4,
		path: 'apps/svelte.dev/content/docs/svelte/04-effect.md',
		filename: '04-effect.md',
		content:
			'# $effect\n\nThe $effect rune is used for side effects in Svelte 5. It runs whenever its dependencies change and is perfect for DOM manipulations, API calls, or other side effects. Effects are automatically cleaned up when the component is destroyed.',
		size_bytes: 270,
		metadata: { title: '$effect' },
		created_at: new Date(),
		updated_at: new Date()
	},
	{
		id: 5,
		path: 'apps/svelte.dev/content/docs/kit/01-routing.md',
		filename: '01-routing.md',
		content:
			'# Routing\n\nSvelteKit routing is filesystem-based, meaning that your routes are defined by the structure of your src/routes directory. Each .svelte file in this directory corresponds to a route in your application. This approach makes it easy to understand and maintain your application structure.',
		size_bytes: 350,
		metadata: { title: 'Routing' },
		created_at: new Date(),
		updated_at: new Date()
	}
]
