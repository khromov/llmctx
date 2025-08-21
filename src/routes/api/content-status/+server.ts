import type { RequestHandler } from './$types'
import { json } from '@sveltejs/kit'
import { ContentSyncService } from '$lib/server/contentSync'
import { DEFAULT_REPOSITORY } from '$lib/presets'
import { logErrorAlways } from '$lib/log'

export const GET: RequestHandler = async () => {
	try {
		const stats = await ContentSyncService.getContentStats()
		const { owner, repo } = DEFAULT_REPOSITORY
		const isStale = await ContentSyncService.isRepositoryContentStale()

		return json({
			success: true,
			repository: `${owner}/${repo}`,
			stats,
			isStale,
			isEmpty: stats.total_files === 0,
			message:
				stats.total_files === 0
					? 'Content table is empty. Content will be synced automatically on first preset request.'
					: `Content table contains ${stats.total_files} files`,
			timestamp: new Date().toISOString()
		})
	} catch (error) {
		logErrorAlways('Error getting content status:', error)
		return json(
			{
				success: false,
				error: 'Failed to get content status'
			},
			{ status: 500 }
		)
	}
}
