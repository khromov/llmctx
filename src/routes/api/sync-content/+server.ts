import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { env } from '$env/dynamic/private'
import { ContentSyncService } from '$lib/server/contentSync'
import { DEFAULT_REPOSITORY } from '$lib/presets'
import { logAlways, logErrorAlways } from '$lib/log'

export const GET: RequestHandler = async ({ url }) => {
	const secretKey = url.searchParams.get('secret_key')
	const envSecretKey = env.CONTENT_SYNC_SECRET_KEY || env.DISTILL_SECRET_KEY

	if (!envSecretKey) {
		throw error(500, 'Server is not configured for content sync (CONTENT_SYNC_SECRET_KEY not set)')
	}

	if (secretKey !== envSecretKey) {
		throw error(403, 'Invalid secret key')
	}

	try {
		const { owner, repo } = DEFAULT_REPOSITORY
		logAlways(`Starting content sync for ${owner}/${repo} repository`)

		const result = await ContentSyncService.syncRepository({
			returnStats: true
		})

		return json({
			message: `Successfully synced ${owner}/${repo} repository`,
			...result
		})
	} catch (e) {
		logErrorAlways('Content sync failed:', e)
		throw error(500, `Sync failed: ${e instanceof Error ? e.message : String(e)}`)
	}
}
