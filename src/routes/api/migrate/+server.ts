import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { dev } from '$app/environment'

import path from 'path'
import { fileURLToPath } from 'url'
import { migrate } from 'postgres-migrations/src/index'
import { maybeInitializePool } from '$lib/server/db'
import { logWarningAlways } from '$lib/log'

export const GET: RequestHandler = async () => {
	const __filename = fileURLToPath(import.meta.url)
	const __dirname = path.dirname(__filename)
	const messages: string[] = []
	const errors: string[] = []

	try {
		// Initialize the database pool - this will now throw if it fails
		const client = maybeInitializePool()

		if (!client) {
			throw new Error('Failed to initialize database connection pool')
		}

		const migrationsPath = dev
			? `${__dirname}/../../../../migrations`
			: `${__dirname}/../../migrations`

		const migrations = await migrate({ client }, migrationsPath)

		migrations.forEach((migration) => messages.push(`✅ ${migration.fileName}`))
		messages.push('🏁 Migrations completed')
	} catch (e) {
		logWarningAlways('Migration error:', e)

		const errorMessage = e instanceof Error ? e.message : 'Unknown error occurred'
		errors.push(errorMessage)

		// Add more helpful error messages for common issues
		if (errorMessage.includes('connection') || errorMessage.includes('pool')) {
			errors.push('Please check your database connection settings in DB_URL environment variable')
		}
	}

	// Return appropriate status code based on success/failure
	const status = errors.length > 0 ? 500 : 200

	return json(
		{
			messages,
			errors
		},
		{ status }
	)
}
