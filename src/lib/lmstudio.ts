import type { BatchLLMProvider, BatchRequest, BatchResponse, BatchResult } from './llm.ts'
import { LMStudioClient, Chat } from '@lmstudio/sdk'
import { env } from '$env/dynamic/private'
import { logErrorAlways, logWarningAlways, logAlways } from '$lib/log'

export class LMStudioProvider implements BatchLLMProvider {
	private client: LMStudioClient
	private modelId: string
	name = 'LM Studio'
	private readonly defaultModel = 'google/gemma-3-12b'
	private readonly availableModels = ['google/gemma-3-12b']

	// Simulated batch storage for sequential processing
	private batches: Map<
		string,
		{
			id: string
			requests: BatchRequest[]
			status: 'in_progress' | 'ended'
			created_at: string
			results: BatchResult[]
			processed_count: number
		}
	> = new Map()

	constructor(modelId?: string) {
		// LM Studio client doesn't require API key as it connects to local instance
		this.client = new LMStudioClient({
			baseUrl: env.LM_STUDIO_BASE_URL || 'ws://localhost:1234'
		})
		this.modelId = modelId || this.defaultModel
	}

	async generateResponse(prompt: string, temperature?: number): Promise<string> {
		try {
			// Get the model instance
			const model = await this.client.llm.model(this.modelId)

			// Create a simple chat with the prompt
			const chat = Chat.from([
				{
					role: 'user',
					content: prompt
				}
			])

			// Generate response with streaming and collect all fragments
			let fullResponse = ''
			const prediction = model.respond(chat, {
				temperature: temperature || 0.7,
				maxTokens: 16384
			})

			for await (const fragment of prediction) {
				fullResponse += fragment.content
			}

			return fullResponse
		} catch (error) {
			logErrorAlways('Error generating response with LM Studio:', error)
			throw new Error(
				`Failed to generate response: ${error instanceof Error ? error.message : String(error)}`
			)
		}
	}

	getModels(): string[] {
		return [...this.availableModels]
	}

	getModelIdentifier(): string {
		return this.modelId
	}

	// Simulate batch creation (LM Studio doesn't have native batch API)
	async createBatch(requests: BatchRequest[]): Promise<BatchResponse> {
		try {
			const batchId = `lmstudio_batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

			const batch = {
				id: batchId,
				requests,
				status: 'in_progress' as const,
				created_at: new Date().toISOString(),
				results: [] as BatchResult[],
				processed_count: 0
			}

			this.batches.set(batchId, batch)

			// Start processing in the background (don't await)
			this.processBatchSequentially(batchId).catch((error) => {
				logErrorAlways(`Error processing batch ${batchId}:`, error)
			})

			return {
				id: batchId,
				type: 'lmstudio_batch',
				processing_status: 'in_progress',
				request_counts: {
					processing: requests.length,
					succeeded: 0,
					errored: 0,
					canceled: 0,
					expired: 0
				},
				ended_at: null,
				created_at: batch.created_at,
				expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
				cancel_initiated_at: null,
				results_url: `lmstudio://batch/${batchId}/results`
			}
		} catch (error) {
			logErrorAlways('Error creating batch with LM Studio:', error)
			throw new Error(
				`Failed to create batch: ${error instanceof Error ? error.message : String(error)}`
			)
		}
	}

	// Process batch requests sequentially since LM Studio doesn't support parallel processing
	private async processBatchSequentially(batchId: string): Promise<void> {
		const batch = this.batches.get(batchId)
		if (!batch) {
			throw new Error(`Batch ${batchId} not found`)
		}

		logAlways(
			`Starting sequential processing of batch ${batchId} with ${batch.requests.length} requests`
		)

		try {
			const model = await this.client.llm.model(this.modelId)

			for (let i = 0; i < batch.requests.length; i++) {
				const request = batch.requests[i]

				try {
					// Convert the request to LM Studio format
					const chat = Chat.from(
						request.params.messages.map((msg) => ({
							role: msg.role,
							content:
								typeof msg.content === 'string'
									? msg.content
									: msg.content.map((c) => c.text).join('\n')
						}))
					)

					// Generate response
					let fullResponse = ''
					let inputTokens = 0
					let outputTokens = 0

					const prediction = model.respond(chat, {
						temperature: request.params.temperature || 0.7,
						maxTokens: request.params.max_tokens || 16384
					})

					for await (const fragment of prediction) {
						fullResponse += fragment.content
					}

					// Get prediction result for token counts
					const result = await prediction.result()
					inputTokens = result.stats.promptTokensCount || 0
					outputTokens = result.stats.predictedTokensCount || 0

					// Create successful result
					const batchResult: BatchResult = {
						custom_id: request.custom_id,
						result: {
							type: 'succeeded',
							message: {
								id: `lmstudio_msg_${Date.now()}_${i}`,
								type: 'message',
								role: 'assistant',
								model: this.modelId,
								content: [
									{
										type: 'text',
										text: fullResponse
									}
								],
								stop_reason: result.stats.stopReason || 'stop',
								stop_sequence: null,
								usage: {
									input_tokens: inputTokens,
									output_tokens: outputTokens
								}
							}
						}
					}

					batch.results.push(batchResult)
					batch.processed_count++

					logAlways(`Processed request ${i + 1}/${batch.requests.length} for batch ${batchId}`)
				} catch (requestError) {
					logErrorAlways(`Error processing request ${request.custom_id}:`, requestError)

					// Create error result
					const errorResult: BatchResult = {
						custom_id: request.custom_id,
						result: {
							type: 'errored',
							error: {
								type: 'processing_error',
								message: requestError instanceof Error ? requestError.message : String(requestError)
							}
						}
					}

					batch.results.push(errorResult)
					batch.processed_count++
				}
			}

			// Mark batch as completed
			batch.status = 'ended'
			logAlways(`Completed processing batch ${batchId}`)
		} catch (error) {
			logErrorAlways(`Fatal error processing batch ${batchId}:`, error)
			batch.status = 'ended'

			// Mark all remaining requests as errored
			for (let i = batch.processed_count; i < batch.requests.length; i++) {
				const request = batch.requests[i]
				batch.results.push({
					custom_id: request.custom_id,
					result: {
						type: 'errored',
						error: {
							type: 'batch_error',
							message: error instanceof Error ? error.message : String(error)
						}
					}
				})
			}
		}
	}

	async getBatchStatus(
		batchId: string,
		maxRetries = 10,
		retryDelay = 5000
	): Promise<BatchResponse> {
		const batch = this.batches.get(batchId)
		if (!batch) {
			throw new Error(`Batch ${batchId} not found`)
		}

		const successCount = batch.results.filter((r) => r.result.type === 'succeeded').length
		const errorCount = batch.results.filter((r) => r.result.type === 'errored').length
		const processing =
			batch.status === 'in_progress' ? batch.requests.length - batch.processed_count : 0

		return {
			id: batch.id,
			type: 'lmstudio_batch',
			processing_status: batch.status,
			request_counts: {
				processing,
				succeeded: successCount,
				errored: errorCount,
				canceled: 0,
				expired: 0
			},
			ended_at: batch.status === 'ended' ? new Date().toISOString() : null,
			created_at: batch.created_at,
			expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
			cancel_initiated_at: null,
			results_url: batch.status === 'ended' ? `lmstudio://batch/${batchId}/results` : null
		}
	}

	async getBatchResults(resultsUrl: string): Promise<BatchResult[]> {
		// Extract batch ID from the results URL
		const batchId = resultsUrl.match(/lmstudio:\/\/batch\/(.+)\/results/)?.[1]
		if (!batchId) {
			throw new Error('Invalid results URL format')
		}

		const batch = this.batches.get(batchId)
		if (!batch) {
			throw new Error(`Batch ${batchId} not found`)
		}

		if (batch.status !== 'ended') {
			throw new Error(`Batch ${batchId} is still processing`)
		}

		return [...batch.results]
	}

	// Cleanup method to remove old batches (should be called periodically)
	cleanup(maxAge = 24 * 60 * 60 * 1000): void {
		const now = Date.now()
		for (const [batchId, batch] of this.batches.entries()) {
			const batchAge = now - new Date(batch.created_at).getTime()
			if (batchAge > maxAge) {
				this.batches.delete(batchId)
				logAlways(`Cleaned up old batch ${batchId}`)
			}
		}
	}
}
