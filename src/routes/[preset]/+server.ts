// Types
import type { RequestHandler } from './$types'

// Utils
import { error } from '@sveltejs/kit'
import { presets } from '$lib/presets'
import { dev } from '$app/environment'
import {
	fetchAndProcessMarkdownWithDb,
	fetchAndProcessMultiplePresetsWithDb
} from '$lib/fetchMarkdown'
import { getPresetContent } from '$lib/presetCache'
import { PresetDbService } from '$lib/server/presetDb'
import { logAlways, logErrorAlways } from '$lib/log'

// Valid virtual presets that aren't in the presets object
const VIRTUAL_DISTILLED_PRESETS = ['svelte-distilled', 'sveltekit-distilled']

// Background updates are now handled by the scheduler service
// This function is kept for backwards compatibility but is no longer used

export const GET: RequestHandler = async ({ params, url }) => {
	const presetNames = params.preset.split(',').map((p) => p.trim())

	logAlways(`Received request for presets: ${presetNames.join(', ')}`)

	// Validate all preset names first
	const invalidPresets = presetNames.filter(
		(name) => !(name in presets) && !VIRTUAL_DISTILLED_PRESETS.includes(name)
	)

	if (invalidPresets.length > 0) {
		error(400, `Invalid preset(s): "${invalidPresets.join('", "')}"`)
	}

	try {
		// Determine which version of the distilled doc to use
		const version = url.searchParams.get('version') || 'latest'

		// Separate distilled and regular presets
		const distilledPresetNames = presetNames.filter(
			(name) => presets[name]?.distilled || VIRTUAL_DISTILLED_PRESETS.includes(name)
		)
		const regularPresetNames = presetNames.filter(
			(name) => !presets[name]?.distilled && !VIRTUAL_DISTILLED_PRESETS.includes(name)
		)

		const contentMap = new Map<string, string>()

		// Handle distilled presets individually (they come from the database)
		for (const presetKey of distilledPresetNames) {
			try {
				const dbDistillation = await PresetDbService.getDistillationByVersion(presetKey, version)

				if (!dbDistillation || !dbDistillation.content) {
					throw new Error(
						`Failed to read distilled content for ${presetKey} version ${version}. Make sure to run the distillation process first.`
					)
				}

				// TODO ????
				contentMap.set(presetKey, dbDistillation.content)
			} catch (e) {
				logErrorAlways(`Error fetching distilled preset ${presetKey}:`, e)
				throw e
			}
		}

		// Handle regular presets - check cache first, then use batch processing for non-cached
		if (regularPresetNames.length > 0) {
			const nonCachedPresets: Array<{
				key: string
				config: (typeof presets)[keyof typeof presets]
			}> = []

			// Check cache for each regular preset
			for (const presetKey of regularPresetNames) {
				const cachedContent = await getPresetContent(presetKey)
				if (cachedContent) {
					contentMap.set(presetKey, cachedContent)
					logAlways(`Using cached content for ${presetKey}`)
				} else {
					nonCachedPresets.push({ key: presetKey, config: presets[presetKey] })
				}
			}

			// If we have non-cached presets, process them together
			if (nonCachedPresets.length > 0) {
				if (dev) {
					console.time('batchDataFetching')
				}

				const batchResults = await fetchAndProcessMultiplePresetsWithDb(nonCachedPresets)

				if (dev) {
					console.timeEnd('batchDataFetching')
				}

				// Add batch results to content map
				for (const [key, content] of batchResults) {
					contentMap.set(key, content)
				}
			}
		}

		// Build the final response in the order requested
		const contents: string[] = []

		for (const presetKey of presetNames) {
			const content = contentMap.get(presetKey)

			if (!content) {
				throw new Error(`No content found for ${presetKey}`)
			}

			logAlways(`Content length for ${presetKey}: ${content.length}`)

			// Add the prompt if it exists and we're not using a distilled preset
			// (distilled presets already have the prompt added)
			const finalContent =
				!presets[presetKey]?.distilled &&
				!VIRTUAL_DISTILLED_PRESETS.includes(presetKey) &&
				presets[presetKey]?.prompt
					? `${content}\n\nInstructions for LLMs: <SYSTEM>${presets[presetKey].prompt}</SYSTEM>`
					: content

			contents.push(finalContent)
		}

		// Join all contents with a delimiter
		const response = contents.join('\n\n---\n\n')

		logAlways(`Final combined response length: ${response.length}`)

		const headers: HeadersInit = {
			'Content-Type': 'text/plain; charset=utf-8'
		}

		// Serve as a download if not in development mode
		if (!dev) {
			headers['Content-Disposition'] = `attachment; filename="${presetNames.join('-')}.txt"`
		}

		return new Response(response, {
			status: 200,
			headers
		})
	} catch (e) {
		logErrorAlways(`Error fetching documentation for presets [${presetNames.join(', ')}]:`, e)
		error(500, `Failed to fetch documentation for presets "${presetNames.join(', ')}"`)
	}
}
