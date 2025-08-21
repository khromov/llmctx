import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listSectionsHandler } from './listSectionsHandler'
import { getDocumentationHandler } from './getDocumentationHandler'
import { ContentDbService } from '$lib/server/contentDb'
import { mockSvelteContent } from '$lib/test-fixtures/mockSvelteContent'

// Mock ContentDbService
vi.mock('$lib/server/contentDb', () => ({
	ContentDbService: {
		getDocumentationSections: vi.fn(),
		searchContent: vi.fn()
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

describe('MCP Handler Integration', () => {
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

		// Setup default mock implementation for searchContent
		const mockSearchContent = vi.mocked(ContentDbService.searchContent)
		mockSearchContent.mockImplementation(async (searchQuery) => {
			// Find matching content from mock data
			const lowerQuery = searchQuery.toLowerCase()

			// Try exact title match first
			let match = mockSvelteContent.find((item) => {
				const title = (item.metadata?.title as string) || ''
				return title.toLowerCase() === lowerQuery
			})

			// Try partial title match
			if (!match) {
				match = mockSvelteContent.find((item) => {
					const title = (item.metadata?.title as string) || ''
					return title.toLowerCase().includes(lowerQuery)
				})
			}

			// Try path match
			if (!match) {
				match = mockSvelteContent.find((item) => item.path.toLowerCase().includes(lowerQuery))
			}

			return match || null
		})
	})

	it('should list sections and successfully fetch each one using both handlers', async () => {
		// First, call the listSectionsHandler
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

		// Then, test fetching by title using getDocumentationHandler
		const stateResult = await getDocumentationHandler({ section: '$state' })
		expect(stateResult.content[0].text).toContain(
			'$state rune is used to create reactive state in Svelte 5'
		)
		expect(stateResult.content[0].text).not.toContain('❌')

		// Test fetching by path using getDocumentationHandler
		const pathResult = await getDocumentationHandler({
			section: 'apps/svelte.dev/content/docs/svelte/02-runes.md'
		})
		expect(pathResult.content[0].text).toContain(
			'$state rune is used to create reactive state in Svelte 5'
		)
		expect(pathResult.content[0].text).not.toContain('❌')
	})

	it('should work end-to-end with listing sections and fetching multiple sections', async () => {
		// First list sections
		const listResult = await listSectionsHandler()
		expect(listResult.content[0].text).toContain('Available documentation sections')

		// Then fetch multiple sections at once
		const multipleResult = await getDocumentationHandler({
			section: ['$state', '$derived', '$effect']
		})

		expect(multipleResult.content).toBeDefined()
		expect(multipleResult.content[0].type).toBe('text')
		expect(multipleResult.content[0].text).toContain('$state')
		expect(multipleResult.content[0].text).toContain('$derived')
		expect(multipleResult.content[0].text).toContain('$effect')
		expect(multipleResult.content[0].text).toContain('---') // Should have separators
		expect(multipleResult.content[0].text).not.toContain('❌')
	})
})
