import type { PresetConfig } from '$lib/presets'
import { presets } from '$lib/presets'

export interface Repository {
	owner: string
	repo: string
	key: string
}

export interface PresetsByRepository {
	repository: Repository
	presets: Array<{
		key: string
		config: PresetConfig
	}>
}

/**
 * Get all unique repositories from presets
 */
export function getUniqueRepositories(): Repository[] {
	const repoMap = new Map<string, Repository>()

	for (const [key, config] of Object.entries(presets)) {
		const repoKey = `${config.owner}/${config.repo}`

		if (!repoMap.has(repoKey)) {
			repoMap.set(repoKey, {
				owner: config.owner,
				repo: config.repo,
				key: repoKey
			})
		}
	}

	return Array.from(repoMap.values())
}

/**
 * Group presets by their repository
 */
export function groupPresetsByRepository(): PresetsByRepository[] {
	const groupedMap = new Map<string, PresetsByRepository>()

	for (const [key, config] of Object.entries(presets)) {
		const repoKey = `${config.owner}/${config.repo}`

		if (!groupedMap.has(repoKey)) {
			groupedMap.set(repoKey, {
				repository: {
					owner: config.owner,
					repo: config.repo,
					key: repoKey
				},
				presets: []
			})
		}

		const group = groupedMap.get(repoKey)!
		group.presets.push({ key, config })
	}

	return Array.from(groupedMap.values())
}

/**
 * Get all presets for a specific repository
 */
export function getPresetsForRepository(
	owner: string,
	repo: string
): Array<{ key: string; config: PresetConfig }> {
	const results: Array<{ key: string; config: PresetConfig }> = []

	for (const [key, config] of Object.entries(presets)) {
		if (config.owner === owner && config.repo === repo) {
			results.push({ key, config })
		}
	}

	return results
}

/**
 * Check if multiple presets share the same repository
 */
export function doPresetsShareRepository(presetKeys: string[]): boolean {
	if (presetKeys.length < 2) return false

	const firstPreset = presets[presetKeys[0]]
	if (!firstPreset) return false

	const firstRepoKey = `${firstPreset.owner}/${firstPreset.repo}`

	return presetKeys.every((key) => {
		const preset = presets[key]
		return preset && `${preset.owner}/${preset.repo}` === firstRepoKey
	})
}

/**
 * Get repository statistics
 */
export function getRepositoryStats(): {
	totalRepositories: number
	totalPresets: number
	presetsPerRepository: Record<string, number>
} {
	const grouped = groupPresetsByRepository()
	const presetsPerRepository: Record<string, number> = {}

	for (const group of grouped) {
		presetsPerRepository[group.repository.key] = group.presets.length
	}

	return {
		totalRepositories: grouped.length,
		totalPresets: Object.keys(presets).length,
		presetsPerRepository
	}
}
