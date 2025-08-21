import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listSectionsHandler } from './listSectionsHandler'
import { ContentDbService } from '$lib/server/contentDb'
import { mockSvelteContent } from '$lib/test-fixtures/mockSvelteContent'

// Mock ContentDbService
vi.mock('$lib/server/contentDb', () => ({
	ContentDbService: {
		getDocumentationSections: vi.fn()
	}
}))

// Mock path utils
vi.mock('$lib/utils/pathUtils', () => ({
	cleanDocumentationPath: vi.fn((path: string) => {
		const prefix = 'apps/svelte.dev/content/'
		if (path.startsWith(prefix)) {
			return path.substring(prefix.length)
		}
		return path
	}),
	extractTitleFromPath: vi.fn((filePath: string) => {
		const filename = filePath.split('/').pop() || filePath
		return filename.replace('.md', '').replace(/^\d+-/, '')
	})
}))

describe('listSectionsHandler', () => {
	beforeEach(() => {
		// Reset mocks before each test
		vi.clearAllMocks()

		// Setup default mock implementation for getDocumentationSections
		const mockGetDocumentationSections = vi.mocked(ContentDbService.getDocumentationSections)
		mockGetDocumentationSections.mockResolvedValue(
			mockSvelteContent.map((item) => ({
				path: item.path,
				metadata: item.metadata,
				content: item.content
			}))
		)
	})

	it('should list sections and return structured content', async () => {
		const listResult = await listSectionsHandler()

		expect(listResult.content).toBeDefined()
		expect(listResult.content[0].type).toBe('text')
		expect(listResult.content[0].text).toContain('Available documentation sections')

		// Should contain our mock sections
		expect(listResult.content[0].text).toContain('Introduction')
		expect(listResult.content[0].text).toContain('$state')
		expect(listResult.content[0].text).toContain('$derived')
		expect(listResult.content[0].text).toContain('$effect')
		expect(listResult.content[0].text).toContain('Routing')
	})

	it('should properly clean paths and categorize sections correctly', async () => {
		const listResult = await listSectionsHandler()
		const outputText = listResult.content[0].text

		// Test path cleaning - should NOT contain the full database path prefix
		expect(outputText).not.toContain('apps/svelte.dev/content/docs/svelte/')
		expect(outputText).not.toContain('apps/svelte.dev/content/docs/kit/')

		// Test path cleaning - should contain the cleaned paths
		expect(outputText).toContain('docs/svelte/01-introduction.md')
		expect(outputText).toContain('docs/svelte/02-runes.md')
		expect(outputText).toContain('docs/kit/01-routing.md')

		// Test categorization - should have both section headers
		expect(outputText).toContain('# Svelte')
		expect(outputText).toContain('# SvelteKit')

		// Test that Svelte sections are under the Svelte header
		const svelteHeaderIndex = outputText.indexOf('# Svelte')
		const svelteKitHeaderIndex = outputText.indexOf('# SvelteKit')
		const introductionIndex = outputText.indexOf(
			'title: Introduction, path: docs/svelte/01-introduction.md'
		)
		const stateIndex = outputText.indexOf('title: $state, path: docs/svelte/02-runes.md')

		expect(svelteHeaderIndex).toBeGreaterThan(-1)
		expect(svelteKitHeaderIndex).toBeGreaterThan(-1)
		expect(introductionIndex).toBeGreaterThan(svelteHeaderIndex)
		expect(stateIndex).toBeGreaterThan(svelteHeaderIndex)
		expect(introductionIndex).toBeLessThan(svelteKitHeaderIndex)

		// Test that SvelteKit sections are under the SvelteKit header
		const routingIndex = outputText.indexOf('title: Routing, path: docs/kit/01-routing.md')
		expect(routingIndex).toBeGreaterThan(svelteKitHeaderIndex)

		// Test exact output format
		expect(outputText).toMatch(/\* title: Introduction, path: docs\/svelte\/01-introduction\.md/)
		expect(outputText).toMatch(/\* title: \$state, path: docs\/svelte\/02-runes\.md/)
		expect(outputText).toMatch(/\* title: Routing, path: docs\/kit\/01-routing\.md/)
	})

	it('should handle empty sections gracefully when filtering is broken', async () => {
		// This test specifically checks for the bug scenario
		// If filtering logic is broken, we should get empty sections instead of proper categorization
		const listResult = await listSectionsHandler()
		const outputText = listResult.content[0].text

		// If the filtering was broken, these sections would be missing entirely
		// This test ensures that we actually have sections in both categories
		const hasSvelteSection =
			outputText.includes('# Svelte') && outputText.match(/# Svelte\n[\s\S]*?\* title:/)
		const hasSvelteKitSection =
			outputText.includes('# SvelteKit') && outputText.match(/# SvelteKit\n[\s\S]*?\* title:/)

		expect(hasSvelteSection).toBeTruthy()
		expect(hasSvelteKitSection).toBeTruthy()

		// Should have at least one item in each section
		const svelteMatches = outputText.match(/# Svelte\n([\s\S]*?)(?=# SvelteKit|$)/)
		const svelteKitMatches = outputText.match(/# SvelteKit\n([\s\S]*)$/)

		expect(svelteMatches?.[1]).toContain('* title:')
		expect(svelteKitMatches?.[1]).toContain('* title:')
	})

	it('should handle errors gracefully', async () => {
		// Mock database error
		const mockGetDocumentationSections = vi.mocked(ContentDbService.getDocumentationSections)
		mockGetDocumentationSections.mockRejectedValue(new Error('Database error'))

		const result = await listSectionsHandler()

		expect(result.content[0].type).toBe('text')
		expect(result.content[0].text).toContain('❌ Error listing sections')
		expect(result.content[0].text).toContain('Database error')
	})
})
