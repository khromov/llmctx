import { error, json } from '@sveltejs/kit'
import { env } from '$env/dynamic/private'
import { dev } from '$app/environment'
import { presets, DEFAULT_REPOSITORY } from '$lib/presets'
import {
	minimizeContent,
	fetchRepositoryTarball,
	processMarkdownFromTarball
} from '$lib/fetchMarkdown'
import type { RequestHandler } from './$types'
import { AnthropicProvider, type AnthropicBatchRequest } from '$lib/anthropic'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

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
	const distilledPreset = Object.values(presets).find(
		(preset) => preset.distilled && preset.distilledFilenameBase === 'svelte-complete-distilled'
	)

	if (!distilledPreset) {
		throw error(500, 'No distilled preset found')
	}

	try {
		const { owner, repo } = DEFAULT_REPOSITORY
		const tarballBuffer = await fetchRepositoryTarball(owner, repo)

		const filesWithPaths = (await processMarkdownFromTarball(
			tarballBuffer,
			distilledPreset,
			true
		)) as Array<{
			path: string
			content: string
		}>

		// Filter out short files, only keep normal files
		const originalFileCount = filesWithPaths.length
		let filesToProcess = filesWithPaths.filter((file: { path: string; content: string }) =>
			file.content.length >= 200
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
				`Using ${filesToProcess.length} files for LLM summarization (limited to 10 for debugging)`
			)
		}

		// Apply the minimize config to each file's content if the preset has a minimize configuration
		if (distilledPreset.minimize) {
			if (dev) {
				console.log(`Applying minimize configuration before LLM processing`)
			}

			filesToProcess = filesToProcess.map((fileObj: { path: string; content: string }) => {
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
		const anthropic = new AnthropicProvider('claude-3-5-sonnet-20241022')

		// Prepare batch requests
		const batchRequests: AnthropicBatchRequest[] = filesToProcess.map((fileObj: { path: string; content: string }, index: number) => {
			const content = fileObj.content
			const fullPrompt = SUMMARY_PROMPT + content

			return {
				custom_id: `file-${index}`,
				params: {
					model: anthropic.getModelIdentifier(),
					max_tokens: 200, // Very small since we want short summaries
					messages: [
						{
							role: 'user',
							content: fullPrompt
						}
					],
					temperature: 0 // Low temperature for consistent results
				}
			}
		})

		// Create and process batch
		const batchResponse = await anthropic.createBatch(batchRequests)

		// Poll for completion
		let batchStatus = await anthropic.getBatchStatus(batchResponse.id)

		while (batchStatus.processing_status === 'in_progress') {
			await new Promise((resolve) => setTimeout(resolve, 5000)) // Wait 5 seconds before polling again
			batchStatus = await anthropic.getBatchStatus(batchResponse.id)

			// Optional: Log progress if in development mode
			if (dev) {
				console.log(
					`Batch status: ${batchStatus.processing_status}, Succeeded: ${batchStatus.request_counts.succeeded}, Processing: ${batchStatus.request_counts.processing}`
				)
			}
		}

		// Get results
		if (!batchStatus.results_url) {
			throw error(500, 'Batch completed but no results URL available')
		}

		const results = await anthropic.getBatchResults(batchStatus.results_url)

		// Process results
		const processedResults = results
			.map((result) => {
				const index = parseInt(result.custom_id.split('-')[1])
				const fileObj = filesToProcess[index]

				if (result.result.type !== 'succeeded' || !result.result.message) {
					return {
						index,
						path: fileObj.path,
						summary: '',
						error: 'Failed or no message'
					}
				}

				const outputContent = result.result.message.content[0].text

				return {
					index,
					path: fileObj.path,
					summary: outputContent.trim()
				}
			})
			.sort((a, b) => a.index - b.index)

		// Filter successful responses
		const successfulResults = processedResults.filter((result) => result.summary)

		// Create the summary content
		const summaryParts = successfulResults.map((result) => {
			return `${result.path}: ${result.summary}`
		})

		const summaryContent = summaryParts.join('\n')

		// Generate filenames
		const today = new Date()
		const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
			today.getDate()
		).padStart(2, '0')}`

		// Summary file paths
		const latestFilename = `outputs/svelte-summary-latest.md`
		const datedFilename = `outputs/svelte-summary-${dateStr}.md`

		// Write files atomically
		async function writeAtomicFile(filePath: string, content: string) {
			const dir = path.dirname(filePath)
			await mkdir(dir, { recursive: true })
			await writeFile(filePath, content, 'utf-8')
		}

		await writeAtomicFile(latestFilename, summaryContent)
		await writeAtomicFile(datedFilename, summaryContent)

		return json({
			success: true,
			totalFiles: originalFileCount,
			shortFilesRemoved: originalFileCount - filesToProcess.length,
			filesProcessed: filesToProcess.length,
			minimizeApplied: !!distilledPreset.minimize,
			resultsReceived: processedResults.length,
			successfulResults: successfulResults.length,
			bytes: {
				summary: summaryContent.length
			},
			files: {
				summary: {
					latest: latestFilename,
					dated: datedFilename
				}
			}
		})
	} catch (e) {
		console.error('Error in summary generation process:', e)
		throw error(500, `Summary generation failed: ${e instanceof Error ? e.message : String(e)}`)
	}
}
