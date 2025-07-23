/**
 * Test file demonstrating the LLM Provider Factory
 * This shows how to use both Anthropic and LM Studio providers
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { LLMProviderFactory, getDefaultProvider } from '$lib/llmProviderFactory'
import type { BatchRequest } from '$lib/llm'

describe('LLM Provider Factory', () => {
	beforeEach(() => {
		// Clear the provider cache before each test
		LLMProviderFactory.clearCache()
	})

	it('should create Anthropic provider by default', () => {
		const provider = getDefaultProvider()
		expect(provider.name).toBe('Anthropic')
		expect(provider.getModels()).toContain('claude-sonnet-4-20250514')
	})

	it('should return provider info correctly', () => {
		const info = LLMProviderFactory.getProviderInfo()
		expect(info.type).toBe('anthropic') // Default when no env var is set
		expect(info.name).toBe('Anthropic')
		expect(info.requiresApiKey).toBe(true)
		expect(info.supportsBatch).toBe(true)
	})

	it('should support feature checking', () => {
		expect(LLMProviderFactory.supportsFeature('batch_processing')).toBe(true)
		expect(LLMProviderFactory.supportsFeature('streaming')).toBe(true)
	})

	it('should cache provider instances', () => {
		const provider1 = getDefaultProvider()
		const provider2 = getDefaultProvider()
		expect(provider1).toBe(provider2) // Should be the same instance
	})

	it('should create new instance with specific model', () => {
		const defaultProvider = getDefaultProvider()
		const customProvider = LLMProviderFactory.getProvider('claude-opus-4-20250514')

		expect(defaultProvider).not.toBe(customProvider) // Should be different instances
		expect(customProvider.getModelIdentifier()).toBe('claude-opus-4-20250514')
	})

	// Note: These tests would require actual API keys or running LM Studio instance
	// For demonstration purposes only - actual tests would need proper setup

	it.skip('should generate response with Anthropic provider', async () => {
		const provider = getDefaultProvider()
		const response = await provider.generateResponse('Hello, how are you?')
		expect(response).toBeTruthy()
		expect(typeof response).toBe('string')
	})

	it.skip('should handle batch processing with Anthropic', async () => {
		const provider = getDefaultProvider()

		const batchRequests: BatchRequest[] = [
			{
				custom_id: 'test-1',
				params: {
					model: provider.getModelIdentifier(),
					max_tokens: 100,
					messages: [{ role: 'user', content: 'What is 2+2?' }]
				}
			},
			{
				custom_id: 'test-2',
				params: {
					model: provider.getModelIdentifier(),
					max_tokens: 100,
					messages: [{ role: 'user', content: 'What is the capital of France?' }]
				}
			}
		]

		const batchResponse = await provider.createBatch(batchRequests)
		expect(batchResponse.id).toBeTruthy()
		expect(batchResponse.processing_status).toBe('in_progress')
	})
})

// Example usage for LM Studio provider
describe('LM Studio Provider Usage Example', () => {
	it.skip('should demonstrate LM Studio usage', async () => {
		// This test requires LM Studio to be running locally
		// Set environment variable: LLM_PROVIDER=lmstudio

		process.env.LLM_PROVIDER = 'lmstudio'
		LLMProviderFactory.clearCache()

		const provider = getDefaultProvider()
		expect(provider.name).toBe('LM Studio')
		expect(provider.getModelIdentifier()).toBe('google/gemma-3-12b')

		// Example response generation
		const response = await provider.generateResponse('Explain React hooks')
		expect(response).toBeTruthy()

		// Example batch processing (will be processed sequentially)
		const batchRequests: BatchRequest[] = [
			{
				custom_id: 'react-1',
				params: {
					model: 'google/gemma-3-12b',
					max_tokens: 200,
					messages: [{ role: 'user', content: 'What is useState?' }]
				}
			},
			{
				custom_id: 'react-2',
				params: {
					model: 'google/gemma-3-12b',
					max_tokens: 200,
					messages: [{ role: 'user', content: 'What is useEffect?' }]
				}
			}
		]

		const batchResponse = await provider.createBatch(batchRequests)

		// Poll for completion
		let status = await provider.getBatchStatus(batchResponse.id)
		while (status.processing_status === 'in_progress') {
			await new Promise((resolve) => setTimeout(resolve, 1000))
			status = await provider.getBatchStatus(batchResponse.id)
		}

		// Get results
		if (status.results_url) {
			const results = await provider.getBatchResults(status.results_url)
			expect(results).toHaveLength(2)
			expect(results[0].custom_id).toBe('react-1')
			expect(results[1].custom_id).toBe('react-2')
		}
	})
})

/* 
Example of how to use the provider system in your application:

```typescript
import { getDefaultProvider, LLMProviderFactory } from '$lib/llmProviderFactory'

// Get the configured provider
const provider = getDefaultProvider()

// Check provider info
const info = LLMProviderFactory.getProviderInfo()
console.log(`Using ${info.name} provider with model ${provider.getModelIdentifier()}`)

// Generate a response
const response = await provider.generateResponse('Hello, world!')

// For batch processing
const batchRequests = [
  // your requests here
]
const batch = await provider.createBatch(batchRequests)

// Poll for completion
let status = await provider.getBatchStatus(batch.id)
while (status.processing_status === 'in_progress') {
  await new Promise(resolve => setTimeout(resolve, 5000))
  status = await provider.getBatchStatus(batch.id)
}

// Get results
if (status.results_url) {
  const results = await provider.getBatchResults(status.results_url)
  // Process results...
}
```

Environment Configuration:
- Set LLM_PROVIDER=anthropic (default) or LLM_PROVIDER=lmstudio
- For Anthropic: Set ANTHROPIC_API_KEY
- For LM Studio: Optionally set LM_STUDIO_BASE_URL (default: ws://localhost:1234)
*/
