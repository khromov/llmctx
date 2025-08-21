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
import { PresetDbService } from '$lib/server/presetDb'
import { ContentDistilledDbService } from '$lib/server/contentDistilledDb'
import { DistillablePreset } from '$lib/types/db'
import type { DbDistillationJob, CreateContentDistilledInput } from '$lib/types/db'
import { logAlways, logErrorAlways } from '$lib/log'
import { cleanDocumentationPath } from '$lib/utils/pathUtils'
import { DISTILLATION_PROMPT } from '$lib/utils/prompts'

export const GET: RequestHandler = async ({ url }) => {
	const secretKey = url.searchParams.get('secret_key')
	const envSecretKey = env.DISTILL_SECRET_KEY

	if (!envSecretKey) {
		throw error(500, 'Server is not configured for distillation (DISTILL_SECRET_KEY not set)')
	}

	if (secretKey !== envSecretKey) {
		throw error(403, 'Invalid secret key')
	}

	const distilledPreset = Object.values(presets).find(
		(preset) => preset.distilled && preset.distilledFilenameBase === 'svelte-complete-distilled'
	)

	if (!distilledPreset) {
		throw error(500, 'No distilled preset found')
	}

	let distillationJob: DbDistillationJob | null = null

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

		if (distilledPreset.minimize) {
			logAlways(`Applying minimize configuration before LLM processing`)

			filesToProcess = filesToProcess.map((fileObj) => {
				const minimized = minimizeContent(fileObj.content, distilledPreset.minimize)

				return {
					...fileObj,
					content: minimized
				}
			})

			logAlways(`Content minimized according to preset configuration`)
		}

		const anthropic = new AnthropicProvider('claude-sonnet-4-20250514')

		distillationJob = await PresetDbService.createDistillationJob({
			preset_name: DistillablePreset.SVELTE_COMPLETE_DISTILLED,
			status: 'pending',
			model_used: anthropic.getModelIdentifier(),
			total_files: filesToProcess.length,
			minimize_applied: !!distilledPreset.minimize,
			metadata: {
				originalFileCount,
				filteredFiles: originalFileCount - filesToProcess.length
			}
		})

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

		const batchResponse = await anthropic.createBatch(batchRequests)

		try {
			distillationJob = await PresetDbService.updateDistillationJob(distillationJob.id, {
				status: 'processing',
				batch_id: batchResponse.id
			})
		} catch (dbError) {
			logErrorAlways('Failed to update distillation job:', dbError)
		}

		let batchStatus = await anthropic.getBatchStatus(batchResponse.id)

		while (batchStatus.processing_status === 'in_progress') {
			await new Promise((resolve) => setTimeout(resolve, 5000)) // Wait 5 seconds before polling again
			batchStatus = await anthropic.getBatchStatus(batchResponse.id)

			logAlways(
				`Batch status: ${batchStatus.processing_status}, Succeeded: ${batchStatus.request_counts.succeeded}, Processing: ${batchStatus.request_counts.processing}`
			)

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

		if (!batchStatus.results_url) {
			throw error(500, 'Batch completed but no results URL available')
		}

		const results = await anthropic.getBatchResults(batchStatus.results_url)

		let totalInputTokens = 0
		let totalOutputTokens = 0

		const processedResults = results
			.filter((result) => result.result.type === 'succeeded')
			.map((result) => {
				const index = parseInt(result.custom_id.split('-')[1])
				const fileObj = filesToProcess[index]

				if (result.result.type !== 'succeeded' || !result.result.message) {
					return {
						index,
						path: fileObj.path,
						content: '',
						error: 'Failed or no message'
					}
				}

				const outputContent = result.result.message.content[0].text

				if (result.result.message.usage) {
					totalInputTokens += result.result.message.usage.input_tokens || 0
					totalOutputTokens += result.result.message.usage.output_tokens || 0
				}

				return {
					index,
					path: fileObj.path,
					content: outputContent
				}
			})

		processedResults.sort((a, b) => a.index - b.index)

		const successfulResults = processedResults.filter((result) => result.content)

		// Split results into Svelte and SvelteKit categories based on the new path structure
		const svelteResults = successfulResults.filter((result) =>
			result.path.includes('apps/svelte.dev/content/docs/svelte/')
		)
		const svelteKitResults = successfulResults.filter((result) =>
			result.path.includes('apps/svelte.dev/content/docs/kit/')
		)

		const createContentFromResults = (results: typeof successfulResults) => {
			const contentParts = results.map((result) => {
				// Use the unified path utility to clean paths for display
				const cleanPath = cleanDocumentationPath(result.path)
				return `## ${cleanPath}\n\n${result.content}`
			})
			return contentParts.join('\n\n')
		}

		const distilledContent = createContentFromResults(successfulResults)

		const svelteContent = createContentFromResults(svelteResults)

		const svelteKitContent = createContentFromResults(svelteKitResults)

		const prompt = distilledPreset.prompt
			? `\n\nInstructions for LLMs: <s>${distilledPreset.prompt}</s>`
			: ''

		const finalContent = distilledContent + prompt
		const finalSvelteContent = svelteContent + prompt
		const finalSvelteKitContent = svelteKitContent + prompt

		logAlways(`Storing ${successfulResults.length} individual distilled files`)
		const distilledContentInputs: CreateContentDistilledInput[] = successfulResults.map(
			(result) => ({
				path: result.path,
				filename: ContentDistilledDbService.extractFilename(result.path),
				content: result.content,
				size_bytes: new TextEncoder().encode(result.content).length,
				metadata: {}
			})
		)

		await ContentDistilledDbService.batchUpsertContentDistilled(distilledContentInputs)

		const currentPaths = successfulResults.map((result) => result.path)
		const cleanedUpCount = await ContentDistilledDbService.cleanupUnusedEntries(currentPaths)
		logAlways(`Cleaned up ${cleanedUpCount} unused distilled content entries`)

		const today = new Date()
		const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
			today.getDate()
		).padStart(2, '0')}`

		try {
			await PresetDbService.createDistillation({
				preset_name: DistillablePreset.SVELTE_COMPLETE_DISTILLED,
				version: 'latest',
				content: finalContent,
				size_kb: Math.floor(new TextEncoder().encode(finalContent).length / 1024),
				document_count: successfulResults.length,
				distillation_job_id: distillationJob?.id
			})

			await PresetDbService.createDistillation({
				preset_name: DistillablePreset.SVELTE_COMPLETE_DISTILLED,
				version: dateStr,
				content: finalContent,
				size_kb: Math.floor(new TextEncoder().encode(finalContent).length / 1024),
				document_count: successfulResults.length,
				distillation_job_id: distillationJob?.id
			})

			await PresetDbService.createDistillation({
				preset_name: DistillablePreset.SVELTE_DISTILLED,
				version: 'latest',
				content: finalSvelteContent,
				size_kb: Math.floor(new TextEncoder().encode(finalSvelteContent).length / 1024),
				document_count: svelteResults.length,
				distillation_job_id: distillationJob?.id
			})

			await PresetDbService.createDistillation({
				preset_name: DistillablePreset.SVELTE_DISTILLED,
				version: dateStr,
				content: finalSvelteContent,
				size_kb: Math.floor(new TextEncoder().encode(finalSvelteContent).length / 1024),
				document_count: svelteResults.length,
				distillation_job_id: distillationJob?.id
			})

			await PresetDbService.createDistillation({
				preset_name: DistillablePreset.SVELTEKIT_DISTILLED,
				version: 'latest',
				content: finalSvelteKitContent,
				size_kb: Math.floor(new TextEncoder().encode(finalSvelteKitContent).length / 1024),
				document_count: svelteKitResults.length,
				distillation_job_id: distillationJob?.id
			})

			await PresetDbService.createDistillation({
				preset_name: DistillablePreset.SVELTEKIT_DISTILLED,
				version: dateStr,
				content: finalSvelteKitContent,
				size_kb: Math.floor(new TextEncoder().encode(finalSvelteKitContent).length / 1024),
				document_count: svelteKitResults.length,
				distillation_job_id: distillationJob?.id
			})

			await PresetDbService.updateDistillationJob(distillationJob.id, {
				status: 'completed',
				processed_files: filesToProcess.length,
				successful_files: successfulResults.length,
				total_input_tokens: totalInputTokens,
				total_output_tokens: totalOutputTokens,
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
			resultsReceived: processedResults.length,
			successfulResults: successfulResults.length,
			svelteResults: svelteResults.length,
			svelteKitResults: svelteKitResults.length,
			distillationJobId: distillationJob?.id,
			tokenUsage: {
				totalInputTokens,
				totalOutputTokens
			},
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
