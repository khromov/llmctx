import type { RequestHandler } from './$types'
import { error } from '@sveltejs/kit'
import { presets } from '$lib/presets'
import { getPresetSizeKb } from '$lib/presetCache'
import { PresetDbService } from '$lib/server/presetDb'
import { DistillablePreset } from '$lib/types/db'
import { logAlways, logErrorAlways } from '$lib/log'

// Virtual distilled presets that aren't in the presets object - now using enum values
const VIRTUAL_DISTILLED_PRESETS = [
	DistillablePreset.SVELTE_DISTILLED,
	DistillablePreset.SVELTEKIT_DISTILLED
]

export const GET: RequestHandler = async ({ params }) => {
	const presetKey = params.preset

	// Handle both regular presets and virtual distilled presets
	const isVirtualPreset = VIRTUAL_DISTILLED_PRESETS.includes(presetKey as DistillablePreset)
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
			// Calculate size on-demand from content table
			sizeKb = await getPresetSizeKb(presetKey)
		}

		if (sizeKb !== null) {
			return new Response(JSON.stringify({ sizeKb }), {
				headers: {
					'Content-Type': 'application/json'
				}
			})
		}

		// If content doesn't exist yet
		logAlways(`No content found for preset "${presetKey}"`)

		return new Response(JSON.stringify({ sizeKb: 0, status: 'not_generated' }), {
			headers: {
				'Content-Type': 'application/json'
			}
		})
	} catch (e) {
		logErrorAlways(`Error calculating size for preset "${presetKey}":`, e)
		error(500, `Failed to get size for preset "${presetKey}"`)
	}
}
