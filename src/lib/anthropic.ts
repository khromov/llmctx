import type { LLMProvider } from './llm.ts'
import { Anthropic } from '@anthropic-ai/sdk'
import { env } from '$env/dynamic/private'
import { dev } from '$app/environment'

// Batch API interfaces
export interface AnthropicBatchRequest {
	custom_id: string
	params: {
		model: string
		max_tokens: number
		messages: {
			role: 'user' | 'assistant'
			content: string | { type: string; text: string }[]
		}[]
		[key: string]: unknown // Other optional parameters
	}
}

export interface AnthropicBatchResponse {
	id: string
	type: string
	processing_status: 'in_progress' | 'ended'
	request_counts: {
		processing: number
		succeeded: number
		errored: number
		canceled: number
		expired: number
	}
	ended_at: string | null
	created_at: string
	expires_at: string
	cancel_initiated_at: string | null
	results_url: string | null
}

export interface AnthropicBatchResult {
	custom_id: string
	result: {
		type: 'succeeded' | 'errored' | 'canceled' | 'expired'
		message?: {
			id: string
			type: string
			role: string
			model: string
			content: {
				type: string
				text: string
			}[]
			stop_reason: string
			stop_sequence: string | null
			usage: {
				input_tokens: number
				output_tokens: number
			}
		}
		error?: {
			type: string
			message: string
		}
	}
}

// Shared interfaces for batch processing
export interface BatchProcessingOptions {
	maxTokens: number
	temperature?: number
	model?: string
}

export interface FileToProcess {
	index: number
	path: string
	content: string
}

export interface BatchDebugData {
	timestamp: string
	model: string
	totalFiles: number
	processedFiles: number
	shortFilesRemoved: number
	minimizeApplied: boolean
	requests: Array<{
		index: number
		path: string
		originalContent: string
		fullPrompt: string
		response?: string
		error?: string
	}>
}

export interface BatchProcessingResult<T> {
	debugData: BatchDebugData
	processedResults: T[]
}

export class AnthropicProvider implements LLMProvider {
	private client: Anthropic
	private modelId: string
	private baseUrl: string
	private apiKey: string
	name = 'Anthropic'
	private readonly availableModels = [
		'claude-sonnet-4-20250514',
		'claude-opus-4-20250514',
		'claude-3-7-sonnet-20250219',
		'claude-3-5-sonnet-20241022', // 3.5 v2
		'claude-3-5-sonnet-20240620', // 3.5
		'claude-3-5-haiku-20241022',
		'claude-3-opus-20240229'
	]

	constructor(modelId?: string) {
		const apiKey = env.ANTHROPIC_API_KEY
		if (!apiKey) {
			throw new Error('ANTHROPIC_API_KEY environment variable is required')
		}
		this.apiKey = apiKey
		this.client = new Anthropic({ apiKey, timeout: 900000 })
		this.modelId = modelId || this.availableModels[0] // Default to claude-3-7-sonnet
		this.baseUrl = 'https://api.anthropic.com/v1'
	}

	/**
	 * Generate code from a prompt using Anthropic Claude
	 * @param prompt The prompt to send to the LLM
	 * @returns The generated code
	 */
	async generateResponse(prompt: string, temperature?: number): Promise<string> {
		try {
			const completion = await this.client.messages.create({
				model: this.modelId,
				max_tokens: 16384,
				messages: [
					{
						role: 'user',
						content: [
							{
								type: 'text',
								text: prompt
							}
						]
					}
				],
				temperature: temperature || 0.7
			})

			return completion.content[0]?.text || ''
		} catch (error) {
			console.error('Error generating code with Anthropic:', error)
			throw new Error(
				`Failed to generate code: ${error instanceof Error ? error.message : String(error)}`
			)
		}
	}

	/**
	 * Get all available models for this provider
	 * @returns Array of model identifiers
	 */
	getModels(): string[] {
		return [...this.availableModels]
	}

	/**
	 * Get the model identifier that was used for generation
	 * @returns The model identifier string
	 */
	getModelIdentifier(): string {
		return this.modelId
	}

	/**
	 * Create a new batch of requests
	 * @param requests Array of batch requests
	 * @returns The batch response
	 */
	async createBatch(requests: AnthropicBatchRequest[]): Promise<AnthropicBatchResponse> {
		try {
			const response = await fetch(`${this.baseUrl}/messages/batches`, {
				method: 'POST',
				headers: {
					'x-api-key': this.apiKey,
					'anthropic-version': '2023-06-01',
					'content-type': 'application/json'
				},
				body: JSON.stringify({ requests })
			})

			if (!response.ok) {
				const errorText = await response.text()
				throw new Error(
					`Failed to create batch: ${response.status} ${response.statusText} - ${errorText}`
				)
			}

			return await response.json()
		} catch (error) {
			console.error('Error creating batch with Anthropic:', error)
			throw new Error(
				`Failed to create batch: ${error instanceof Error ? error.message : String(error)}`
			)
		}
	}

	/**
	 * Get the status of a batch
	 * @param batchId The ID of the batch
	 * @param maxRetries Maximum number of retry attempts (default: 10)
	 * @param retryDelay Delay between retries in milliseconds (default: 30000)
	 * @returns The batch status
	 */
	async getBatchStatus(
		batchId: string,
		maxRetries = 10,
		retryDelay = 30000
	): Promise<AnthropicBatchResponse> {
		let retryCount = 0

		while (retryCount <= maxRetries) {
			try {
				const response = await fetch(`${this.baseUrl}/messages/batches/${batchId}`, {
					method: 'GET',
					headers: {
						'x-api-key': this.apiKey,
						'anthropic-version': '2023-06-01'
					}
				})

				if (!response.ok) {
					const errorText = await response.text()
					throw new Error(
						`Failed to get batch status: ${response.status} ${response.statusText} - ${errorText}`
					)
				}

				return await response.json()
			} catch (error) {
				retryCount++

				if (retryCount > maxRetries) {
					// If we've exceeded the maximum number of retries, log the error and throw
					console.error(
						`Error getting batch status for ${batchId} after ${maxRetries} retries:`,
						error
					)
					throw new Error(
						`Failed to get batch status after ${maxRetries} retries: ${
							error instanceof Error ? error.message : String(error)
						}`
					)
				}

				// Log retry attempt
				console.warn(
					`Error getting batch status for ${batchId} (attempt ${retryCount}/${maxRetries}):`,
					error
				)
				console.log(`Retrying in ${retryDelay / 1000} seconds...`)

				// Wait for the specified delay before retrying
				await new Promise((resolve) => setTimeout(resolve, retryDelay))
			}
		}

		// This should never be reached due to the throw in the catch block, but TypeScript needs a return
		throw new Error(`Failed to get batch status for ${batchId} after ${maxRetries} retries`)
	}

	/**
	 * Get the results of a batch
	 * @param resultsUrl The URL to fetch results from
	 * @returns Array of batch results
	 */
	async getBatchResults(resultsUrl: string): Promise<AnthropicBatchResult[]> {
		try {
			const response = await fetch(resultsUrl, {
				method: 'GET',
				headers: {
					'x-api-key': this.apiKey,
					'anthropic-version': '2023-06-01'
				}
			})

			if (!response.ok) {
				const errorText = await response.text()
				throw new Error(
					`Failed to get batch results: ${response.status} ${response.statusText} - ${errorText}`
				)
			}

			const text = await response.text()
			// Parse JSONL format (one JSON object per line)
			const results: AnthropicBatchResult[] = text
				.split('\n')
				.filter((line) => line.trim())
				.map((line) => JSON.parse(line))

			return results
		} catch (error) {
			console.error(`Error getting batch results:`, error)
			throw new Error(
				`Failed to get batch results: ${error instanceof Error ? error.message : String(error)}`
			)
		}
	}

	/**
	 * Process a batch of files with Anthropic API
	 * @param filesToProcess Array of files to process
	 * @param prompt The prompt template to use
	 * @param options Processing options (maxTokens, temperature, etc.)
	 * @param originalFileCount Original file count before filtering
	 * @param minimizeApplied Whether minimize was applied to content
	 * @param resultProcessor Function to process successful results
	 * @returns BatchProcessingResult with debug data and processed results
	 */
	async processBatchWithFiles<T>(
		filesToProcess: (string | { path: string; content: string })[],
		prompt: string,
		options: BatchProcessingOptions,
		originalFileCount: number,
		minimizeApplied: boolean,
		resultProcessor: (result: AnthropicBatchResult, fileObj: string | { path: string; content: string }, index: number) => T | null
	): Promise<BatchProcessingResult<T>> {
		// Create debug structure to store inputs and outputs
		const debugData: BatchDebugData = {
			timestamp: new Date().toISOString(),
			model: options.model || this.getModelIdentifier(),
			totalFiles: originalFileCount,
			processedFiles: filesToProcess.length,
			shortFilesRemoved: originalFileCount - filesToProcess.length,
			minimizeApplied,
			requests: []
		}

		// Prepare batch requests
		const batchRequests: AnthropicBatchRequest[] = filesToProcess.map((fileObj, index) => {
			const content = typeof fileObj === 'string' ? fileObj : fileObj.content
			const fullPrompt = prompt + content

			// Store input for debugging
			debugData.requests.push({
				index,
				path: typeof fileObj === 'string' ? 'unknown' : fileObj.path,
				originalContent: typeof fileObj === 'string' ? fileObj : fileObj.content,
				fullPrompt
			})

			return {
				custom_id: `file-${index}`,
				params: {
					model: options.model || this.getModelIdentifier(),
					max_tokens: options.maxTokens,
					messages: [
						{
							role: 'user',
							content: fullPrompt
						}
					],
					temperature: options.temperature || 0
				}
			}
		})

		// Create batch
		const batchResponse = await this.createBatch(batchRequests)

		// Poll for completion
		let batchStatus = await this.getBatchStatus(batchResponse.id)

		while (batchStatus.processing_status === 'in_progress') {
			await new Promise((resolve) => setTimeout(resolve, 5000)) // Wait 5 seconds before polling again
			batchStatus = await this.getBatchStatus(batchResponse.id)

			// Optional: Log progress if in development mode
			if (dev) {
				console.log(
					`Batch status: ${batchStatus.processing_status}, Succeeded: ${batchStatus.request_counts.succeeded}, Processing: ${batchStatus.request_counts.processing}`
				)
			}
		}

		// Get results
		if (!batchStatus.results_url) {
			throw new Error('Batch completed but no results URL available')
		}

		const results = await this.getBatchResults(batchStatus.results_url)

		// Process results using the provided processor function
		const processedResults = results
			.map((result) => {
				const index = parseInt(result.custom_id.split('-')[1])
				const fileObj = filesToProcess[index]

				if (result.result.type !== 'succeeded' || !result.result.message) {
					// Update debug data with error
					const debugEntry = debugData.requests.find((r) => r.index === index)
					if (debugEntry) {
						debugEntry.error = result.result.error?.message || 'Failed or no message'
					}
					return null
				}

				const outputContent = result.result.message.content[0].text
				
				// Update debug data with response
				const debugEntry = debugData.requests.find((r) => r.index === index)
				if (debugEntry) {
					debugEntry.response = outputContent
				}

				return resultProcessor(result, fileObj, index)
			})
			.filter((result): result is T => result !== null)

		return {
			debugData,
			processedResults
		}
	}
}
