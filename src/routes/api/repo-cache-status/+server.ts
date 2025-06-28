import type { RequestHandler } from './$types'
import { json } from '@sveltejs/kit'
import { getRepositoryCacheStatus, clearRepositoryCache } from '$lib/fetchMarkdown'
import { logAlways } from '$lib/log'

/**
 * API endpoint to get repository cache status or clear the cache
 */
export const GET: RequestHandler = async ({ url }) => {
	// Check if clear parameter is present
	if (url.searchParams.has('clear')) {
		await clearRepositoryCache()
		logAlways('Repository cache cleared via API')

		return json({
			success: true,
			message: 'Repository cache cleared',
			timestamp: new Date().toISOString()
		})
	}

	// Get cache status
	const status = await getRepositoryCacheStatus()

	return json({
		success: true,
		cacheStatus: status,
		timestamp: new Date().toISOString()
	})
}
