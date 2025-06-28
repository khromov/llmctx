import type { RequestHandler } from './$types'
import { error } from '@sveltejs/kit'
import { presets } from '$lib/presets'
import { getPresetSizeKb } from '$lib/presetCache'
import { PresetDbService } from '$lib/server/presetDb'
import { logAlways, logErrorAlways } from '$lib/log'

// Virtual distilled presets that aren't in the presets object
const VIRTUAL_DISTILLED_PRESETS = ['svelte-distilled', 'sveltekit-distilled']

// Background updates are now handled by the scheduler service
// This function is no longer used

export const GET: RequestHandler = async ({ params }) => {
	const presetKey = params.preset

	// Handle both regular presets and virtual distilled presets
	const isVirtualPreset = VIRTUAL_DISTILLED_PRESETS.includes(presetKey)
	const isRegularPreset = presetKey in presets
	const isDistilledPreset = isVirtualPreset || presets[presetKey]?.distilled

	// If it's neither a virtual nor a regular preset, it's invalid
	if (!isVirtualPreset && !isRegularPreset) {
		error(400, `Invalid preset: "${presetKey}"`)
	}

	try {
		let sizeKb: number | null = null

		if (isDistilledPreset) {
			// Get size from distillations table
			const distillation = await PresetDbService.getLatestDistillation(presetKey)
			if (distillation) {
				sizeKb = distillation.size_kb
			}
		} else {
			// Get size from presets table
			sizeKb = await getPresetSizeKb(presetKey)
			// Note: Staleness checks and background updates are now handled by the scheduler service
		}

		if (sizeKb !== null) {
			return new Response(JSON.stringify({ sizeKb }), {
				headers: {
					'Content-Type': 'application/json'
				}
			})
		}

		// If content doesn't exist yet in database
		logAlways(`No content found in database for preset "${presetKey}"`)

		return new Response(JSON.stringify({ sizeKb: 0, status: 'not_generated' }), {
			headers: {
				'Content-Type': 'application/json'
			}
		})
	} catch (e) {
		logErrorAlways(`Database error calculating size for preset "${presetKey}":`, e)
		error(500, `Failed to get size from database for preset "${presetKey}"`)
	}
}
