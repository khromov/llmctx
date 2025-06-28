import type { PresetConfig } from '$lib/presets'
import { env } from '$env/dynamic/private'
import tarStream from 'tar-stream'
import { Readable } from 'stream'
import { createGunzip } from 'zlib'
import { minimatch } from 'minimatch'
import { getPresetContent } from './presetCache'
import { PresetDbService } from '$lib/server/presetDb'
import { CacheDbService } from '$lib/server/cacheDb'
import { log, logAlways, logErrorAlways } from '$lib/log'

// Database cache service instance
let cacheService: CacheDbService | null = null

function getCacheService(): CacheDbService {
	if (!cacheService) {
		cacheService = new CacheDbService()
	}
	return cacheService
}

function sortFilesWithinGroup(files: string[]): string[] {
	return files.sort((a, b) => {
		const aPath = a.split('\n')[0].replace('## ', '')
		const bPath = b.split('\n')[0].replace('## ', '')

		// Check if one path is a parent of the other
		if (bPath.startsWith(aPath.replace('/index.md', '/'))) return -1
		if (aPath.startsWith(bPath.replace('/index.md', '/'))) return 1

		// If not parent/child relationship, sort by path
		return aPath.localeCompare(bPath)
	})
}

export async function fetchAndProcessMarkdownWithDb(
	preset: PresetConfig,
	presetKey: string
): Promise<string> {
	try {
		// Check database cache first
		const cachedContent = await getPresetContent(presetKey)

		if (cachedContent) {
			logAlways(`Using cached content for ${presetKey} from database`)
			return cachedContent
		}

		// If no cached content, fetch and process the files
		const filesWithPaths = (await fetchMarkdownFiles(preset, true)) as Array<{
			path: string
			content: string
		}>
		const files = filesWithPaths.map((f) => `## ${f.path}\n\n${f.content}`)

		logAlways(`Fetched ${files.length} files for ${presetKey}`)

		// Sort files
		const sortedFiles = sortFilesWithinGroup(files)
		const content = sortedFiles.join('\n\n')

		try {
			// Store preset content in database
			const sizeKb = Math.floor(new TextEncoder().encode(content).length / 1024)

			await PresetDbService.upsertPreset({
				preset_name: presetKey,
				content,
				size_kb: sizeKb,
				document_count: filesWithPaths.length
			})

			logAlways(
				`Stored content for preset ${presetKey} (${sizeKb}KB, ${filesWithPaths.length} files)`
			)
		} catch (dbError) {
			logErrorAlways(`Failed to store data in database for preset ${presetKey}:`, dbError)
			// Don't throw the error - return the content even if DB storage fails
		}

		return content
	} catch (error) {
		logErrorAlways(`Error processing preset ${presetKey}:`, error)
		throw error
	}
}

/**
 * Process multiple presets that share the same repository
 */
export async function fetchAndProcessMultiplePresetsWithDb(
	presets: Array<{ config: PresetConfig; key: string }>
): Promise<Map<string, string>> {
	const results = new Map<string, string>()

	// Group presets by repository
	const presetsByRepo = new Map<string, Array<{ config: PresetConfig; key: string }>>()

	for (const preset of presets) {
		const repoKey = `${preset.config.owner}/${preset.config.repo}`
		const existing = presetsByRepo.get(repoKey) || []
		existing.push(preset)
		presetsByRepo.set(repoKey, existing)
	}

	// Process each repository group
	for (const [repoKey, repoPresets] of presetsByRepo) {
		logAlways(`Processing repository ${repoKey} with ${repoPresets.length} presets`)

		try {
			// Check if all presets in this group have cached content
			const cachedContents = await Promise.all(
				repoPresets.map(async ({ key }) => ({
					key,
					content: await getPresetContent(key)
				}))
			)

			const allCached = cachedContents.every(({ content }) => content !== null)

			if (allCached) {
				// All presets have cached content, use it
				for (const { key, content } of cachedContents) {
					if (content) {
						logAlways(`Using cached content for ${key} from database`)
						results.set(key, content)
					}
				}
				continue
			}

			// At least one preset needs fresh data, fetch the repository once
			const { owner, repo } = repoPresets[0].config
			const tarballBuffer = await fetchRepositoryTarball(owner, repo)

			// Process each preset using the shared tarball
			for (const { config, key } of repoPresets) {
				try {
					const filesWithPaths = (await processMarkdownFromTarball(
						tarballBuffer,
						config,
						true
					)) as { path: string; content: string }[]
					const files = filesWithPaths.map((f) => `## ${f.path}\n\n${f.content}`)

					logAlways(`Processed ${files.length} files for ${key}`)

					// Sort files
					const sortedFiles = sortFilesWithinGroup(files)
					const content = sortedFiles.join('\n\n')

					// Store in results
					results.set(key, content)

					// Store in database
					try {
						const sizeKb = Math.floor(new TextEncoder().encode(content).length / 1024)

						await PresetDbService.upsertPreset({
							preset_name: key,
							content,
							size_kb: sizeKb,
							document_count: filesWithPaths.length
						})

						logAlways(
							`Stored content for preset ${key} (${sizeKb}KB, ${filesWithPaths.length} files)`
						)
					} catch (dbError) {
						logErrorAlways(`Failed to store data in database for preset ${key}:`, dbError)
					}
				} catch (error) {
					logErrorAlways(`Error processing preset ${key}:`, error)
					throw error
				}
			}
		} catch (error) {
			logErrorAlways(`Error processing repository ${repoKey}:`, error)
			throw error
		}
	}

	return results
}

/**
 * Fetch repository tarball with caching
 */
export async function fetchRepositoryTarball(owner: string, repo: string): Promise<Buffer> {
	const cacheKey = `${owner}/${repo}`
	const cache = getCacheService()

	// Check database cache first
	const cachedBuffer = await cache.get(cacheKey)
	if (cachedBuffer) {
		logAlways(`Using cached tarball for ${cacheKey} from database`)
		return cachedBuffer
	}

	// Construct the tarball URL
	const url = `https://api.github.com/repos/${owner}/${repo}/tarball`

	logAlways(`Fetching tarball from: ${url}`)

	// Fetch the tarball
	const response = await fetch(url, {
		headers: {
			Authorization: `Bearer ${env.GITHUB_TOKEN}`,
			Accept: 'application/vnd.github.v3.raw'
		}
	})

	if (!response.ok) {
		throw new Error(`Failed to fetch tarball: ${response.statusText}`)
	}

	if (!response.body) {
		throw new Error('Response body is null')
	}

	// Read the response body into a buffer
	const chunks: Uint8Array[] = []
	const reader = response.body.getReader()

	while (true) {
		const { done, value } = await reader.read()
		if (done) break
		chunks.push(value)
	}

	const buffer = Buffer.concat(chunks)

	// Cache the buffer in database with 60 minutes TTL
	await cache.set(cacheKey, buffer, 60)

	return buffer
}

/**
 * Process markdown files from a tarball buffer
 */
export async function processMarkdownFromTarball(
	tarballBuffer: Buffer,
	config: PresetConfig,
	includePathInfo: boolean
): Promise<string[] | { path: string; content: string }[]> {
	const { glob, ignore = [], minimize = undefined } = config

	// Create a Map to store files for each glob pattern while maintaining order
	const globResults = new Map<string, unknown[]>()
	const filePathsByPattern = new Map<string, string[]>()
	glob.forEach((pattern) => {
		globResults.set(pattern, [])
		filePathsByPattern.set(pattern, [])
	})

	const extractStream = tarStream.extract()

	let processedFiles = 0
	let matchedFiles = 0

	// Process each file in the tarball
	extractStream.on('entry', (header, stream, next) => {
		processedFiles++
		let matched = false

		// Check each glob pattern in order
		for (const pattern of glob) {
			if (shouldIncludeFile(header.name, pattern, ignore)) {
				matched = true
				matchedFiles++

				if (header.type === 'file') {
					let content = ''
					stream.on('data', (chunk) => (content += chunk.toString()))
					stream.on('end', () => {
						// Remove the repo directory prefix and apps/svelte.dev/content
						const cleanPath = header.name
							.split('/')
							.slice(1) // Remove repo directory
							.join('/')
							.replace('apps/svelte.dev/content/', '') // Remove the fixed prefix

						// Minimize the content if needed
						const processedContent = minimizeContent(content, minimize)

						// Store with or without path info based on the parameter
						if (includePathInfo) {
							const files = globResults.get(pattern) || []
							files.push({
								path: cleanPath,
								content: processedContent
							})
							globResults.set(pattern, files)
						} else {
							// Add the file header before the content
							const contentWithHeader = `## ${cleanPath}\n\n${processedContent}`

							// Add to the appropriate glob pattern's results
							const files = globResults.get(pattern) || []
							files.push(contentWithHeader)
							globResults.set(pattern, files)
						}

						// Store the file path for logging
						const paths = filePathsByPattern.get(pattern) || []
						paths.push(cleanPath)
						filePathsByPattern.set(pattern, paths)

						next()
					})
					return // Exit after first match
				}
			}
		}

		if (!matched) {
			stream.resume()
			next()
		}
	})

	// Create streams from the buffer
	const tarballStream = Readable.from(tarballBuffer)
	const gunzipStream = createGunzip()

	// Pipe the tarball stream through gunzip to the extract stream
	tarballStream.pipe(gunzipStream).pipe(extractStream)

	// Wait for the extraction to complete
	await new Promise<void>((resolve) => extractStream.on('finish', resolve))

	logAlways(`Total files processed: ${processedFiles}`)
	logAlways(`Files matching glob: ${matchedFiles}`)
	log('\nFinal file order:')

	// Log files in their final order
	glob.forEach((pattern, index) => {
		const paths = filePathsByPattern.get(pattern) || []
		const sortedPaths = includePathInfo
			? paths
			: sortFilesWithinGroup(paths.map((p) => `## ${p}`)).map((p) => p.replace('## ', ''))

		if (sortedPaths.length > 0) {
			log(`\nGlob pattern ${index + 1}: ${pattern}`)
			sortedPaths.forEach((path, i) => {
				log(`  ${i + 1}. ${path}`)
			})
		}
	})

	// Combine results in the order of glob patterns
	const orderedResults: unknown[] = []
	for (const pattern of glob) {
		const filesForPattern = globResults.get(pattern) || []
		if (includePathInfo) {
			// For path info mode, just add the objects directly
			orderedResults.push(...filesForPattern)
		} else {
			// For normal mode, sort and add strings
			orderedResults.push(...sortFilesWithinGroup(filesForPattern as string[]))
		}
	}

	return orderedResults as string[] | { path: string; content: string }[]
}

function shouldIncludeFile(filename: string, glob: string, ignore: string[] = []): boolean {
	// First check if the file should be ignored
	const shouldIgnore = ignore.some((pattern) => minimatch(filename, pattern))
	if (shouldIgnore) {
		logAlways(`❌ Ignored by pattern: ${filename}`)
		return false
	}

	// Then check if the file matches the specific glob pattern
	return minimatch(filename, glob)
}

// Fetch markdown files using GitHub's tarball API
export async function fetchMarkdownFiles(
	{ owner, repo, glob, ignore = [], minimize = undefined }: PresetConfig,
	includePathInfo = false
): Promise<string[] | { path: string; content: string }[]> {
	// Fetch the tarball
	const tarballBuffer = await fetchRepositoryTarball(owner, repo)

	// Process the tarball
	return processMarkdownFromTarball(
		tarballBuffer,
		{ owner, repo, glob, ignore, minimize, title: '', distilled: false },
		includePathInfo
	)
}

/**
 * Clear repository cache (useful for forcing fresh downloads)
 */
export async function clearRepositoryCache(): Promise<void> {
	const cache = getCacheService()
	await cache.clear()
	logAlways('Repository cache cleared')
}

/**
 * Get repository cache status
 */
export async function getRepositoryCacheStatus(): Promise<{
	size: number
	repositories: string[]
	totalSizeBytes: number
}> {
	const cache = getCacheService()
	const status = await cache.getStatus()
	return {
		size: status.count,
		repositories: status.keys,
		totalSizeBytes: status.totalSizeBytes
	}
}

export interface MinimizeOptions {
	normalizeWhitespace?: boolean
	removeLegacy?: boolean
	removePlaygroundLinks?: boolean
	removePrettierIgnore?: boolean
	removeNoteBlocks?: boolean
	removeDetailsBlocks?: boolean
	removeHtmlComments?: boolean
	removeDiffMarkers?: boolean
}

const defaultOptions: MinimizeOptions = {
	normalizeWhitespace: false,
	removeLegacy: false,
	removePlaygroundLinks: false,
	removePrettierIgnore: true,
	removeNoteBlocks: true,
	removeDetailsBlocks: true,
	removeHtmlComments: false,
	removeDiffMarkers: true
}

function removeQuoteBlocks(content: string, blockType: string): string {
	return content
		.split('\n')
		.reduce((acc: string[], line: string, index: number, lines: string[]) => {
			// If we find a block (with or without additional text), skip it and all subsequent blockquote lines
			if (line.trim().startsWith(`> [!${blockType}]`)) {
				// Skip all subsequent lines that are part of the blockquote
				let i = index
				while (i < lines.length && (lines[i].startsWith('>') || lines[i].trim() === '')) {
					i++
				}
				// Update the index to skip all these lines
				index = i - 1
				return acc
			}

			// Only add the line if it's not being skipped
			acc.push(line)
			return acc
		}, [])
		.join('\n')
}

function removeDiffMarkersFromContent(content: string): string {
	let inCodeBlock = false
	const lines = content.split('\n')
	const processedLines = lines.map((line) => {
		// Track if we're entering or leaving a code block
		// eslint-disable-next-line no-useless-escape
		if (line.trim().startsWith('\`\`\`')) {
			inCodeBlock = !inCodeBlock
			return line
		}

		// Only process lines within code blocks
		if (inCodeBlock) {
			// Handle lines that end with --- or +++ with possible whitespace after
			// eslint-disable-next-line no-useless-escape
			line = line.replace(/(\+{3}|\-{3})[\s]*$/g, '')

			// Handle triple markers at start while preserving indentation
			// This captures the whitespace before the marker and adds it back
			// eslint-disable-next-line no-useless-escape
			line = line.replace(/^(\s*)(\+{3}|\-{3})\s*/g, '$1')

			// Handle single + or - markers at start while preserving indentation
			// eslint-disable-next-line no-useless-escape
			line = line.replace(/^(\s*)[\+\-](\s)/g, '$1')

			// Handle multi-line diff blocks where --- or +++ might be in the middle of line
			// eslint-disable-next-line no-useless-escape
			line = line.replace(/[\s]*(\+{3}|\-{3})[\s]*/g, '')
		}

		return line
	})

	return processedLines.join('\n')
}

export function minimizeContent(content: string, options?: Partial<MinimizeOptions>): string {
	// Merge with defaults, but only for properties that are defined
	const settings: MinimizeOptions = options ? { ...defaultOptions, ...options } : defaultOptions

	let minimized = content

	minimized = minimized.replace(/NOTE: do not edit this file, it is generated in.*$/gm, '')

	if (settings.removeDiffMarkers) {
		minimized = removeDiffMarkersFromContent(minimized)
	}

	if (settings.removeLegacy) {
		minimized = removeQuoteBlocks(minimized, 'LEGACY')
	}

	if (settings.removeNoteBlocks) {
		minimized = removeQuoteBlocks(minimized, 'NOTE')
	}

	if (settings.removeDetailsBlocks) {
		minimized = removeQuoteBlocks(minimized, 'DETAILS')
	}

	if (settings.removePlaygroundLinks) {
		// Replace playground URLs with /[link] but keep the original link text
		minimized = minimized.replace(/\[([^\]]+)\]\(\/playground[^)]+\)/g, '[$1](/REMOVED)')
	}

	if (settings.removePrettierIgnore) {
		minimized = minimized
			.split('\n')
			.filter((line) => line.trim() !== '<!-- prettier-ignore -->')
			.join('\n')
	}

	if (settings.removeHtmlComments) {
		// Replace all HTML comments (including multi-line) with empty string
		minimized = minimized.replace(/<!--[\s\S]*?-->/g, '')
	}

	if (settings.normalizeWhitespace) {
		minimized = minimized.replace(/\s+/g, ' ')
	}

	minimized = minimized.trim()

	//log(`Original content length: ${content.length}`)
	//log(`Minimized content length: ${minimized.length}`)
	//log('Applied minimizations:', Object.keys(settings).join(', '))

	return minimized
}
