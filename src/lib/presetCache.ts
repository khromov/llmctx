import { PresetDbService } from '$lib/server/presetDb'
import { log, logAlways, logErrorAlways } from '$lib/log'

// Maximum age of cached content in milliseconds (24 hours)
export const MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000

/**
 * Get preset content from database
 */
export async function getPresetContent(presetKey: string): Promise<string | null> {
	try {
		const preset = await PresetDbService.getPresetByName(presetKey)
		if (!preset || !preset.content) {
			log(`Preset not found in database: ${presetKey}`)
			return null
		}

		logAlways(`Retrieved content for ${presetKey} from database (${preset.size_kb}KB)`)

		return preset.content
	} catch (error) {
		logErrorAlways(`Error getting preset content for ${presetKey}:`, error)
		return null
	}
}

/**
 * Get content size in KB from database
 */
export async function getPresetSizeKb(presetKey: string): Promise<number | null> {
	try {
		const preset = await PresetDbService.getPresetByName(presetKey)
		if (!preset) {
			return null
		}

		return preset.size_kb
	} catch (error) {
		logErrorAlways(`Error getting preset size for ${presetKey}:`, error)
		return null
	}
}

/**
 * Check if preset content is stale based on database timestamps
 */
export async function isPresetStale(presetKey: string): Promise<boolean> {
	try {
		const preset = await PresetDbService.getPresetByName(presetKey)
		if (!preset) {
			return true // No preset exists, consider stale
		}

		// Check if content is older than MAX_CACHE_AGE_MS
		const contentAge = Date.now() - new Date(preset.updated_at).getTime()
		const isStale = contentAge > MAX_CACHE_AGE_MS

		if (isStale) {
			logAlways(`Preset ${presetKey} is stale (age: ${Math.floor(contentAge / 1000 / 60)} minutes)`)
		}

		return isStale
	} catch (error) {
		logErrorAlways(`Error checking preset staleness for ${presetKey}:`, error)
		return true // On error, assume stale
	}
}

/**
 * Check if preset exists in database
 */
export async function presetExists(presetKey: string): Promise<boolean> {
	try {
		const preset = await PresetDbService.getPresetByName(presetKey)
		return preset !== null
	} catch (error) {
		logErrorAlways(`Error checking preset existence for ${presetKey}:`, error)
		return false
	}
}

/**
 * Get preset metadata from database
 */
export async function getPresetMetadata(presetKey: string): Promise<{
	size_kb: number
	document_count: number
	updated_at: Date
	is_stale: boolean
} | null> {
	try {
		const preset = await PresetDbService.getPresetByName(presetKey)
		if (!preset) {
			return null
		}

		const isStale = await isPresetStale(presetKey)

		return {
			size_kb: preset.size_kb,
			document_count: preset.document_count,
			updated_at: preset.updated_at,
			is_stale: isStale
		}
	} catch (error) {
		logErrorAlways(`Error getting preset metadata for ${presetKey}:`, error)
		return null
	}
}
