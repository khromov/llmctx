import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getDocumentationHandler } from './getDocumentationHandler'
import { ContentDbService } from '$lib/server/contentDb'
import { mockSvelteContent } from '$lib/test-fixtures/mockSvelteContent'

// Mock ContentDbService
vi.mock('$lib/server/contentDb', () => ({
	ContentDbService: {
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

describe('getDocumentationHandler', () => {
	beforeEach(() => {
		// Reset mocks before each test
		vi.clearAllMocks()

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

	it('should clean paths in documentation responses', async () => {
		const result = await getDocumentationHandler({ section: '$state' })
		const responseText = result.content[0].text

		// Should contain cleaned path in the header
		expect(responseText).toContain('## docs/svelte/02-runes.md')

		// Should NOT contain the full database path
		expect(responseText).not.toContain('## apps/svelte.dev/content/docs/svelte/02-runes.md')
	})

	it('should handle trailing commas in search queries', async () => {
		// Test with trailing comma
		const resultWithComma = await getDocumentationHandler({ section: '$state,' })
		expect(resultWithComma.content[0].text).toContain(
			'$state rune is used to create reactive state in Svelte 5'
		)
		expect(resultWithComma.content[0].text).not.toContain('❌')

		// Test with trailing comma and whitespace
		const resultWithCommaSpace = await getDocumentationHandler({ section: '$state, ' })
		expect(resultWithCommaSpace.content[0].text).toContain(
			'$state rune is used to create reactive state in Svelte 5'
		)
		expect(resultWithCommaSpace.content[0].text).not.toContain('❌')
	})

	it('should search by both title and path', async () => {
		// Search by title
		const resultByTitle = await getDocumentationHandler({ section: '$derived' })
		expect(resultByTitle.content[0].text).toContain(
			'$derived rune is used to create derived state that automatically updates'
		)
		expect(resultByTitle.content[0].text).not.toContain('❌')

		// Search by path
		const resultByPath = await getDocumentationHandler({
			section: 'apps/svelte.dev/content/docs/svelte/03-derived.md'
		})
		expect(resultByPath.content[0].text).toContain(
			'$derived rune is used to create derived state that automatically updates'
		)
		expect(resultByPath.content[0].text).not.toContain('❌')
	})

	it('should return error for non-existent sections', async () => {
		const result = await getDocumentationHandler({ section: 'non-existent-section-12345' })
		expect(result.content[0].text).toContain('not found')
	})

	it('should handle array of section names', async () => {
		// Test with multiple valid sections
		const result = await getDocumentationHandler({
			section: ['$state', '$derived', '$effect']
		})

		expect(result.content).toBeDefined()
		expect(result.content[0].type).toBe('text')
		expect(result.content[0].text).toContain('$state')
		expect(result.content[0].text).toContain('$derived')
		expect(result.content[0].text).toContain('$effect')
		expect(result.content[0].text).toContain('---') // Should have separators
		expect(result.content[0].text).not.toContain('❌')
	})

	it('should handle mixed valid and invalid sections in array', async () => {
		// Test with mix of valid and invalid sections
		const result = await getDocumentationHandler({
			section: ['$state', 'non-existent-section', '$derived']
		})

		expect(result.content).toBeDefined()
		expect(result.content[0].type).toBe('text')
		expect(result.content[0].text).toContain('$state')
		expect(result.content[0].text).toContain('$derived')
		expect(result.content[0].text).toContain('not found')
		expect(result.content[0].text).toContain('non-existent-section')
	})

	it('should handle JSON string arrays from Claude', async () => {
		// Test with JSON string array (like Claude sends)
		const result = await getDocumentationHandler({
			section: '["$state", "$derived"]'
		})

		expect(result.content).toBeDefined()
		expect(result.content[0].type).toBe('text')
		expect(result.content[0].text).toContain('$state')
		expect(result.content[0].text).toContain('$derived')
		expect(result.content[0].text).toContain('---') // Should have separators
		expect(result.content[0].text).not.toContain('❌')
	})

	it('should handle malformed JSON arrays gracefully', async () => {
		// Test with malformed JSON that should be treated as a single string
		const result = await getDocumentationHandler({
			section: '["$state", "$derived"'
		})

		expect(result.content).toBeDefined()
		expect(result.content[0].type).toBe('text')
		expect(result.content[0].text).toContain('not found')
	})

	it('should handle empty section arrays', async () => {
		const result = await getDocumentationHandler({
			section: []
		})

		expect(result.content).toBeDefined()
		expect(result.content[0].type).toBe('text')
		expect(result.content[0].text).toContain('not found')
	})

	it('should handle database errors gracefully', async () => {
		// Mock database error
		const mockSearchContent = vi.mocked(ContentDbService.searchContent)
		mockSearchContent.mockRejectedValue(new Error('Database error'))

		const result = await getDocumentationHandler({ section: '$state' })

		expect(result.content[0].type).toBe('text')
		expect(result.content[0].text).toContain('❌ Section(s) "$state" not found')
	})
})
