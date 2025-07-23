export interface LLMProvider {
	name: string
	generateResponse(prompt: string, temperature?: number): Promise<string>
	getModels(): string[]
	getModelIdentifier(): string
}

// Enhanced interface for providers that support batch operations
export interface BatchLLMProvider extends LLMProvider {
	createBatch(requests: BatchRequest[]): Promise<BatchResponse>
	getBatchStatus(batchId: string, maxRetries?: number, retryDelay?: number): Promise<BatchResponse>
	getBatchResults(resultsUrl: string): Promise<BatchResult[]>
}

// Generic batch interfaces that can be implemented by different providers
export interface BatchRequest {
	custom_id: string
	params: {
		model: string
		max_tokens: number
		messages: {
			role: 'user' | 'assistant'
			content: string | { type: string; text: string }[]
		}[]
		temperature?: number
		[key: string]: unknown
	}
}

export interface BatchResponse {
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

export interface BatchResult {
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
