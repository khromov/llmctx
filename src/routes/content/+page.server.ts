import type { PageServerLoad } from './$types'
import { ContentComparisonService } from '$lib/server/contentComparison'
import { logAlways, logErrorAlways } from '$lib/log'

export const load: PageServerLoad = async () => {
	try {
		logAlways('Loading content comparison data...')

		const [comparisons, stats] = await Promise.all([
			ContentComparisonService.getContentComparisons(),
			ContentComparisonService.getComparisonStats()
		])

		return {
			comparisons,
			stats
		}
	} catch (error) {
		logErrorAlways('Error loading content comparison data:', error)
		return {
			comparisons: [],
			stats: {
				totalComparisons: 0,
				averageCompressionRatio: 0,
				totalSizeSaved: 0,
				originalTotalSize: 0,
				distilledTotalSize: 0
			},
			error: error instanceof Error ? error.message : 'Unknown error'
		}
	}
}
