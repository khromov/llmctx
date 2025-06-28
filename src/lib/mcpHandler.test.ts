import { describe, it, expect, vi } from 'vitest'
import { listSectionsHandler, getDocumentationHandler } from './mcpHandler'

// Mock environment variables
vi.mock('$env/dynamic/private', () => ({
	env: {
		GITHUB_TOKEN: 'test-token',
		REDIS_URL: undefined
	}
}))

describe('MCP Handler Integration', () => {
	it('should list sections and successfully fetch each one using real MCP functions', async () => {
		// Call the real listSectionsHandler
		const listResult = await listSectionsHandler()

		console.log('List result:', listResult)
		expect(listResult.content).toBeDefined()
		expect(listResult.content[0].type).toBe('text')
		expect(listResult.content[0].text).toContain('Available documentation sections')

		// Extract section titles and paths from the output
		const outputText = listResult.content[0].text
		const sectionMatches = outputText.match(/\* title: ([^,]+), path: ([^\n]+)/g)
		expect(sectionMatches).not.toBeNull()
		expect(sectionMatches!.length).toBeGreaterThan(0)

		// Test ALL sections from the list - both by title and by path
		for (const match of sectionMatches!) {
			const titleMatch = match.match(/\* title: ([^,]+), path: ([^\n]+)/)!
			const title = titleMatch[1]
			const path = titleMatch[2]

			// Test searching by title
			const docResultByTitle = await getDocumentationHandler({ section: title })
			expect(docResultByTitle.content).toBeDefined()
			expect(docResultByTitle.content[0].type).toBe('text')
			expect(docResultByTitle.content[0].text).toContain('documentation')
			expect(docResultByTitle.content[0].text).not.toContain('❌')

			// Test searching by path
			const docResultByPath = await getDocumentationHandler({ section: path })
			expect(docResultByPath.content).toBeDefined()
			expect(docResultByPath.content[0].type).toBe('text')
			expect(docResultByPath.content[0].text).toContain('documentation')
			expect(docResultByPath.content[0].text).not.toContain('❌')
		}
	}, 30000)

	it('should handle trailing commas in search queries using real MCP functions', async () => {
		// Get a section title first
		const listResult = await listSectionsHandler()
		const outputText = listResult.content[0].text
		const firstMatch = outputText.match(/\* title: ([^,]+),/)

		if (firstMatch) {
			const title = firstMatch[1]

			// Test with trailing comma
			const resultWithComma = await getDocumentationHandler({ section: title + ',' })
			expect(resultWithComma.content[0].text).toContain('documentation')
			expect(resultWithComma.content[0].text).not.toContain('❌')

			// Test with trailing comma and whitespace
			const resultWithCommaSpace = await getDocumentationHandler({ section: title + ', ' })
			expect(resultWithCommaSpace.content[0].text).toContain('documentation')
			expect(resultWithCommaSpace.content[0].text).not.toContain('❌')
		}
	}, 15000)

	it('should search by both title and path using real MCP functions', async () => {
		// Get a section with path
		const listResult = await listSectionsHandler()
		const outputText = listResult.content[0].text
		const match = outputText.match(/\* title: ([^,]+), path: ([^\n]+)/)

		if (match) {
			const title = match[1]
			const path = match[2]

			// Search by title
			const resultByTitle = await getDocumentationHandler({ section: title })
			expect(resultByTitle.content[0].text).toContain('documentation')
			expect(resultByTitle.content[0].text).not.toContain('❌')

			// Search by path
			const resultByPath = await getDocumentationHandler({ section: path })
			expect(resultByPath.content[0].text).toContain('documentation')
			expect(resultByPath.content[0].text).not.toContain('❌')
		}
	}, 15000)

	it('should return error for non-existent sections using real MCP functions', async () => {
		const result = await getDocumentationHandler({ section: 'non-existent-section-12345' })
		expect(result.content[0].text).toContain('not found')
	}, 15000)

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
	}, 15000)

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
	}, 15000)

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
	}, 15000)
})
