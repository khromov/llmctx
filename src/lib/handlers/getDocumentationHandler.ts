import { ContentDbService } from '$lib/server/contentDb'
import type { DbContent } from '$lib/types/db'
import { logAlways, logErrorAlways, log } from '$lib/log'
import { cleanDocumentationPath, extractTitleFromPath } from '$lib/utils/pathUtils'

function getTitleFromMetadata(
	metadata: Record<string, unknown> | undefined,
	fallbackPath: string
): string {
	if (metadata?.title && typeof metadata.title === 'string') {
		return metadata.title
	}
	return extractTitleFromPath(fallbackPath)
}

async function searchSectionInDb(query: string): Promise<DbContent | null> {
	try {
		// Use the new searchContent method with default parameters
		const result = await ContentDbService.searchContent(query, 'content')

		return result
	} catch (error) {
		logErrorAlways(`Error searching for section "${query}":`, error)
		return null
	}
}

export const getDocumentationHandler = async ({ section }: { section: string | string[] }) => {
	logAlways('getDocumentationHandler called with:', { section, type: typeof section })

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
				logAlways('JSON parsed successfully:', parsed)
				sections = Array.isArray(parsed) ? parsed : [section]
			} catch (parseError) {
				logAlways('JSON parse failed:', parseError)
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

			const matchedContent = await searchSectionInDb(cleanSection)

			if (matchedContent) {
				const cleanedPath = cleanDocumentationPath(matchedContent.path)
				const formattedContent = `## ${cleanedPath}\n\n${matchedContent.content}`
				const framework = matchedContent.path.includes('/docs/svelte/') ? 'Svelte' : 'SvelteKit'
				const title = getTitleFromMetadata(matchedContent.metadata, matchedContent.path)
				results.push(`📖 ${framework} documentation (${title}):\n\n${formattedContent}`)
			} else {
				notFound.push(cleanSection)
			}
		}

		if (results.length === 0) {
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

		let responseText = results.join('\n\n---\n\n')

		if (notFound.length > 0) {
			responseText += `\n\n---\n\n❌ The following sections were not found: ${notFound.join(', ')}`
		}

		logAlways(`Returned ${results.length} sections successfully`)
		return {
			content: [
				{
					type: 'text' as const,
					text: responseText
				}
			]
		}
	} catch (error) {
		logErrorAlways('getDocumentationHandler error:', error)
		logErrorAlways('Original section parameter:', section, 'type:', typeof section)
		logErrorAlways('Error stack:', error instanceof Error ? error.stack : 'no stack')

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
