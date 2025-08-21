import { error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { PresetDbService } from '$lib/server/presetDb'
import { DistillablePreset } from '$lib/types/db'
import { logErrorAlways } from '$lib/log'

// Valid basenames for distilled content - now using the enum values
const VALID_DISTILLED_BASENAMES = Object.values(DistillablePreset)

export const GET: RequestHandler = async ({ params }) => {
	const { presetKey, version } = params

	// Validate the preset key
	if (!VALID_DISTILLED_BASENAMES.includes(presetKey as DistillablePreset)) {
		throw error(404, 'Preset not found')
	}

	// Validate version format (should be date like 2024-01-15 or 'latest')
	const isValidVersion = version === 'latest' || /^\d{4}-\d{2}-\d{2}$/.test(version)
	if (!isValidVersion) {
		throw error(400, 'Invalid version format')
	}

	try {
		// Get content from distillations table
		const dbDistillation = await PresetDbService.getDistillationByVersion(presetKey, version)

		if (!dbDistillation || !dbDistillation.content) {
			throw error(404, 'Content not found in database')
		}

		return new Response(dbDistillation.content, {
			headers: {
				'Content-Type': 'text/markdown; charset=utf-8',
				'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
				'Content-Disposition': `inline; filename="${presetKey}-${version}.md"`
			}
		})
	} catch (e) {
		logErrorAlways(`Database error serving preset content for ${presetKey}/${version}:`, e)
		if (e instanceof Error && 'status' in e) {
			throw e // Re-throw SvelteKit errors
		}
		throw error(500, 'Database error retrieving content')
	}
}
