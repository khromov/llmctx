import { ContentDbService } from './contentDb'
import { ContentDistilledDbService } from './contentDistilledDb'
import type { DbContent, DbContentDistilled } from '$lib/types/db'
import { logAlways, logErrorAlways } from '$lib/log'

export interface ContentComparison {
	path: string
	original: DbContent | null
	distilled: DbContentDistilled | null
	sizeDifference: number // positive means original is larger
	compressionRatio: number // how much smaller distilled is (e.g., 0.3 = 30% of original size)
}

export class ContentComparisonService {
	/**
	 * Get all content comparisons between content and content_distilled tables
	 * Returns only paths that exist in both tables
	 */
	static async getContentComparisons(): Promise<ContentComparison[]> {
		try {
			logAlways('Fetching content comparisons...')

			// Get all content from both tables
			const [originalContent, distilledContent] = await Promise.all([
				ContentDbService.getAllContent(),
				ContentDistilledDbService.getAllContentDistilled()
			])

			// Create maps for efficient lookup
			const originalMap = new Map<string, DbContent>()
			const distilledMap = new Map<string, DbContentDistilled>()

			originalContent.forEach((content) => originalMap.set(content.path, content))
			distilledContent.forEach((content) => distilledMap.set(content.path, content))

			// Find paths that exist in both tables
			const commonPaths = new Set<string>()
			for (const path of originalMap.keys()) {
				if (distilledMap.has(path)) {
					commonPaths.add(path)
				}
			}

			// Create comparison objects
			const comparisons: ContentComparison[] = []

			for (const path of commonPaths) {
				const original = originalMap.get(path)!
				const distilled = distilledMap.get(path)!

				const sizeDifference = original.size_bytes - distilled.size_bytes
				const compressionRatio = distilled.size_bytes / original.size_bytes

				comparisons.push({
					path,
					original,
					distilled,
					sizeDifference,
					compressionRatio
				})
			}

			// Sort by path for consistent ordering
			comparisons.sort((a, b) => a.path.localeCompare(b.path))

			logAlways(`Found ${comparisons.length} content comparisons`)

			return comparisons
		} catch (error) {
			logErrorAlways('Error fetching content comparisons:', error)
			throw new Error(
				`Failed to fetch content comparisons: ${error instanceof Error ? error.message : String(error)}`
			)
		}
	}

	/**
	 * Get comparison statistics
	 */
	static async getComparisonStats(): Promise<{
		totalComparisons: number
		averageCompressionRatio: number
		totalSizeSaved: number
		originalTotalSize: number
		distilledTotalSize: number
	}> {
		try {
			const comparisons = await this.getContentComparisons()

			if (comparisons.length === 0) {
				return {
					totalComparisons: 0,
					averageCompressionRatio: 0,
					totalSizeSaved: 0,
					originalTotalSize: 0,
					distilledTotalSize: 0
				}
			}

			const totalSizeSaved = comparisons.reduce((sum, comp) => sum + comp.sizeDifference, 0)
			const originalTotalSize = comparisons.reduce(
				(sum, comp) => sum + (comp.original?.size_bytes || 0),
				0
			)
			const distilledTotalSize = comparisons.reduce(
				(sum, comp) => sum + (comp.distilled?.size_bytes || 0),
				0
			)
			const averageCompressionRatio =
				comparisons.reduce((sum, comp) => sum + comp.compressionRatio, 0) / comparisons.length

			return {
				totalComparisons: comparisons.length,
				averageCompressionRatio,
				totalSizeSaved,
				originalTotalSize,
				distilledTotalSize
			}
		} catch (error) {
			logErrorAlways('Error calculating comparison stats:', error)
			throw error
		}
	}
}
