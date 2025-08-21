import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { ContentDistilledDbService } from '$lib/server/contentDistilledDb'
import { SVELTE_5_PROMPT } from '$lib/utils/prompts'
import { PRESET_CONFIGS } from '$lib/mcpPresets'

/**
 * Register template-based prompts for documentation injection
 * These prompts automatically fetch and inject relevant documentation content
 * based on predefined path patterns for different Svelte/SvelteKit sections
 */
export function registerTemplatePrompts(server: McpServer): void {
	// Register prompts for each preset configuration
	for (const preset of PRESET_CONFIGS) {
		server.registerPrompt(
			preset.id,
			{
				title: preset.title,
				description: `Inject ${preset.description.toLowerCase()}`,
				argsSchema: {}
			},
			async () => {
				const content = await ContentDistilledDbService.getContentByPathPatterns(preset.patterns)
				const promptText = `${SVELTE_5_PROMPT}\n\n${preset.title}:\n\n${content}`

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
	}
}
