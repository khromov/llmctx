import { z } from 'zod'
import { createMcpHandler } from 'mcp-handler'
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
import { env } from '$env/dynamic/private'
import { ContentDbService } from '$lib/server/contentDb'
import { ContentDistilledDbService } from '$lib/server/contentDistilledDb'
import type { DbContent } from '$lib/types/db'
import { listSectionsHandler } from '$lib/handlers/listSectionsHandler'
import { getDocumentationHandler } from '$lib/handlers/getDocumentationHandler'
import { registerTemplatePrompts } from '$lib/mcpPrompts'
import { PRESET_CONFIGS } from '$lib/mcpPresets'
import { logAlways, logErrorAlways } from '$lib/log'
import {
	cleanDocumentationPath,
	extractTitleFromPath,
	removeFrontmatter
} from '$lib/utils/pathUtils'
import { createSvelteDeveloperPromptWithTask } from '$lib/utils/prompts'

// Helper function to search for sections in the database
async function searchSectionInDb(query: string): Promise<DbContent | null> {
	try {
		// Use the searchContent method with default parameters
		const result = await ContentDbService.searchContent(query, 'content')
		return result
	} catch (error) {
		logErrorAlways(`Error searching for section "${query}":`, error)
		return null
	}
}

// Helper function to get title from metadata or path
function getTitleFromMetadata(
	metadata: Record<string, unknown> | undefined,
	fallbackPath: string
): string {
	if (metadata?.title && typeof metadata.title === 'string') {
		return metadata.title
	}
	return extractTitleFromPath(fallbackPath)
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

		// Main developer prompt with optional task parameter
		server.registerPrompt(
			'svelte-developer',
			{
				title: 'Svelte 5 Developer Assistant',
				description:
					'Expert-level guidance for Svelte 5 and SvelteKit development with optional task-specific focus',
				argsSchema: {
					task: z.string().optional().describe('Optional specific task or requirement to focus on')
				}
			},
			({ task }) => {
				const promptText = createSvelteDeveloperPromptWithTask(task)

				return {
					messages: [
						{
							role: 'user',
							content: {
								type: 'text',
								text: promptText
							}
						}
					]
				}
			}
		)

		// Register the template-based prompts
		registerTemplatePrompts(server)

		server.resource(
			'svelte-doc',
			new ResourceTemplate('svelte-llm://{+slug}', {
				list: async () => {
					const resources = []

					// First, add preset resources
					for (const preset of PRESET_CONFIGS) {
						resources.push({
							name: `📦 ${preset.title}`,
							uri: `svelte-llm://${preset.id}`,
							description: preset.description
						})
					}

					// Then add individual documents
					const documents = await ContentDbService.getContentByFilter({
						path_pattern: 'apps/svelte.dev/content/docs/%'
					})

					logAlways(`Found ${documents.length} individual documents for resource listing`)

					for (const doc of documents) {
						const title = getTitleFromMetadata(doc.metadata, doc.path)
						const cleanPath = cleanDocumentationPath(doc.path)

						resources.push({
							// Use title and clean path for better display, prefix with 📄 to distinguish from presets
							name: `📄 ${title} (${cleanPath})`,
							// Use cleaned path with prefix to avoid conflicts with preset IDs
							uri: `svelte-llm://doc/${cleanPath}`,
							// Add description from metadata if available
							description: doc.metadata?.description as string | undefined
						})
					}

					logAlways(
						`Returning ${resources.length} total resources (${PRESET_CONFIGS.length} presets + ${documents.length} individual docs)`
					)

					return { resources }
				},
				complete: {
					slug: async (query) => {
						const suggestions = []

						// Add preset completions first
						for (const preset of PRESET_CONFIGS) {
							if (
								preset.id.toLowerCase().includes(query.toLowerCase()) ||
								preset.title.toLowerCase().includes(query.toLowerCase())
							) {
								suggestions.push(preset.id)
							}
						}

						// Then add individual document completions
						const searchResults = await ContentDbService.searchAllContent(query)
						const paths = searchResults.map((doc) => `doc/${cleanDocumentationPath(doc.path)}`)

						suggestions.push(...paths)

						logAlways(`Found ${suggestions.length} completions for query: ${query}`)

						return suggestions
					}
				}
			}),
			async (uri, { slug }) => {
				// If array for some reason, use the first element
				const slugString = Array.isArray(slug) ? slug[0] : slug

				logAlways(`Resource requested with slug: ${slugString}`)

				// Check if this is a preset request
				const preset = PRESET_CONFIGS.find((p) => p.id === slugString)
				if (preset) {
					logAlways(`Serving preset resource: ${preset.id}`)

					// Get aggregated content for this preset
					const content = await ContentDistilledDbService.getContentByPathPatterns(preset.patterns)

					if (!content || content.trim().length === 0) {
						throw new Error(
							`No content found for preset: ${preset.id}. The distilled content may not be available yet.`
						)
					}

					return {
						contents: [
							{
								uri: uri.toString(),
								type: 'text',
								text: content,
								metadata: {
									title: preset.title,
									description: preset.description,
									type: 'preset',
									id: preset.id
								}
							}
						]
					}
				}

				// Handle individual document requests (with 'doc/' prefix)
				let documentSlug = slugString
				if (slugString.startsWith('doc/')) {
					documentSlug = slugString.substring(4) // Remove 'doc/' prefix
				}

				logAlways(`Serving individual document with slug: ${documentSlug}`)

				// First try intelligent search (by title or partial path)
				let document = await searchSectionInDb(documentSlug)

				// If not found, try exact path match with cleaned path
				if (!document) {
					// Try to find by cleaned path - need to search all content and match cleaned paths
					const allDocs = await ContentDbService.getContentByFilter({
						path_pattern: 'apps/svelte.dev/content/docs/%'
					})

					document =
						allDocs.find((doc) => cleanDocumentationPath(doc.path) === documentSlug) || null
				}

				// If still not found, try with the full path pattern (for backward compatibility)
				if (!document && !documentSlug.startsWith('apps/svelte.dev/content/')) {
					const fullPath = `apps/svelte.dev/content/docs/${documentSlug}`
					document = await ContentDbService.getContentByPath(fullPath)
				}

				// If still not found, try direct database path match (for backward compatibility)
				if (!document) {
					document = await ContentDbService.getContentByPath(documentSlug)
				}

				if (!document) {
					throw new Error(
						`Document not found for slug: ${documentSlug}. Try using a document title (e.g., "$state") or a valid path.`
					)
				}

				const title = getTitleFromMetadata(document.metadata, document.path)
				const cleanPath = cleanDocumentationPath(document.path)

				// Remove frontmatter from the content before returning it
				const contentWithoutFrontmatter = removeFrontmatter(document.content)

				logAlways(`Returning individual document: ${title} (${cleanPath})`)

				return {
					contents: [
						{
							uri: uri.toString(),
							type: 'text',
							text: contentWithoutFrontmatter,
							// Include metadata in the response
							metadata: {
								title,
								path: cleanPath,
								originalPath: document.path,
								type: 'document'
							}
						}
					]
				}
			}
		)
	},
	{},
	{
		maxDuration: 3600,
		basePath: '/mcp',
		verboseLogs: false,
		redisUrl: env.REDIS_URL ? env.REDIS_URL : 'redis://127.0.0.1:6379'
	}
)
