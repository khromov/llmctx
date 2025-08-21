import { error } from '@sveltejs/kit'
import { readFile } from 'fs/promises'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ url }) => {
	try {
		const version = url.searchParams.get('version')
		let filename

		if (version) {
			filename = `outputs/svelte-summary-${version}.md`
		} else {
			filename = `outputs/svelte-summary-latest.md`
		}

		const content = await readFile(filename, 'utf-8')

		return new Response(content, {
			status: 200,
			headers: {
				'Content-Type': 'text/plain; charset=utf-8'
			}
		})
	} catch (e) {
		console.error('Error reading summary file:', e)
		error(
			404,
			`Summary file not found: ${e instanceof Error ? e.message : String(e)}. Make sure to run the summary generation process first.`
		)
	}
}
