import type { BatchLLMProvider } from './llm.ts'
import { AnthropicProvider } from './anthropic.ts'
import { LMStudioProvider } from './lmstudio.ts'
import { env } from '$env/dynamic/private'
import { logAlways, logErrorAlways } from '$lib/log'

export type SupportedProvider = 'anthropic' | 'lmstudio'

export class LLMProviderFactory {
	private static instance: BatchLLMProvider | null = null

	/**
	 * Get the configured LLM provider based on environment variables
	 */
	static getProvider(modelId?: string): BatchLLMProvider {
		// Use cached instance if available and no specific model requested
		if (LLMProviderFactory.instance && !modelId) {
			return LLMProviderFactory.instance
		}

		const providerType = (env.LLM_PROVIDER?.toLowerCase() as SupportedProvider) || 'anthropic'

		try {
			let provider: BatchLLMProvider

			switch (providerType) {
				case 'lmstudio':
					logAlways(`Creating LM Studio provider with model: ${modelId || 'google/gemma-3-12b'}`)
					provider = new LMStudioProvider(modelId)
					break

				case 'anthropic':
				default:
					logAlways(
						`Creating Anthropic provider with model: ${modelId || 'claude-sonnet-4-20250514'}`
					)
					provider = new AnthropicProvider(modelId)
					break
			}

			// Cache the instance if no specific model was requested
			if (!modelId) {
				LLMProviderFactory.instance = provider
			}

			return provider
		} catch (error) {
			logErrorAlways(`Failed to create ${providerType} provider:`, error)
			throw new Error(
				`Failed to initialize ${providerType} provider: ${error instanceof Error ? error.message : String(error)}`
			)
		}
	}

	/**
	 * Get the current provider type from environment
	 */
	static getProviderType(): SupportedProvider {
		return (env.LLM_PROVIDER?.toLowerCase() as SupportedProvider) || 'anthropic'
	}

	/**
	 * Check if the current provider supports a specific feature
	 */
	static supportsFeature(feature: 'batch_processing' | 'streaming' | 'tools'): boolean {
		const providerType = LLMProviderFactory.getProviderType()

		switch (feature) {
			case 'batch_processing':
				return true // Both providers support it (LM Studio via simulation)
			case 'streaming':
				return true // Both providers support streaming
			case 'tools':
				return providerType === 'lmstudio' // LM Studio has better tool support
			default:
				return false
		}
	}

	/**
	 * Clear the cached provider instance (useful for testing or config changes)
	 */
	static clearCache(): void {
		LLMProviderFactory.instance = null
	}

	/**
	 * Get provider-specific configuration info
	 */
	static getProviderInfo(): {
		type: SupportedProvider
		name: string
		requiresApiKey: boolean
		defaultModel: string
		supportsBatch: boolean
	} {
		const providerType = LLMProviderFactory.getProviderType()

		switch (providerType) {
			case 'lmstudio':
				return {
					type: 'lmstudio',
					name: 'LM Studio',
					requiresApiKey: false,
					defaultModel: 'google/gemma-3-12b',
					supportsBatch: true // Via sequential processing
				}

			case 'anthropic':
			default:
				return {
					type: 'anthropic',
					name: 'Anthropic',
					requiresApiKey: true,
					defaultModel: 'claude-sonnet-4-20250514',
					supportsBatch: true // Native batch API
				}
		}
	}
}

/**
 * Convenience function to get the default provider
 */
export function getDefaultProvider(): BatchLLMProvider {
	return LLMProviderFactory.getProvider()
}

/**
 * Convenience function to get a provider with a specific model
 */
export function getProviderWithModel(modelId: string): BatchLLMProvider {
	return LLMProviderFactory.getProvider(modelId)
}
