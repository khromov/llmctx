import { error, json } from '@sveltejs/kit'
import { env } from '$env/dynamic/private'
import { dev } from '$app/environment'
import { presets } from '$lib/presets'
import { fetchMarkdownFiles, minimizeContent } from '$lib/fetchMarkdown'
import type { RequestHandler } from './$types'
import { AnthropicProvider, type BatchProcessingOptions } from '$lib/anthropic'
import { writeAtomicFile } from '$lib/fileCache'

const SUMMARY_PROMPT = `
You are tasked with creating very short summaries of Svelte 5 and SvelteKit documentation pages.

Your task:
1. Read the documentation page content provided
2. Create a VERY SHORT summary (maximum 150 characters) that captures the main purpose/topic of this documentation page
3. Focus on what the page teaches or explains, not how it teaches it
4. Use clear, concise language suitable for categorizing documentation

Examples of good summaries:
- "Explains $state rune for reactive variables"
- "Tutorial on creating Svelte components"
- "Guide to routing in SvelteKit applications"
- "Reference for event handling syntax"

Requirements:
- Maximum 150 characters (including spaces)
- Focus on the main topic/purpose of the page
- Use present tense
- Be specific about what concept is being explained
- Do not include quotes or special formatting in your response
- Respond with ONLY the summary text, no additional text

Here is the documentation page content to summarize:

`

export const GET: RequestHandler = async ({ url }) => {
	// Check secret key
	const secretKey = url.searchParams.get('secret_key')
	const envSecretKey = env.DISTILL_SECRET_KEY

	if (!envSecretKey) {
		throw error(500, 'Server is not configured for summary generation (DISTILL_SECRET_KEY not set)')
	}

	if (secretKey !== envSecretKey) {
		throw error(403, 'Invalid secret key')
	}

	// Find the distilled preset to use as source
	const sourcePreset = Object.values(presets).find(
		(preset) => preset.distilled && preset.distilledFilenameBase === 'svelte-complete-distilled'
	)

	if (!sourcePreset) {
		throw error(500, 'No source preset found for summary generation')
	}

	try {
		// Fetch all markdown files for the preset with their file paths
		const filesWithPaths = await fetchMarkdownFiles(sourcePreset, true)

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
			// filesToProcess = filesToProcess.slice(0, 10)
			//console.log(
			//	`Using ${filesToProcess.length} files for summary generation (limited to 10 for debugging)`
			//)
		}

		// Apply the minimize config to each file's content if the preset has a minimize configuration
		if (sourcePreset.minimize) {
			if (dev) {
				console.log(`Applying minimize configuration before summary generation`)
			}

			filesToProcess = filesToProcess.map((fileObj) => {
				if (typeof fileObj === 'string') {
					return fileObj // Should not happen with includePathInfo=true
				}

				// Apply minimization to the content
				const minimized = minimizeContent(fileObj.content, sourcePreset.minimize)

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
			maxTokens: 256, // Much smaller since we only need short summaries
			temperature: 0
		}

		const resultProcessor = (result: any, fileObj: string | { path: string; content: string }, index: number) => {
			const outputSummary = result.result.message.content[0].text.trim()
			return {
				index,
				path: typeof fileObj === 'string' ? 'unknown' : fileObj.path,
				summary: outputSummary
			}
		}

		const { debugData, processedResults } = await anthropic.processBatchWithFiles(
			filesToProcess,
			SUMMARY_PROMPT,
			options,
			originalFileCount,
			!!sourcePreset.minimize,
			resultProcessor
		)

		// Sort by index to maintain original order
		processedResults.sort((a, b) => a.index - b.index)

		// Filter successful responses (summary should always exist due to our result processor)
		const successfulResults = processedResults.filter((result) => result.summary)

		// Split results into Svelte and SvelteKit categories
		const svelteResults = successfulResults.filter((result) => result.path.includes('docs/svelte/'))
		const svelteKitResults = successfulResults.filter((result) => result.path.includes('docs/kit/'))

		// Create content for each category in format: path: summary
		const createContentFromResults = (results: typeof successfulResults) => {
			return results.map((result) => `${result.path}: ${result.summary}`).join('\n')
		}

		// Generate combined content
		const summaryContent = createContentFromResults(successfulResults)

		// Generate Svelte content
		const svelteContent = createContentFromResults(svelteResults)

		// Generate SvelteKit content
		const svelteKitContent = createContentFromResults(svelteKitResults)

		// Generate filenames
		const today = new Date()
		const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
			today.getDate()
		).padStart(2, '0')}`

		// Summary content file paths
		const latestFilename = `outputs/svelte-summary-latest.md`
		const datedFilename = `outputs/svelte-summary-${dateStr}.md`

		// Svelte content file paths
		const svelteLatestFilename = `outputs/svelte-summary-svelte-latest.md`
		const svelteDatedFilename = `outputs/svelte-summary-svelte-${dateStr}.md`

		// SvelteKit content file paths
		const svelteKitLatestFilename = `outputs/svelte-summary-sveltekit-latest.md`
		const svelteKitDatedFilename = `outputs/svelte-summary-sveltekit-${dateStr}.md`

		// Debug file path
		const debugFilename = `outputs/svelte-summary-debug.json`

		// Write files using writeAtomicFile from fileCache.ts
		await writeAtomicFile(latestFilename, summaryContent)
		await writeAtomicFile(datedFilename, summaryContent)

		await writeAtomicFile(svelteLatestFilename, svelteContent)
		await writeAtomicFile(svelteDatedFilename, svelteContent)

		await writeAtomicFile(svelteKitLatestFilename, svelteKitContent)
		await writeAtomicFile(svelteKitDatedFilename, svelteKitContent)

		await writeAtomicFile(debugFilename, JSON.stringify(debugData, null, 2))

		return json({
			success: true,
			totalFiles: originalFileCount,
			shortFilesRemoved: originalFileCount - filesToProcess.length,
			filesProcessed: filesToProcess.length,
			minimizeApplied: !!sourcePreset.minimize,
			resultsReceived: processedResults.length,
			successfulResults: successfulResults.length,
			svelteResults: svelteResults.length,
			svelteKitResults: svelteKitResults.length,
			averageSummaryLength:
				successfulResults.reduce((acc, r) => acc + r.summary.length, 0) / successfulResults.length,
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
		console.error('Error in summary generation process:', e)
		throw error(500, `Summary generation failed: ${e instanceof Error ? e.message : String(e)}`)
	}
}
