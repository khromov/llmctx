import type { RequestHandler } from './$types'
import { json, error } from '@sveltejs/kit'
import { ContentDbService } from '$lib/server/contentDb'
import { extractTitleFromPath, removeFrontmatter } from '$lib/utils/pathUtils'
import { logAlways, logErrorAlways } from '$lib/log'

interface FullDocumentationResponse {
	success: boolean
	metadata: {
		total_documents: number
		filtered_documents: number
		total_size_kb: number
		last_updated: string
		generated_at: string
	}
	documents: Array<{
		path: string
		title: string
		filename: string
		content: string
		size_bytes: number
		metadata: Record<string, unknown>
		created_at: string
		updated_at: string
	}>
	error?: string
}

/**
 * Get title from metadata or extract from path
 */
function getTitleFromMetadata(
	metadata: Record<string, unknown> | undefined,
	fallbackPath: string
): string {
	if (metadata?.title && typeof metadata.title === 'string') {
		return metadata.title
	}
	return extractTitleFromPath(fallbackPath)
}

export const GET: RequestHandler = async () => {
	const startTime = Date.now()

	try {
		logAlways('JSON API request for FULL Svelte + SvelteKit documentation from database')

		// Query all Svelte and SvelteKit documentation from the database
		// This covers both /docs/svelte/ and /docs/kit/ paths with length filtering (200 chars minimum)
		const allDocs = await ContentDbService.getFilteredContent('apps/svelte.dev/content/docs/%')

		if (allDocs.length === 0) {
			logAlways('No documentation found in database')
			return json(
				{
					success: false,
					error: 'No documentation found in database. The repository may need to be synced first.',
					metadata: {
						total_documents: 0,
						filtered_documents: 0,
						total_size_kb: 0,
						last_updated: new Date().toISOString(),
						generated_at: new Date().toISOString()
					},
					documents: []
				} as FullDocumentationResponse,
				{
					status: 503,
					headers: {
						'Retry-After': '30'
					}
				}
			)
		}

		logAlways(`Found ${allDocs.length} total documents in database`)

		// Transform database entries to the desired format with frontmatter removed
		// Note: filtering by content length (200 chars minimum) is already done at the database level
		const documents = allDocs.map((doc) => ({
			path: doc.path,
			title: getTitleFromMetadata(doc.metadata, doc.path),
			filename: doc.filename,
			content: removeFrontmatter(doc.content), // Remove frontmatter from content
			size_bytes: doc.size_bytes,
			metadata: doc.metadata,
			created_at: doc.created_at.toISOString(),
			updated_at: doc.updated_at.toISOString()
		}))

		logAlways(`Found ${documents.length} documents with content length >= 200 characters`)

		// Calculate metadata
		const totalSizeBytes = documents.reduce((sum, doc) => sum + doc.size_bytes, 0)
		const totalSizeKb = Math.floor(totalSizeBytes / 1024)

		// Find the most recent update
		const lastUpdated = documents.reduce((latest, doc) => {
			const docDate = new Date(doc.updated_at)
			return docDate > latest ? docDate : latest
		}, new Date(0))

		const response: FullDocumentationResponse = {
			success: true,
			metadata: {
				total_documents: documents.length, // Now represents already filtered documents
				filtered_documents: documents.length,
				total_size_kb: totalSizeKb,
				last_updated: lastUpdated.toISOString(),
				generated_at: new Date().toISOString()
			},
			documents: documents
		}

		const generationTime = Date.now() - startTime

		// Count Svelte vs SvelteKit docs for logging
		const svelteCount = documents.filter((doc) => doc.path.includes('/docs/svelte/')).length
		const svelteKitCount = documents.filter((doc) => doc.path.includes('/docs/kit/')).length

		logAlways(`Successfully served FULL documentation from database`)
		logAlways(
			`Documents: ${documents.length}, Total size: ${totalSizeKb}KB, Generation time: ${generationTime}ms`
		)
		logAlways(`Svelte docs: ${svelteCount}, SvelteKit docs: ${svelteKitCount}`)

		return json(response, {
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
				'X-Generation-Time': `${generationTime}ms`,
				'X-Total-Documents': documents.length.toString(),
				'X-Filtered-Documents': documents.length.toString(),
				'X-Total-Size': `${totalSizeKb}KB`,
				'X-Svelte-Count': svelteCount.toString(),
				'X-SvelteKit-Count': svelteKitCount.toString()
			}
		})
	} catch (e) {
		logErrorAlways('Error serving full documentation API:', e)

		const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred'

		return json(
			{
				success: false,
				error: errorMessage,
				metadata: {
					total_documents: 0,
					filtered_documents: 0,
					total_size_kb: 0,
					last_updated: new Date().toISOString(),
					generated_at: new Date().toISOString()
				},
				documents: []
			} as FullDocumentationResponse,
			{ status: 500 }
		)
	}
}

// OPTIONS handler for CORS support
export const OPTIONS: RequestHandler = async () => {
	return new Response(null, {
		status: 200,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization',
			'Access-Control-Max-Age': '86400' // 24 hours
		}
	})
}
