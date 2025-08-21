import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { env } from '$env/dynamic/private'
import { dev } from '$app/environment'
import { logAlways, logErrorAlways } from '$lib/log'
import v8 from 'node:v8'
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

export const GET: RequestHandler = async ({ url }) => {
	const secretKey = url.searchParams.get('secret_key')
	const envSecretKey = env.CONTENT_SYNC_SECRET_KEY || env.DISTILL_SECRET_KEY

	if (!envSecretKey) {
		throw error(
			500,
			'Server is not configured for heap snapshots (CONTENT_SYNC_SECRET_KEY not set)'
		)
	}

	if (secretKey !== envSecretKey) {
		throw error(403, 'Invalid secret key')
	}

	try {
		// Use different output directories for dev vs production
		const outputDir = dev || env.DEV === 'true' ? './mount' : '/app/outputs'

		if (!existsSync(outputDir)) {
			logAlways('Creating outputs directory:', outputDir)
			mkdirSync(outputDir, { recursive: true })
		}

		// Generate timestamp for unique filename
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
		const filename = `heap-snapshot-${timestamp}.heapsnapshot`
		const filePath = join(outputDir, filename)

		logAlways('Writing heap snapshot to:', filePath)

		// Write the heap snapshot
		const heapSnapshotPath = v8.writeHeapSnapshot(filePath)

		// Get file stats for the response
		const fs = await import('node:fs/promises')
		const stats = await fs.stat(heapSnapshotPath)

		logAlways('Heap snapshot created successfully:', {
			path: heapSnapshotPath,
			size: stats.size,
			created: stats.birthtime,
			environment: dev ? 'development' : 'production'
		})

		return json({
			success: true,
			message: 'Heap snapshot created successfully',
			snapshot: {
				filename,
				path: heapSnapshotPath,
				size: stats.size,
				created: stats.birthtime.toISOString(),
				sizeFormatted: formatBytes(stats.size)
			},
			environment: dev ? 'development' : 'production',
			timestamp: new Date().toISOString()
		})
	} catch (e) {
		logErrorAlways('Error creating heap snapshot:', e)
		throw error(
			500,
			`Failed to create heap snapshot: ${e instanceof Error ? e.message : String(e)}`
		)
	}
}

/**
 * Format bytes into human readable format
 */
function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 B'

	const k = 1024
	const sizes = ['B', 'KB', 'MB', 'GB']
	const i = Math.floor(Math.log(bytes) / Math.log(k))

	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
