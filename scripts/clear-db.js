#!/usr/bin/env node

import PG from 'pg'

// Hardcoded to match the default in src/lib/server/db.ts
const DB_URL = 'postgres://admin:admin@localhost:5432/db'

async function clearDatabase() {
	console.log('🔄 Starting database clear...')
	console.log(`📡 Connecting to: ${DB_URL}`)

	const client = new PG.Pool({
		connectionString: DB_URL,
		max: 1
	})

	try {
		// Test connection first
		await client.query('SELECT NOW()')
		console.log('✅ Database connection successful')

		console.log('🗑️  Dropping all tables...')

		// Just drop and recreate the public schema - no fancy permissions
		await client.query(`
			DROP SCHEMA IF EXISTS public CASCADE;
			CREATE SCHEMA public;
		`)

		console.log('✅ All tables dropped and schema recreated')
		console.log('🎉 Database cleared!')
	} catch (error) {
		console.error('❌ Error clearing database:', error)
		process.exit(1)
	} finally {
		await client.end()
	}
}

// Add safety check for production
if (process.env.NODE_ENV === 'production') {
	console.error('❌ Database clear is not allowed in production!')
	process.exit(1)
}

// Run the script
clearDatabase()
