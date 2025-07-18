import { z } from 'zod'
import { createMcpHandler } from '@vercel/mcp-adapter'
import { env } from '$env/dynamic/private'
import { ContentDbService } from '$lib/server/contentDb'
import type { DbContent } from '$lib/types/db'
import { log, logAlways, logErrorAlways } from '$lib/log'

interface DocumentSection {
	filePath: string
	title: string
	content: string
}

/**
 * Safely extract title from metadata, ensuring it's a string
 */
function getTitleFromMetadata(
	metadata: Record<string, unknown> | undefined,
	fallbackPath: string
): string {
	if (metadata?.title && typeof metadata.title === 'string') {
		return metadata.title
	}
	return extractTitleFromPath(fallbackPath)
}

export const listSectionsHandler = async () => {
	logAlways('Listing sections from database')

	try {
		// Query the database for all content in the docs directory
		const allContent = await ContentDbService.getContentByFilter({
			owner: 'sveltejs',
			repo_name: 'svelte.dev',
			path_pattern: 'apps/svelte.dev/content/docs/%'
		})

		// Filter and transform content into sections
		const sections: DocumentSection[] = []

		for (const item of allContent) {
			// Skip files that are too small
			if (item.content.length < 100) {
				log(`Filtered out section: "${item.path}" (${item.content.length} chars)`)
				continue
			}

			// Extract title from metadata or filename with proper type safety
			const title = getTitleFromMetadata(item.metadata, item.path)

			sections.push({
				filePath: item.path,
				title,
				content: `## ${item.path}\n\n${item.content}`
			})
		}

		// Sort sections by path
		sections.sort((a, b) => a.filePath.localeCompare(b.filePath))

		// Group by Svelte vs SvelteKit
		const svelteSections = sections.filter((s) => s.filePath.includes('/content/docs/svelte/'))
		const svelteKitSections = sections.filter((s) => s.filePath.includes('/content/docs/kit/'))

		// Format output
		let output = ''

		if (svelteSections.length > 0) {
			output += '# Svelte\n'
			output +=
				svelteSections
					.map((section) => `* title: ${section.title}, path: ${section.filePath}`)
					.join('\n') + '\n\n'
		}

		if (svelteKitSections.length > 0) {
			output += '# SvelteKit\n'
			output += svelteKitSections
				.map((section) => `* title: ${section.title}, path: ${section.filePath}`)
				.join('\n')
		}

		return {
			content: [
				{
					type: 'text' as const,
					text: `📋 Available documentation sections:\n\n${output}\n\nUse get_documentation with a section name to retrieve specific content for a section.`
				}
			]
		}
	} catch (error) {
		logErrorAlways('Error listing sections:', error)
		return {
			content: [
				{
					type: 'text' as const,
					text: `❌ Error listing sections: ${error instanceof Error ? error.message : String(error)}`
				}
			]
		}
	}
}

export const getDocumentationHandler = async ({ section }: { section: string | string[] }) => {
	try {
		// Handle array of sections - including JSON string arrays
		let sections: string[]
		if (Array.isArray(section)) {
			sections = section
		} else if (
			typeof section === 'string' &&
			section.trim().startsWith('[') &&
			section.trim().endsWith(']')
		) {
			// Try to parse JSON string array
			try {
				const parsed = JSON.parse(section)
				sections = Array.isArray(parsed) ? parsed : [section]
			} catch {
				sections = [section]
			}
		} else {
			sections = [section]
		}

		const results: string[] = []
		const notFound: string[] = []

		for (const sectionName of sections) {
			log({ section: sectionName })

			// Remove trailing comma if present
			const cleanSection = sectionName.replace(/,\s*$/, '')

			// Search in database
			const matchedContent = await searchSectionInDb(cleanSection)

			if (matchedContent) {
				// Format with path header
				const formattedContent = `## ${matchedContent.path}\n\n${matchedContent.content}`
				const framework = matchedContent.path.includes('/docs/svelte/') ? 'Svelte' : 'SvelteKit'

				const title = getTitleFromMetadata(matchedContent.metadata, matchedContent.path)
				results.push(`📖 ${framework} documentation (${title}):\n\n${formattedContent}`)
			} else {
				notFound.push(cleanSection)
			}
		}

		if (results.length === 0) {
			// No sections found
			const sectionList = Array.isArray(section) ? section.join(', ') : section
			return {
				content: [
					{
						type: 'text' as const,
						text: `❌ Section(s) "${sectionList}" not found in Svelte or SvelteKit documentation. Use list_sections to see all available sections.`
					}
				]
			}
		}

		// Build response text
		let responseText = results.join('\n\n---\n\n')

		if (notFound.length > 0) {
			responseText += `\n\n---\n\n❌ The following sections were not found: ${notFound.join(', ')}`
		}

		return {
			content: [
				{
					type: 'text' as const,
					text: responseText
				}
			]
		}
	} catch (error) {
		logErrorAlways('Error fetching documentation:', error)
		const sectionList = Array.isArray(section) ? section.join(', ') : section
		return {
			content: [
				{
					type: 'text' as const,
					text: `❌ Error fetching documentation for section(s) "${sectionList}": ${error instanceof Error ? error.message : String(error)}`
				}
			]
		}
	}
}

async function searchSectionInDb(query: string): Promise<DbContent | null> {
	const lowerQuery = query.toLowerCase()

	// Query database for all docs content
	const allContent = await ContentDbService.getContentByFilter({
		owner: 'sveltejs',
		repo_name: 'svelte.dev',
		path_pattern: 'apps/svelte.dev/content/docs/%'
	})

	// First try exact title match
	let match = allContent.find((item) => {
		const title = getTitleFromMetadata(item.metadata, item.path)
		return title.toLowerCase() === lowerQuery
	})
	if (match) return match

	// Then try partial title match
	match = allContent.find((item) => {
		const title = getTitleFromMetadata(item.metadata, item.path)
		return title.toLowerCase().includes(lowerQuery)
	})
	if (match) return match

	// Finally try file path match for backward compatibility
	match = allContent.find((item) => item.path.toLowerCase().includes(lowerQuery))
	if (match) return match

	return null
}

function extractTitleFromPath(filePath: string): string {
	const filename = filePath.split('/').pop() || filePath
	return filename.replace('.md', '').replace(/^\d+-/, '')
}

export const handler = createMcpHandler(
	(server) => {
		server.tool(
			'list_sections',
			'Lists all available Svelte 5 and SvelteKit documentation sections in a structured format. Returns sections as a list of "* title: [section_title], path: [file_path]" - you can use either the title or path when querying a specific section via the get_documentation tool. Always run list_sections first for any query related to Svelte development to discover available content.',
			{},
			async () => listSectionsHandler()
		)

		server.tool(
			'get_documentation',
			'Retrieves full documentation content for Svelte 5 or SvelteKit sections. Supports flexible search by title (e.g., "$state", "routing") or file path (e.g., "docs/svelte/state.md"). Can accept a single section name or an array of sections. Before running this, make sure to analyze the users query, as well as the output from list_sections (which should be called first). Then ask for ALL relevant sections the user might require. For example, if the user asks to build anything interactive, you will need to fetch all relevant runes, and so on.',
			{
				section: z
					.union([z.string(), z.array(z.string())])
					.describe(
						'The section name(s) to retrieve. Can search by title (e.g., "$state", "load functions") or file path (e.g., "docs/svelte/state.md"). Supports single string and array of strings'
					)
			},
			async ({ section }) => getDocumentationHandler({ section })
		)
	},
	{},
	{
		maxDuration: 3600,
		basePath: '/mcp',
		verboseLogs: true,
		redisUrl: env.REDIS_URL ? env.REDIS_URL : 'redis://127.0.0.1:6379'
	}
)
