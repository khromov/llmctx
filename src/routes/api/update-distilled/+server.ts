import { error, json } from '@sveltejs/kit'
import { env } from '$env/dynamic/private'
import { dev } from '$app/environment'
import { presets } from '$lib/presets'
import {
	fetchMarkdownFiles,
	minimizeContent,
	fetchRepositoryTarball,
	processMarkdownFromTarball
} from '$lib/fetchMarkdown'
import type { RequestHandler } from './$types'
import { AnthropicProvider, type AnthropicBatchRequest } from '$lib/anthropic'
import { PresetDbService } from '$lib/server/presetDb'
import type { DbDistillationJob } from '$lib/types/db'
import { logAlways, logErrorAlways } from '$lib/log'

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

	let distillationJob: DbDistillationJob | null = null

	try {
		// Use the new batch processing approach
		const { owner, repo } = distilledPreset
		const tarballBuffer = await fetchRepositoryTarball(owner, repo)

		// Process the tarball to get files
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
		let filesToProcess = filesWithPaths.filter((file) => file.content.length >= 200)
		const shortFilesRemoved = originalFileCount - filesToProcess.length

		logAlways(`Total files: ${originalFileCount}`)
		logAlways(`Filtered out ${originalFileCount - filesToProcess.length} short files (< 200 chars)`)
		logAlways(`Processing ${filesToProcess.length} normal files`)

		if (dev) {
			// DEBUG: Limit to first 10 normal files for debugging
			filesToProcess = filesToProcess.slice(0, 10)
			logAlways(
				`Using ${filesToProcess.length} files for LLM distillation (limited to 10 for debugging)`
			)
		}

		// Apply the minimize config to each file's content if the preset has a minimize configuration
		if (distilledPreset.minimize) {
			logAlways(`Applying minimize configuration before LLM processing`)

			filesToProcess = filesToProcess.map((fileObj) => {
				// Apply minimization to the content
				const minimized = minimizeContent(fileObj.content, distilledPreset.minimize)

				return {
					...fileObj,
					content: minimized
				}
			})

			logAlways(`Content minimized according to preset configuration`)
		}

		// Initialize Anthropic client
		const anthropic = new AnthropicProvider('claude-sonnet-4-20250514')

		// Create distillation job in database
		distillationJob = await PresetDbService.createDistillationJob({
			preset_name: 'svelte-complete-distilled',
			status: 'pending',
			model_used: anthropic.getModelIdentifier(),
			total_files: filesToProcess.length,
			minimize_applied: !!distilledPreset.minimize,
			metadata: {
				originalFileCount,
				filteredFiles: originalFileCount - filesToProcess.length
			}
		})

		// Prepare batch requests
		const batchRequests: AnthropicBatchRequest[] = filesToProcess.map((fileObj, index) => {
			const content = fileObj.content
			const fullPrompt = DISTILLATION_PROMPT + content

			return {
				custom_id: `file-${index}`,
				params: {
					model: anthropic.getModelIdentifier(),
					max_tokens: 8192,
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

		// Create batch
		const batchResponse = await anthropic.createBatch(batchRequests)

		// Update job status to processing
		try {
			distillationJob = await PresetDbService.updateDistillationJob(distillationJob.id, {
				status: 'processing',
				batch_id: batchResponse.id
			})
		} catch (dbError) {
			logErrorAlways('Failed to update distillation job:', dbError)
		}

		// Poll for completion
		let batchStatus = await anthropic.getBatchStatus(batchResponse.id)

		while (batchStatus.processing_status === 'in_progress') {
			await new Promise((resolve) => setTimeout(resolve, 5000)) // Wait 5 seconds before polling again
			batchStatus = await anthropic.getBatchStatus(batchResponse.id)

			logAlways(
				`Batch status: ${batchStatus.processing_status}, Succeeded: ${batchStatus.request_counts.succeeded}, Processing: ${batchStatus.request_counts.processing}`
			)

			// Update job progress
			try {
				await PresetDbService.updateDistillationJob(distillationJob.id, {
					processed_files:
						batchStatus.request_counts.succeeded + batchStatus.request_counts.errored,
					successful_files: batchStatus.request_counts.succeeded
				})
			} catch (dbError) {
				logErrorAlways('Failed to update job progress:', dbError)
			}
		}

		// Get results
		if (!batchStatus.results_url) {
			throw error(500, 'Batch completed but no results URL available')
		}

		const results = await anthropic.getBatchResults(batchStatus.results_url)

		// Process results
		const processedResults = results
			.filter((result) => result.result.type === 'succeeded')
			.map((result) => {
				const index = parseInt(result.custom_id.split('-')[1])
				const fileObj = filesToProcess[index]

				if (result.result.type !== 'succeeded' || !result.result.message) {
					// Store failed result in database
					const filePath = fileObj.path
					const originalContent = fileObj.content
					if (distillationJob) {
						PresetDbService.createDistillationResult({
							job_id: distillationJob.id,
							file_path: filePath,
							original_content: originalContent,
							prompt_used: DISTILLATION_PROMPT,
							success: false,
							error_message: result.result.error?.message || 'Failed or no message'
						}).catch((e) => logErrorAlways('Failed to store distillation result:', e))
					}

					return {
						index,
						path: fileObj.path,
						content: '',
						error: 'Failed or no message'
					}
				}

				const outputContent = result.result.message.content[0].text

				// Store successful result in database
				const filePath = fileObj.path
				const originalContent = fileObj.content
				if (distillationJob) {
					PresetDbService.createDistillationResult({
						job_id: distillationJob.id,
						file_path: filePath,
						original_content: originalContent,
						distilled_content: outputContent,
						prompt_used: DISTILLATION_PROMPT,
						success: true,
						input_tokens: result.result.message.usage?.input_tokens,
						output_tokens: result.result.message.usage?.output_tokens
					}).catch((e) => logErrorAlways('Failed to store distillation result:', e))
				}

				return {
					index,
					path: fileObj.path,
					content: outputContent
				}
			})

		// Sort by index to maintain original order
		processedResults.sort((a, b) => a.index - b.index)

		// Filter successful responses
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
			? `\n\nInstructions for LLMs: <s>${distilledPreset.prompt}</s>`
			: ''

		// Finalize content with prompts
		const finalContent = distilledContent + prompt
		const finalSvelteContent = svelteContent + prompt
		const finalSvelteKitContent = svelteKitContent + prompt

		// Generate date string for versioning
		const today = new Date()
		const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
			today.getDate()
		).padStart(2, '0')}`

		// Store all distillations in database
		try {
			// Store combined version
			await PresetDbService.createDistillation({
				preset_name: 'svelte-complete-distilled',
				version: 'latest',
				content: finalContent,
				size_kb: Math.floor(new TextEncoder().encode(finalContent).length / 1024),
				document_count: successfulResults.length,
				distillation_job_id: distillationJob?.id
			})

			await PresetDbService.createDistillation({
				preset_name: 'svelte-complete-distilled',
				version: dateStr,
				content: finalContent,
				size_kb: Math.floor(new TextEncoder().encode(finalContent).length / 1024),
				document_count: successfulResults.length,
				distillation_job_id: distillationJob?.id
			})

			// Store Svelte-only version
			await PresetDbService.createDistillation({
				preset_name: SVELTE_DISTILLED_BASENAME as any,
				version: 'latest',
				content: finalSvelteContent,
				size_kb: Math.floor(new TextEncoder().encode(finalSvelteContent).length / 1024),
				document_count: svelteResults.length,
				distillation_job_id: distillationJob?.id
			})

			await PresetDbService.createDistillation({
				preset_name: SVELTE_DISTILLED_BASENAME as any,
				version: dateStr,
				content: finalSvelteContent,
				size_kb: Math.floor(new TextEncoder().encode(finalSvelteContent).length / 1024),
				document_count: svelteResults.length,
				distillation_job_id: distillationJob?.id
			})

			// Store SvelteKit-only version
			await PresetDbService.createDistillation({
				preset_name: SVELTEKIT_DISTILLED_BASENAME as any,
				version: 'latest',
				content: finalSvelteKitContent,
				size_kb: Math.floor(new TextEncoder().encode(finalSvelteKitContent).length / 1024),
				document_count: svelteKitResults.length,
				distillation_job_id: distillationJob?.id
			})

			await PresetDbService.createDistillation({
				preset_name: SVELTEKIT_DISTILLED_BASENAME as any,
				version: dateStr,
				content: finalSvelteKitContent,
				size_kb: Math.floor(new TextEncoder().encode(finalSvelteKitContent).length / 1024),
				document_count: svelteKitResults.length,
				distillation_job_id: distillationJob?.id
			})

			// Update distillation job as completed
			await PresetDbService.updateDistillationJob(distillationJob.id, {
				status: 'completed',
				processed_files: filesToProcess.length,
				successful_files: successfulResults.length,
				completed_at: new Date()
			})
		} catch (dbError) {
			logErrorAlways('Failed to store distillations in database:', dbError)
		}

		return json({
			success: true,
			totalFiles: originalFileCount,
			shortFilesRemoved,
			filesProcessed: filesToProcess.length,
			minimizeApplied: !!distilledPreset.minimize,
			resultsReceived: results.length,
			successfulResults: successfulResults.length,
			svelteResults: svelteResults.length,
			svelteKitResults: svelteKitResults.length,
			distillationJobId: distillationJob?.id,
			bytes: {
				combined: finalContent.length,
				svelte: finalSvelteContent.length,
				svelteKit: finalSvelteKitContent.length
			}
		})
	} catch (e) {
		// Update job as failed
		if (distillationJob) {
			try {
				await PresetDbService.updateDistillationJob(distillationJob.id, {
					status: 'failed',
					completed_at: new Date(),
					error_message: e instanceof Error ? e.message : String(e)
				})
			} catch (dbError) {
				logErrorAlways('Failed to update job as failed:', dbError)
			}
		}

		logErrorAlways('Error in distillation process:', e)
		throw error(500, `Distillation failed: ${e instanceof Error ? e.message : String(e)}`)
	}
}
