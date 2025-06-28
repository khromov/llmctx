import type { LLMProvider } from './llm.ts'
import { Anthropic } from '@anthropic-ai/sdk'
import { env } from '$env/dynamic/private'
import { logErrorAlways, logWarningAlways, log } from '$lib/log'

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

export class AnthropicProvider implements LLMProvider {
	private client: Anthropic
	private modelId: string
	private baseUrl: string
	private apiKey: string
	name = 'Anthropic'
	private readonly availableModels = ['claude-sonnet-4-20250514', 'claude-opus-4-20250514']

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

			const firstContent = completion.content[0]
			return firstContent?.type === 'text' ? firstContent.text : ''
		} catch (error) {
			logErrorAlways('Error generating code with Anthropic:', error)
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
			logErrorAlways('Error creating batch with Anthropic:', error)
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
					logErrorAlways(
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
				logWarningAlways(
					`Error getting batch status for ${batchId} (attempt ${retryCount}/${maxRetries}):`,
					error
				)
				log(`Retrying in ${retryDelay / 1000} seconds...`)

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
			logErrorAlways(`Error getting batch results:`, error)
			throw new Error(
				`Failed to get batch results: ${error instanceof Error ? error.message : String(error)}`
			)
		}
	}
}
