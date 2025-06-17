import { error, json } from '@sveltejs/kit'
import { env } from '$env/dynamic/private'
import { dev } from '$app/environment'
import { presets } from '$lib/presets'
import { fetchMarkdownFiles, minimizeContent } from '$lib/fetchMarkdown'
import type { RequestHandler } from './$types'
import { AnthropicProvider, type BatchProcessingOptions } from '$lib/anthropic'
import { writeAtomicFile } from '$lib/fileCache'

const DISTILLATION_PROMPT = `
You are an expert in web development, specifically Svelte 5 and SvelteKit. Your task is to condense and distill the Svelte documentation into a concise format while preserving the most important information.
Shorten the text information AS MUCH AS POSSIBLE while covering key concepts.

Focus on:
1. Code examples with short explanations of how they work
2. Key concepts and APIs with their usage patterns
3. Important gotchas and best practices
4. Patterns that developers commonly use

Remove:
1. Redundant explanations
2. Verbose content that can be simplified
3. Marketing language
4. Legacy or deprecated content
5. Anything else that is not strictly necessary

Keep your output in markdown format. Preserve code blocks with their language annotations.
Maintain headings but feel free to combine or restructure sections to improve clarity.

Make sure all code examples use Svelte 5 runes syntax ($state, $derived, $effect, etc.)

Keep the following Svelte 5 syntax rules in mind:
* There is no colon (:) in event modifiers. You MUST use "onclick" instead of "on:click".
* Runes do not need to be imported, they are globals. 
* $state() runes are always declared using let, never with const. 
* When passing a function to $derived, you must always use $derived.by(() => ...). 
* Error boundaries can only catch errors during component rendering and at the top level of an $effect inside the error boundary.
* Error boundaries do not catch errors in onclick or other event handlers.

IMPORTANT: All code examples MUST come from the documentation verbatim, do NOT create new code examples. Do NOT modify existing code examples.
IMPORTANT: Because of changes in Svelte 5 syntax, do not include content from your existing knowledge, you may only use knowledge from the documentation to condense.

Here is the documentation you must condense:

`

// Virtual preset basenames for the split content
const SVELTE_DISTILLED_BASENAME = 'svelte-distilled'
const SVELTEKIT_DISTILLED_BASENAME = 'sveltekit-distilled'

export const GET: RequestHandler = async ({ url }) => {
	// Check secret key
	const secretKey = url.searchParams.get('secret_key')
	const envSecretKey = env.DISTILL_SECRET_KEY

	if (!envSecretKey) {
		throw error(500, 'Server is not configured for distillation (DISTILL_SECRET_KEY not set)')
	}

	if (secretKey !== envSecretKey) {
		throw error(403, 'Invalid secret key')
	}

	// Find the distilled preset
	const distilledPreset = Object.values(presets).find(
		(preset) => preset.distilled && preset.distilledFilenameBase === 'svelte-complete-distilled'
	)

	if (!distilledPreset) {
		throw error(500, 'No distilled preset found')
	}

	try {
		// Fetch all markdown files for the preset with their file paths
		const filesWithPaths = await fetchMarkdownFiles(distilledPreset, true)

		// Filter out short files, only keep normal files
		const originalFileCount = filesWithPaths.length
		let filesToProcess = filesWithPaths.filter((file) =>
			typeof file === 'string' ? false : file.content.length >= 200
		)

		if (dev) {
			console.log(`Total files: ${originalFileCount}`)
			console.log(
				`Filtered out ${originalFileCount - filesToProcess.length} short files (< 200 chars)`
			)
			console.log(`Processing ${filesToProcess.length} normal files`)
		}

		if (dev) {
			// DEBUG: Limit to first 10 normal files for debugging
			filesToProcess = filesToProcess.slice(0, 10)
			console.log(
				`Using ${filesToProcess.length} files for LLM distillation (limited to 10 for debugging)`
			)
		}

		// Apply the minimize config to each file's content if the preset has a minimize configuration
		if (distilledPreset.minimize) {
			if (dev) {
				console.log(`Applying minimize configuration before LLM processing`)
			}

			filesToProcess = filesToProcess.map((fileObj) => {
				if (typeof fileObj === 'string') {
					return fileObj // Should not happen with includePathInfo=true
				}

				// Apply minimization to the content
				const minimized = minimizeContent(fileObj.content, distilledPreset.minimize)

				return {
					...fileObj,
					content: minimized
				}
			})

			if (dev) {
				console.log(`Content minimized according to preset configuration`)
			}
		}

		// Initialize Anthropic client
		const anthropic = new AnthropicProvider('claude-sonnet-4-20250514')

		// Process files using shared batch processing function
		const options: BatchProcessingOptions = {
			maxTokens: 8192,
			temperature: 0
		}

		const resultProcessor = (result: any, fileObj: string | { path: string; content: string }, index: number) => {
			const outputContent = result.result.message.content[0].text
			return {
				index,
				path: typeof fileObj === 'string' ? 'unknown' : fileObj.path,
				content: outputContent
			}
		}

		const { debugData, processedResults } = await anthropic.processBatchWithFiles(
			filesToProcess,
			DISTILLATION_PROMPT,
			options,
			originalFileCount,
			!!distilledPreset.minimize,
			resultProcessor
		)

		// Sort by index to maintain original order
		processedResults.sort((a, b) => a.index - b.index)

		// Filter successful responses (content should always exist due to our result processor)
		const successfulResults = processedResults.filter((result) => result.content)

		// Split results into Svelte and SvelteKit categories
		const svelteResults = successfulResults.filter((result) => result.path.includes('docs/svelte/'))

		const svelteKitResults = successfulResults.filter((result) => result.path.includes('docs/kit/'))

		// Create content for each category
		const createContentFromResults = (results: typeof successfulResults) => {
			const contentParts = results.map((result) => `## ${result.path}\n\n${result.content}`)
			return contentParts.join('\n\n')
		}

		// Generate combined content
		const distilledContent = createContentFromResults(successfulResults)

		// Generate Svelte content
		const svelteContent = createContentFromResults(svelteResults)

		// Generate SvelteKit content
		const svelteKitContent = createContentFromResults(svelteKitResults)

		// Add prompt if it exists
		const prompt = distilledPreset.prompt
			? `\n\nInstructions for LLMs: <SYSTEM>${distilledPreset.prompt}</SYSTEM>`
			: ''

		// Finalize content with prompts
		const finalContent = distilledContent + prompt
		const finalSvelteContent = svelteContent + prompt
		const finalSvelteKitContent = svelteKitContent + prompt

		// Generate filenames
		const today = new Date()
		const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
			today.getDate()
		).padStart(2, '0')}`

		// Combined content file paths
		const latestFilename = `outputs/${distilledPreset.distilledFilenameBase}-latest.md`
		const datedFilename = `outputs/${distilledPreset.distilledFilenameBase}-${dateStr}.md`

		// Svelte content file paths
		const svelteLatestFilename = `outputs/${SVELTE_DISTILLED_BASENAME}-latest.md`
		const svelteDatedFilename = `outputs/${SVELTE_DISTILLED_BASENAME}-${dateStr}.md`

		// SvelteKit content file paths
		const svelteKitLatestFilename = `outputs/${SVELTEKIT_DISTILLED_BASENAME}-latest.md`
		const svelteKitDatedFilename = `outputs/${SVELTEKIT_DISTILLED_BASENAME}-${dateStr}.md`

		// Debug file path
		const debugFilename = `outputs/${distilledPreset.distilledFilenameBase}-debug.json`

		// Write files using writeAtomicFile from fileCache.ts
		await writeAtomicFile(latestFilename, finalContent)
		await writeAtomicFile(datedFilename, finalContent)

		await writeAtomicFile(svelteLatestFilename, finalSvelteContent)
		await writeAtomicFile(svelteDatedFilename, finalSvelteContent)

		await writeAtomicFile(svelteKitLatestFilename, finalSvelteKitContent)
		await writeAtomicFile(svelteKitDatedFilename, finalSvelteKitContent)

		await writeAtomicFile(debugFilename, JSON.stringify(debugData, null, 2))

		return json({
			success: true,
			totalFiles: originalFileCount,
			shortFilesRemoved: originalFileCount - filesToProcess.length,
			filesProcessed: filesToProcess.length,
			minimizeApplied: !!distilledPreset.minimize,
			resultsReceived: processedResults.length,
			successfulResults: successfulResults.length,
			svelteResults: svelteResults.length,
			svelteKitResults: svelteKitResults.length,
			bytes: {
				combined: finalContent.length,
				svelte: finalSvelteContent.length,
				svelteKit: finalSvelteKitContent.length
			},
			files: {
				combined: {
					latest: latestFilename,
					dated: datedFilename
				},
				svelte: {
					latest: svelteLatestFilename,
					dated: svelteDatedFilename
				},
				svelteKit: {
					latest: svelteKitLatestFilename,
					dated: svelteKitDatedFilename
				},
				debug: debugFilename
			}
		})
	} catch (e) {
		console.error('Error in distillation process:', e)
		throw error(500, `Distillation failed: ${e instanceof Error ? e.message : String(e)}`)
	}
}
