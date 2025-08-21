import { query } from '$lib/server/db'
import type { DbContentDistilled, CreateContentDistilledInput } from '$lib/types/db'
import { logAlways, logErrorAlways } from '$lib/log'
import { ContentDbService } from './contentDb'
import { cleanDocumentationPath } from '$lib/utils/pathUtils'

export class ContentDistilledDbService {
	static extractFilename(path: string): string {
		return path.split('/').pop() || path
	}

	static async upsertContentDistilled(
		input: CreateContentDistilledInput
	): Promise<DbContentDistilled> {
		try {
			const result = await query(
				`INSERT INTO content_distilled (
					path, filename, content, size_bytes, metadata
				) VALUES ($1, $2, $3, $4, $5)
				ON CONFLICT (path) DO UPDATE SET
					content = EXCLUDED.content,
					size_bytes = EXCLUDED.size_bytes,
					metadata = EXCLUDED.metadata,
					updated_at = CURRENT_TIMESTAMP
				RETURNING *`,
				[
					input.path,
					input.filename,
					input.content,
					input.size_bytes,
					input.metadata ? JSON.stringify(input.metadata) : '{}'
				]
			)

			logAlways(`Upserted distilled content for ${input.path}`)
			return result.rows[0] as DbContentDistilled
		} catch (error) {
			logErrorAlways(`Failed to upsert distilled content for ${input.path}:`, error)
			throw new Error(
				`Failed to upsert distilled content: ${error instanceof Error ? error.message : String(error)}`
			)
		}
	}

	static async getContentDistilledByPath(path: string): Promise<DbContentDistilled | null> {
		try {
			const result = await query('SELECT * FROM content_distilled WHERE path = $1', [path])
			return result.rows.length > 0 ? (result.rows[0] as DbContentDistilled) : null
		} catch (error) {
			logErrorAlways(`Failed to get distilled content ${path}:`, error)
			throw new Error(
				`Failed to get distilled content: ${error instanceof Error ? error.message : String(error)}`
			)
		}
	}

	static async getAllContentDistilled(): Promise<DbContentDistilled[]> {
		try {
			const result = await query('SELECT * FROM content_distilled ORDER BY path')
			return result.rows as DbContentDistilled[]
		} catch (error) {
			logErrorAlways('Failed to get all distilled content:', error)
			throw new Error(
				`Failed to get distilled content: ${error instanceof Error ? error.message : String(error)}`
			)
		}
	}

	/**
	 * Search content by path patterns for MCP prompts
	 * @param pathPatterns Array of path patterns to search for (e.g., ['%/docs/svelte/01-%', '%/docs/kit/20-%'])
	 * @returns Formatted content string with headers
	 */
	static async getContentByPathPatterns(pathPatterns: string[]): Promise<string> {
		try {
			const allContent: Array<{ path: string; content: string }> = []

			// For each pattern, find matching content
			for (const pattern of pathPatterns) {
				logAlways(`Searching distilled content with pattern: ${pattern}`)

				const result = await query(
					`SELECT path, content, metadata
					FROM content_distilled 
					WHERE path LIKE $1
					ORDER BY path`,
					[pattern]
				)

				for (const row of result.rows) {
					const cleanPath = cleanDocumentationPath(row.path)
					allContent.push({
						path: cleanPath,
						content: row.content
					})
				}
			}

			// Remove duplicates and format content
			const uniqueContent = new Map<string, string>()
			for (const item of allContent) {
				if (!uniqueContent.has(item.path)) {
					uniqueContent.set(item.path, `## ${item.path}\n\n${item.content}`)
				}
			}

			const contentArray = Array.from(uniqueContent.values())
			logAlways(`Found ${contentArray.length} unique documents for patterns`)

			return contentArray.join('\n\n')
		} catch (error) {
			logErrorAlways('Error fetching content by path patterns:', error)
			return ''
		}
	}

	/**
	 * Wrapper for ContentDbService.searchContent that searches the content_distilled table
	 */
	static async searchDistilledContent(searchQuery: string): Promise<DbContentDistilled | null> {
		try {
			// Use the generic searchContent method with the content_distilled table
			return await ContentDbService.searchContent(searchQuery, 'content_distilled')
		} catch (error) {
			logErrorAlways(`Failed to search distilled content for "${searchQuery}":`, error)
			throw new Error(
				`Failed to search distilled content: ${error instanceof Error ? error.message : String(error)}`
			)
		}
	}

	static async searchAllDistilledContent(
		searchQuery: string,
		limit: number = 50
	): Promise<DbContentDistilled[]> {
		try {
			const lowerQuery = searchQuery.toLowerCase()

			// Combine all search types into one query with UNION
			const combinedQueryStr = `
				-- Exact title matches first
				(SELECT * FROM content_distilled 
				WHERE LOWER(metadata->>'title') = $1
				ORDER BY path
				LIMIT $2)
				
				UNION
				
				-- Then partial title matches
				(SELECT * FROM content_distilled 
				WHERE LOWER(metadata->>'title') LIKE $3
					AND LOWER(metadata->>'title') != $1
				ORDER BY path
				LIMIT $2)
				
				UNION
				
				-- Finally path matches
				(SELECT * FROM content_distilled 
				WHERE LOWER(path) LIKE $3
					AND (metadata->>'title' IS NULL OR LOWER(metadata->>'title') NOT LIKE $3)
				ORDER BY path
				LIMIT $2)
				
				ORDER BY path
				LIMIT $2
			`

			const params = [lowerQuery, limit, `%${lowerQuery}%`]

			const result = await query(combinedQueryStr, params)

			return result.rows as DbContentDistilled[]
		} catch (error) {
			logErrorAlways(`Failed to search all distilled content for "${searchQuery}":`, error)
			throw new Error(
				`Failed to search distilled content: ${error instanceof Error ? error.message : String(error)}`
			)
		}
	}

	static async getDistilledDocumentationSections(
		minContentLength: number = 100
	): Promise<Array<{ path: string; metadata: Record<string, unknown>; content: string }>> {
		try {
			const sectionsQueryStr = `
				SELECT path, metadata, content
				FROM content_distilled 
				WHERE LENGTH(content) >= $1
				ORDER BY path
			`

			const result = await query(sectionsQueryStr, [minContentLength])

			return result.rows.map((row) => ({
				path: row.path,
				metadata: row.metadata,
				content: row.content
			}))
		} catch (error) {
			logErrorAlways('Failed to get distilled documentation sections:', error)
			throw new Error(
				`Failed to get distilled sections: ${error instanceof Error ? error.message : String(error)}`
			)
		}
	}

	static async deleteContentDistilled(path: string): Promise<boolean> {
		try {
			const result = await query('DELETE FROM content_distilled WHERE path = $1', [path])
			return (result.rowCount ?? 0) > 0
		} catch (error) {
			logErrorAlways(`Failed to delete distilled content ${path}:`, error)
			throw new Error(
				`Failed to delete distilled content: ${error instanceof Error ? error.message : String(error)}`
			)
		}
	}

	static async batchUpsertContentDistilled(
		contents: CreateContentDistilledInput[]
	): Promise<DbContentDistilled[]> {
		try {
			const results: DbContentDistilled[] = []

			// Process in chunks to avoid overwhelming the database
			const chunkSize = 100
			for (let i = 0; i < contents.length; i += chunkSize) {
				const chunk = contents.slice(i, i + chunkSize)

				const chunkResults = await Promise.all(
					chunk.map((content) => ContentDistilledDbService.upsertContentDistilled(content))
				)

				results.push(...chunkResults)
			}

			logAlways(`Batch upserted ${results.length} distilled content items`)
			return results
		} catch (error) {
			logErrorAlways('Failed to batch upsert distilled content:', error)
			throw new Error(
				`Failed to batch upsert distilled content: ${error instanceof Error ? error.message : String(error)}`
			)
		}
	}

	static async cleanupUnusedEntries(currentPaths: string[]): Promise<number> {
		try {
			if (currentPaths.length === 0) {
				// If no current paths, delete all entries
				const result = await query('DELETE FROM content_distilled')
				const deletedCount = result.rowCount ?? 0
				logAlways(`Cleaned up all ${deletedCount} unused distilled content entries`)
				return deletedCount
			}

			// Delete entries that are not in the current paths list
			const placeholders = currentPaths.map((_, index) => `$${index + 1}`).join(', ')
			const result = await query(
				`DELETE FROM content_distilled WHERE path NOT IN (${placeholders})`,
				currentPaths
			)

			const deletedCount = result.rowCount ?? 0
			logAlways(`Cleaned up ${deletedCount} unused distilled content entries`)
			return deletedCount
		} catch (error) {
			logErrorAlways('Failed to cleanup unused distilled content entries:', error)
			throw new Error(
				`Failed to cleanup distilled content: ${error instanceof Error ? error.message : String(error)}`
			)
		}
	}

	static async getContentDistilledStats(): Promise<{
		total_files: number
		total_size_bytes: number
		last_updated: Date | null
	}> {
		try {
			const result = await query(
				`SELECT 
					COUNT(*) as total_files,
					COALESCE(SUM(size_bytes), 0) as total_size_bytes,
					MAX(updated_at) as last_updated
				FROM content_distilled`
			)

			return {
				total_files: parseInt(result.rows[0].total_files),
				total_size_bytes: parseInt(result.rows[0].total_size_bytes),
				last_updated: result.rows[0].last_updated
			}
		} catch (error) {
			logErrorAlways('Failed to get distilled content stats:', error)
			throw new Error(
				`Failed to get distilled stats: ${error instanceof Error ? error.message : String(error)}`
			)
		}
	}
}
