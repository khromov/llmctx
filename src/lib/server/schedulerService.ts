import { Cron, scheduledJobs } from 'croner'
import { dev } from '$app/environment'
import { ContentSyncService } from '$lib/server/contentSync'
import { CacheDbService } from '$lib/server/cacheDb'
import { log, logAlways, logErrorAlways } from '$lib/log'

export class SchedulerService {
	private static instance: SchedulerService | null = null
	private jobs: Map<string, Cron> = new Map()
	private isInitialized = false
	private cacheService: CacheDbService

	private constructor() {
		this.cacheService = new CacheDbService()
	}

	static getInstance(): SchedulerService {
		if (!SchedulerService.instance) {
			SchedulerService.instance = new SchedulerService()
		}
		return SchedulerService.instance
	}

	private cleanupOrphanedJobs(): void {
		if (scheduledJobs && Array.isArray(scheduledJobs)) {
			// More robust cleanup - track our job instances and clean up any unrecognized jobs
			const knownJobInstances = Array.from(this.jobs.values())

			for (let i = scheduledJobs.length - 1; i >= 0; i--) {
				const job = scheduledJobs[i]
				if (job && !knownJobInstances.includes(job)) {
					// This is an orphaned job not in our tracking map
					job.stop()
					logAlways(`Cleaned up orphaned cron job`)
				}
			}
		}
	}

	async init(): Promise<void> {
		// Clean up any orphaned jobs from previous runs (e.g., hot module reloading)
		this.cleanupOrphanedJobs()

		if (this.isInitialized) {
			logAlways('SchedulerService already initialized, reinitializing...')
			await this.stop()
		}

		logAlways('Initializing SchedulerService...')

		// Content sync: update every 12 hours (at 2:00 AM and 2:00 PM)
		const contentSyncSchedule = process.env.CONTENT_SYNC_SCHEDULE || '0 2,14 * * *'

		// In development, run every 30 minutes for testing
		const devSchedule = '*/30 * * * *'

		this.scheduleContentSync(dev ? devSchedule : contentSyncSchedule)

		this.scheduleCacheCleanup()

		this.isInitialized = true
		logAlways(`SchedulerService initialized with ${this.jobs.size} jobs`)
	}

	private scheduleContentSync(schedule: string): void {
		const existingJob = this.jobs.get('content-sync')
		if (existingJob) {
			existingJob.stop()
			logAlways('Stopped existing content-sync job')
		}

		const job = new Cron(
			schedule,
			{
				name: 'content-sync',
				timezone: 'UTC',
				catch: (err) => {
					logErrorAlways('Error in content sync job:', err)
				}
			},
			() => {
				this.syncContent()
			}
		)

		this.jobs.set('content-sync', job)
		logAlways(`Scheduled content sync: ${schedule}`)
	}

	private async syncContent(): Promise<void> {
		logAlways('Starting scheduled content sync job...')

		try {
			const isStale = await ContentSyncService.isRepositoryContentStale()

			if (!isStale) {
				logAlways(`Repository content is fresh, skipping sync`)
				return
			}

			logAlways(`Syncing sveltejs/svelte.dev repository using ContentSyncService...`)
			const result = await ContentSyncService.syncRepository({
				returnStats: true
			})

			logAlways('Scheduled content sync completed successfully')
			logAlways(
				`Sync details: ${result.sync_details.upserted_files} upserted, ${result.sync_details.deleted_files} deleted, ${result.sync_details.unchanged_files} unchanged`
			)
			logAlways(`Total files in database: ${result.stats.total_files}`)
		} catch (error) {
			logErrorAlways('Failed to sync content:', error)
		}

		logAlways('Scheduled content sync job completed')
	}

	getJobStatus(): Record<string, { running: boolean; nextRun: Date | null }> {
		const status: Record<string, { running: boolean; nextRun: Date | null }> = {}

		for (const [name, job] of this.jobs) {
			status[name] = {
				running: job.isRunning(),
				nextRun: job.nextRun()
			}
		}

		return status
	}

	async stop(): Promise<void> {
		logAlways('Stopping SchedulerService...')

		for (const [name, job] of this.jobs) {
			job.stop()
			logAlways(`Stopped job: ${name}`)
		}

		// Clean up any remaining orphaned jobs by name
		if (scheduledJobs && Array.isArray(scheduledJobs)) {
			const jobNames = ['content-sync', 'cache-cleanup']
			for (let i = scheduledJobs.length - 1; i >= 0; i--) {
				const job = scheduledJobs[i]
				if (job && job.options && job.options.name && jobNames.includes(job.options.name)) {
					job.stop()
					logAlways(`Removed orphaned job from global registry: ${job.options.name}`)
				}
			}
		}

		this.jobs.clear()
		this.isInitialized = false
		logAlways('SchedulerService stopped')
	}

	private scheduleCacheCleanup(): void {
		const existingJob = this.jobs.get('cache-cleanup')
		if (existingJob) {
			existingJob.stop()
			logAlways('Stopped existing cache-cleanup job')
		}

		// Run every minute
		const job = new Cron(
			'* * * * *',
			{
				name: 'cache-cleanup', // Now consistently using names
				timezone: 'UTC',
				catch: (err) => {
					logErrorAlways('Error in cache cleanup job:', err)
				}
			},
			() => {
				this.cleanupExpiredCache()
			}
		)

		this.jobs.set('cache-cleanup', job)
		logAlways('Scheduled cache cleanup: every minute')
	}

	private async cleanupExpiredCache(): Promise<void> {
		log('Starting cache cleanup job...')
		try {
			const deletedCount = await this.cacheService.deleteExpired()
			if (deletedCount > 0) {
				logAlways(`Cleaned up ${deletedCount} expired cache entries`)
			}
		} catch (error) {
			logErrorAlways('Failed to clean up expired cache entries:', error)
		}
	}

	async triggerContentSync(): Promise<void> {
		logAlways('Manually triggering content sync...')
		await this.syncContent()
	}

	async triggerCacheCleanup(): Promise<void> {
		logAlways('Manually triggering cache cleanup...')
		await this.cleanupExpiredCache()
	}
}

// Export singleton instance
export const schedulerService = SchedulerService.getInstance()
