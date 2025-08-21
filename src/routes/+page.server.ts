import type { PageServerLoad } from './$types'
import { presets } from '$lib/presets'
import { getPresetSizeKb } from '$lib/presetCache'
import { PresetDbService } from '$lib/server/presetDb'
import { DistillablePreset } from '$lib/types/db'
import type { DbDistillation } from '$lib/types/db'
import { logAlways, logErrorAlways } from '$lib/log'

// Virtual distilled presets that aren't in the presets object
const VIRTUAL_DISTILLED_PRESETS = [
	DistillablePreset.SVELTE_DISTILLED,
	DistillablePreset.SVELTEKIT_DISTILLED,
	DistillablePreset.SVELTE_COMPLETE_DISTILLED
]

// Get all preset keys from both regular presets and virtual ones
const ALL_PRESET_KEYS = [...Object.keys(presets), ...VIRTUAL_DISTILLED_PRESETS]

// Valid basenames for distilled content - now using the enum values
const VALID_DISTILLED_BASENAMES = Object.values(DistillablePreset)

async function fetchPresetSize(
	presetKey: string
): Promise<{ key: string; sizeKb: number | null; error?: string }> {
	try {
		const isVirtualPreset = VIRTUAL_DISTILLED_PRESETS.includes(presetKey as DistillablePreset)
		const isRegularPreset = presetKey in presets
		const isDistilledPreset = isVirtualPreset || presets[presetKey]?.distilled

		if (!isVirtualPreset && !isRegularPreset) {
			return { key: presetKey, sizeKb: null, error: 'Invalid preset' }
		}

		let sizeKb: number | null = null

		if (isDistilledPreset) {
			// Get size from distillations table
			const distillation = await PresetDbService.getLatestDistillation(presetKey)
			if (distillation) {
				sizeKb = distillation.size_kb
			}
		} else {
			// Calculate size on-demand from content table
			sizeKb = await getPresetSizeKb(presetKey)
		}

		return { key: presetKey, sizeKb: sizeKb || 0 }
	} catch (error) {
		logErrorAlways(`Error fetching size for preset ${presetKey}:`, error)
		return {
			key: presetKey,
			sizeKb: null,
			error: error instanceof Error ? error.message : 'Unknown error'
		}
	}
}

function transformDbDistillationToVersion(dbDistillation: DbDistillation, presetKey: string) {
	// Handle date format - version could be 'latest' or '2024-01-15'
	const date =
		dbDistillation.version === 'latest'
			? new Date(dbDistillation.created_at).toISOString().split('T')[0]
			: dbDistillation.version

	// Generate filename from preset key and date
	const filename = `${presetKey}-${date}.md`

	return {
		filename,
		date,
		path: `/api/preset-content/${presetKey}/${dbDistillation.version}`,
		sizeKb: dbDistillation.size_kb
	}
}

async function fetchDistilledVersions(presetKey: string): Promise<{
	key: string
	versions: Array<{ filename: string; date: string; path: string; sizeKb: number }>
	error?: string
}> {
	try {
		// Validate the preset key
		if (!VALID_DISTILLED_BASENAMES.includes(presetKey as DistillablePreset)) {
			return { key: presetKey, versions: [] }
		}

		// Get all versions from database
		const dbDistillations = await PresetDbService.getAllDistillationsForPreset(presetKey)

		if (dbDistillations.length === 0) {
			return { key: presetKey, versions: [] }
		}

		// Transform database distillations to version format
		const versions = dbDistillations
			.filter((d) => d.version !== 'latest') // Exclude 'latest' version from list
			.map((dbDistillation) => transformDbDistillationToVersion(dbDistillation, presetKey))
			.sort((a, b) => b.date.localeCompare(a.date)) // Sort newest first

		return { key: presetKey, versions }
	} catch (error) {
		logErrorAlways(`Error fetching distilled versions for preset ${presetKey}:`, error)
		return {
			key: presetKey,
			versions: [],
			error: error instanceof Error ? error.message : 'Unknown error'
		}
	}
}

export const load: PageServerLoad = async ({ parent }) => {
	const { isOldHost } = await parent()

	logAlways(`Starting parallel fetch of sizes for ${ALL_PRESET_KEYS.length} presets`)

	// Create streaming promises for all preset sizes
	// These will resolve independently as each preset size is calculated
	const presetSizePromises = ALL_PRESET_KEYS.reduce(
		(acc, presetKey) => {
			acc[presetKey] = fetchPresetSize(presetKey)
			return acc
		},
		{} as Record<string, Promise<{ key: string; sizeKb: number | null; error?: string }>>
	)

	logAlways(`Starting parallel fetch of distilled versions for all presets`)

	// Create streaming promises for all distilled versions
	// These will resolve independently as each preset's versions are fetched
	const distilledVersionsPromises = ALL_PRESET_KEYS.reduce(
		(acc, presetKey) => {
			acc[presetKey] = fetchDistilledVersions(presetKey)
			return acc
		},
		{} as Record<
			string,
			Promise<{
				key: string
				versions: Array<{ filename: string; date: string; path: string; sizeKb: number }>
				error?: string
			}>
		>
	)

	logAlways('Returning streaming promises for preset sizes and distilled versions')

	return {
		isOldHost,
		presetSizes: presetSizePromises,
		distilledVersions: distilledVersionsPromises
	}
}
