import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { logAlways } from '$lib/log'

export const GET: RequestHandler = async () => {
	try {
		const memUsage = process.memoryUsage()

		// Get system memory info if available
		let systemMemory = null
		try {
			const os = await import('node:os')
			systemMemory = {
				free: os.freemem(),
				total: os.totalmem(),
				freeFormatted: formatBytes(os.freemem()),
				totalFormatted: formatBytes(os.totalmem()),
				usedPercentage: (((os.totalmem() - os.freemem()) / os.totalmem()) * 100).toFixed(1)
			}
		} catch (e) {
			// System memory not available
		}

		// Get process uptime
		const uptimeSeconds = process.uptime()
		const uptime = {
			seconds: uptimeSeconds,
			formatted: formatUptime(uptimeSeconds)
		}

		// Get GC stats if available
		let gcStats = null
		try {
			const v8 = await import('node:v8')
			const stats = v8.getHeapStatistics()
			gcStats = {
				totalHeapSize: stats.total_heap_size,
				totalHeapSizeExecutable: stats.total_heap_size_executable,
				totalPhysicalSize: stats.total_physical_size,
				totalAvailableSize: stats.total_available_size,
				usedHeapSize: stats.used_heap_size,
				heapSizeLimit: stats.heap_size_limit,
				mallocedMemory: stats.malloced_memory,
				peakMallocedMemory: stats.peak_malloced_memory,
				doesZapGarbage: stats.does_zap_garbage,
				numberOfNativeContexts: stats.number_of_native_contexts,
				numberOfDetachedContexts: stats.number_of_detached_contexts
			}
		} catch (e) {
			// GC stats not available
		}

		const response = {
			success: true,
			timestamp: new Date().toISOString(),
			process: {
				pid: process.pid,
				uptime,
				memory: {
					rss: memUsage.rss,
					heapTotal: memUsage.heapTotal,
					heapUsed: memUsage.heapUsed,
					external: memUsage.external,
					arrayBuffers: memUsage.arrayBuffers,
					// Formatted versions
					rssFormatted: formatBytes(memUsage.rss),
					heapTotalFormatted: formatBytes(memUsage.heapTotal),
					heapUsedFormatted: formatBytes(memUsage.heapUsed),
					externalFormatted: formatBytes(memUsage.external),
					arrayBuffersFormatted: formatBytes(memUsage.arrayBuffers),
					// Heap usage percentage
					heapUsagePercentage: ((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(1)
				}
			},
			system: systemMemory,
			v8: gcStats
		}

		logAlways('Memory status requested:', {
			heapUsed: memUsage.heapUsed,
			heapTotal: memUsage.heapTotal,
			rss: memUsage.rss,
			uptime: uptimeSeconds
		})

		return json(response)
	} catch (e) {
		throw error(500, `Failed to get memory status: ${e instanceof Error ? e.message : String(e)}`)
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

/**
 * Format uptime into human readable format
 */
function formatUptime(seconds: number): string {
	const days = Math.floor(seconds / 86400)
	const hours = Math.floor((seconds % 86400) / 3600)
	const minutes = Math.floor((seconds % 3600) / 60)
	const secs = Math.floor(seconds % 60)

	const parts = []
	if (days > 0) parts.push(`${days}d`)
	if (hours > 0) parts.push(`${hours}h`)
	if (minutes > 0) parts.push(`${minutes}m`)
	if (secs > 0 || parts.length === 0) parts.push(`${secs}s`)

	return parts.join(' ')
}
