import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'

const origin = process.argv[2] || 'http://localhost:3000'
const SESSION_COUNT = parseInt(process.argv[3]) || 10000
const BATCH_SIZE = 100

// Parse command line flags
const args = process.argv.slice(2)
const enableMemoryMonitoring = args.includes('--memory')
const triggerSnapshot = args.includes('--snapshot')
const secretKeyIndex = args.indexOf('--secret-key')
const secretKey =
	secretKeyIndex !== -1 && secretKeyIndex + 1 < args.length ? args[secretKeyIndex + 1] : 'secret'

if (triggerSnapshot && !secretKey) {
	console.error('❌ --secret-key is required when using --snapshot flag')
	process.exit(1)
}

async function getMemoryStatus(origin) {
	try {
		const url = new URL('/api/memory-status', origin)

		const response = await fetch(url)
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`)
		}

		return await response.json()
	} catch (error) {
		console.warn(`⚠️  Failed to get memory status: ${error.message}`)
		return null
	}
}

async function triggerHeapSnapshot(origin, secretKey) {
	try {
		const url = new URL('/api/heap-snapshot', origin)
		url.searchParams.set('secret_key', secretKey)

		const response = await fetch(url)
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`)
		}

		return await response.json()
	} catch (error) {
		console.warn(`⚠️  Failed to trigger heap snapshot: ${error.message}`)
		return null
	}
}

function formatBytes(bytes) {
	if (bytes === 0) return '0 B'
	const k = 1024
	const sizes = ['B', 'KB', 'MB', 'GB']
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function displayMemoryStatus(status, label) {
	if (!status) return

	const mem = status.process.memory
	console.log(`\n💾 ${label}:`)
	console.log(`  Heap Used: ${mem.heapUsedFormatted} (${mem.heapUsagePercentage}%)`)
	console.log(`  Heap Total: ${mem.heapTotalFormatted}`)
	console.log(`  RSS: ${mem.rssFormatted}`)
	console.log(`  External: ${mem.externalFormatted}`)

	if (status.system) {
		console.log(
			`  System Free: ${status.system.freeFormatted} (${(100 - parseFloat(status.system.usedPercentage)).toFixed(1)}%)`
		)
	}
}

async function createSession(id, origin) {
	const startTime = Date.now()
	try {
		const transport = new SSEClientTransport(new URL(`${origin}/mcp/sse`))

		const client = new Client(
			{
				name: `stress-test-client-${id}`,
				version: '1.0.0'
			},
			{
				capabilities: {
					prompts: {},
					resources: {},
					tools: {}
				}
			}
		)

		await client.connect(transport)
		const connectTime = Date.now() - startTime

		const capabilities = client.getServerCapabilities()
		const tools = await client.listTools()

		// Call the list_sections tool to test functionality
		let sectionsResult = null
		try {
			const sectionsResponse = await client.callTool({
				name: 'list_sections',
				arguments: {}
			})
			const sectionsText = sectionsResponse.content?.[0]?.text || 'No response'
			// Count the number of sections in the response
			const sectionCount = (sectionsText.match(/\* title:/g) || []).length
			sectionsResult = `Found ${sectionCount} documentation sections`
		} catch (error) {
			sectionsResult = `List sections failed: ${error.message}`
		}

		return {
			id,
			status: 'connected',
			connectTime,
			toolCount: tools.tools?.length || 0,
			sectionsResult,
			client
		}
	} catch (error) {
		return {
			id,
			status: 'failed',
			error: error.message,
			connectTime: Date.now() - startTime
		}
	}
}

async function runStressTest() {
	console.log(`🚀 Starting stress test with ${SESSION_COUNT} sessions to ${origin}`)
	console.log(`Batching ${BATCH_SIZE} connections at a time...`)

	if (enableMemoryMonitoring) {
		console.log(`💾 Memory monitoring enabled`)
	}
	if (triggerSnapshot) {
		console.log(`📸 Heap snapshot will be triggered at completion`)
	}
	console.log()

	// Get initial memory baseline if monitoring is enabled
	let initialMemory = null
	if (enableMemoryMonitoring) {
		initialMemory = await getMemoryStatus(origin)
		displayMemoryStatus(initialMemory, 'Initial Memory Status')
	}

	const results = []
	const startTime = Date.now()

	for (let i = 0; i < SESSION_COUNT; i += BATCH_SIZE) {
		const batchStart = i
		const batchEnd = Math.min(i + BATCH_SIZE, SESSION_COUNT)
		const batchSize = batchEnd - batchStart

		console.log(
			`Starting batch ${Math.floor(i / BATCH_SIZE) + 1}: sessions ${batchStart + 1}-${batchEnd}`
		)

		const batchPromises = []
		for (let j = batchStart; j < batchEnd; j++) {
			batchPromises.push(createSession(j + 1, origin))
		}

		const batchResults = await Promise.all(batchPromises)
		results.push(...batchResults)

		const connected = batchResults.filter((r) => r.status === 'connected').length
		const failed = batchResults.filter((r) => r.status === 'failed').length
		console.log(`  ✓ Batch complete: ${connected} connected, ${failed} failed`)
	}

	// Get peak memory usage after all connections are established
	let peakMemory = null
	if (enableMemoryMonitoring) {
		peakMemory = await getMemoryStatus(origin)
		displayMemoryStatus(peakMemory, 'Peak Memory Status (All Connections Active)')
	}

	const totalTime = Date.now() - startTime

	const connected = results.filter((r) => r.status === 'connected')
	const failed = results.filter((r) => r.status === 'failed')

	console.log('\n📊 STRESS TEST RESULTS')
	console.log('══════════════════════')
	console.log(`Total Sessions: ${SESSION_COUNT}`)
	console.log(
		`✅ Connected: ${connected.length} (${((connected.length / SESSION_COUNT) * 100).toFixed(1)}%)`
	)
	console.log(
		`❌ Failed: ${failed.length} (${((failed.length / SESSION_COUNT) * 100).toFixed(1)}%)`
	)
	console.log(`⏱️  Total Time: ${(totalTime / 1000).toFixed(2)}s`)

	// Add memory summary if monitoring was enabled
	if (enableMemoryMonitoring && initialMemory && peakMemory) {
		const initialHeap = initialMemory.process.memory.heapUsed
		const peakHeap = peakMemory.process.memory.heapUsed
		const heapGrowth = peakHeap - initialHeap

		console.log(
			`💾 Memory Usage: ${formatBytes(initialHeap)} → ${formatBytes(peakHeap)} (+${formatBytes(heapGrowth)})`
		)
	}

	if (connected.length > 0) {
		const avgConnectTime = connected.reduce((acc, r) => acc + r.connectTime, 0) / connected.length
		const minConnectTime = Math.min(...connected.map((r) => r.connectTime))
		const maxConnectTime = Math.max(...connected.map((r) => r.connectTime))

		console.log('\n⚡ Connection Times:')
		console.log(`  Average: ${avgConnectTime.toFixed(0)}ms`)
		console.log(`  Min: ${minConnectTime}ms`)
		console.log(`  Max: ${maxConnectTime}ms`)

		const toolCounts = [...new Set(connected.map((r) => r.toolCount))]
		if (toolCounts.length === 1) {
			console.log(`\n🔧 Tools Available: ${toolCounts[0]}`)
		} else {
			console.log(`\n🔧 Tools Available: varies (${toolCounts.join(', ')})`)
		}

		// Show list_sections test results
		const sectionsSuccesses = connected.filter(
			(r) => r.sectionsResult && !r.sectionsResult.startsWith('List sections failed')
		).length
		console.log(`\n📚 List Sections Tool Tests:`)
		console.log(`  Successful: ${sectionsSuccesses}/${connected.length}`)
		if (sectionsSuccesses < connected.length) {
			const sampleFailure = connected.find((r) =>
				r.sectionsResult?.startsWith('List sections failed')
			)
			if (sampleFailure) {
				console.log(`  Sample failure: ${sampleFailure.sectionsResult}`)
			}
		}
	}

	if (failed.length > 0) {
		console.log('\n⚠️  Failed Sessions:')
		const errorTypes = {}
		failed.forEach((r) => {
			errorTypes[r.error] = (errorTypes[r.error] || 0) + 1
		})
		Object.entries(errorTypes).forEach(([error, count]) => {
			console.log(`  ${count}x: ${error}`)
		})
	}

	console.log('\n🧹 Cleaning up connections...')
	let closeCount = 0
	for (const result of connected) {
		try {
			await result.client.close()
			closeCount++
			if (closeCount % 20 === 0) {
				process.stdout.write(`  Closed ${closeCount}/${connected.length} sessions\r`)
			}
		} catch {
			// Ignore connection close errors
		}
	}
	console.log(`  ✓ Closed ${closeCount}/${connected.length} sessions    `)

	// Get final memory status after cleanup
	let finalMemory = null
	if (enableMemoryMonitoring) {
		finalMemory = await getMemoryStatus(origin)
		displayMemoryStatus(finalMemory, 'Final Memory Status (After Cleanup)')

		// Display memory analysis
		if (initialMemory && peakMemory && finalMemory) {
			console.log('\n📈 MEMORY ANALYSIS')
			console.log('══════════════════')

			const initialHeap = initialMemory.process.memory.heapUsed
			const peakHeap = peakMemory.process.memory.heapUsed
			const finalHeap = finalMemory.process.memory.heapUsed

			const heapGrowth = peakHeap - initialHeap
			const heapLeak = finalHeap - initialHeap

			console.log(`Initial Heap: ${formatBytes(initialHeap)}`)
			console.log(`Peak Heap: ${formatBytes(peakHeap)} (+${formatBytes(heapGrowth)})`)
			console.log(
				`Final Heap: ${formatBytes(finalHeap)} (${heapLeak >= 0 ? '+' : ''}${formatBytes(heapLeak)})`
			)

			if (heapLeak > heapGrowth * 0.1) {
				console.log(`⚠️  Potential memory leak detected: ${formatBytes(heapLeak)} not freed`)
			} else {
				console.log(`✅ Memory cleanup looks good`)
			}
		}
	}

	// Trigger heap snapshot if requested
	if (triggerSnapshot) {
		console.log('\n📸 Triggering heap snapshot...')
		const snapshot = await triggerHeapSnapshot(origin, secretKey)
		if (snapshot) {
			console.log(`✅ Heap snapshot created: ${snapshot.snapshot.filename}`)
			console.log(`   Size: ${snapshot.snapshot.sizeFormatted}`)
			console.log(`   Path: ${snapshot.snapshot.path}`)
		}
	}

	console.log('\n✨ Stress test complete!')
	process.exit(failed.length > SESSION_COUNT * 0.1 ? 1 : 0)
}

runStressTest().catch((error) => {
	console.error('Fatal error:', error)
	process.exit(1)
})
