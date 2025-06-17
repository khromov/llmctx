import { error } from '@sveltejs/kit'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async () => {
	const summaryPath = 'outputs/svelte-summary-latest.txt'

	try {
		if (!existsSync(summaryPath)) {
			throw error(404, 'Summary file not found. Run the summary generation process first.')
		}

		const content = await readFile(summaryPath, 'utf-8')

		return new Response(content, {
			status: 200,
			headers: {
				'Content-Type': 'text/plain; charset=utf-8'
			}
		})
	} catch (e) {
		console.error('Error serving summary:', e)
		throw error(500, `Failed to serve summary: ${e instanceof Error ? e.message : String(e)}`)
	}
}
