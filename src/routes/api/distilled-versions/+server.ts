import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { PresetDbService } from '$lib/server/presetDb'
import { DistillablePreset } from '$lib/types/db'
import type { DbDistillation } from '$lib/types/db'
import { logErrorAlways } from '$lib/log'

// Valid basenames for distilled content - now using the enum values
const VALID_DISTILLED_BASENAMES = Object.values(DistillablePreset)

function transformDbDistillationToVersion(dbDistillation: DbDistillation, presetKey: string) {
	// Handle date format - version could be 'latest' or '2024-01-15'
	const date =
		dbDistillation.version === 'latest'
			? new Date(dbDistillation.created_at).toISOString().split('T')[0]
			: dbDistillation.version

	const filename = `${presetKey}-${date}.md`

	return {
		filename,
		date,
		path: `/api/preset-content/${presetKey}/${dbDistillation.version}`,
		sizeKb: dbDistillation.size_kb
	}
}

export const GET: RequestHandler = async ({ url }) => {
	try {
		// Get the preset key from the URL query parameter
		const presetKey = url.searchParams.get('preset') || DistillablePreset.SVELTE_COMPLETE_DISTILLED

		// Validate the preset key
		if (!VALID_DISTILLED_BASENAMES.includes(presetKey as DistillablePreset)) {
			return json([])
		}

		// Get all versions from database
		const dbDistillations = await PresetDbService.getAllDistillationsForPreset(presetKey)

		if (dbDistillations.length === 0) {
			return json([])
		}

		// Transform database distillations to version format
		const versions = dbDistillations
			.filter((d) => d.version !== 'latest') // Exclude 'latest' version from list
			.map((dbDistillation) => transformDbDistillationToVersion(dbDistillation, presetKey))
			.sort((a, b) => b.date.localeCompare(a.date)) // Sort newest first

		return json(versions)
	} catch (e) {
		logErrorAlways('Database error reading distilled versions:', e)
		throw error(500, 'Failed to retrieve distilled versions from database')
	}
}
