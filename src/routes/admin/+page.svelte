<script lang="ts">
	import { onMount } from 'svelte'

	let secretKey = $state('')

	const endpoints = {
		sync: '/api/sync-content',
		'update-distilled': '/api/update-distilled',
		'heap-snapshot': '/api/heap-snapshot',
		'memory-status': '/api/memory-status'
	}

	// Load secret key from localStorage on mount
	onMount(() => {
		const saved = localStorage.getItem('admin-secret-key')
		if (saved) {
			secretKey = saved
		}
	})

	// Save to localStorage whenever secretKey changes
	$effect(() => {
		if (typeof window !== 'undefined') {
			if (secretKey.trim()) {
				localStorage.setItem('admin-secret-key', secretKey)
			} else {
				localStorage.removeItem('admin-secret-key')
			}
		}
	})

	function buildUrl(basePath: string): string {
		if (!secretKey.trim()) {
			return '#'
		}
		return `${basePath}${basePath.includes('?') ? '&' : '?'}secret_key=${encodeURIComponent(secretKey)}`
	}

	function getDisplayText(basePath: string): string {
		if (!secretKey.trim()) {
			return `${basePath}?secret_key=...`
		}
		return buildUrl(basePath)
	}
</script>

<svelte:head>
	<title>Admin Panel - llmctx</title>
</svelte:head>

<main>
	<div class="header">
		<h1>🔧 llmctx Admin Panel</h1>
		<p>Management interface for content sync, distillation, and system operations</p>
	</div>

	<div class="secret-input">
		<label for="secretKey">Secret Key:</label>
		<input
			type="password"
			id="secretKey"
			bind:value={secretKey}
			placeholder="Enter your secret key to enable admin endpoints..."
			autocomplete="off"
		/>
	</div>

	<!-- Content Management -->
	<section class="section">
		<h3>📚 Content Management</h3>

		<div class="endpoint-group">
			<div class="endpoint" class:disabled={!secretKey.trim()}>
				<span class="method">GET</span>
				<a href={buildUrl(endpoints['sync'])}>{getDisplayText(endpoints['sync'])}</a>
				<span class="description"
					>Sync sveltejs/svelte.dev repository content (always includes cleanup and stats)</span
				>
			</div>

			<div class="endpoint">
				<span class="method">GET</span>
				<a href="/api/content-status">/api/content-status</a>
				<span class="description">View content statistics and repository info</span>
			</div>

			<div class="endpoint">
				<span class="method">GET</span>
				<a href="/content">/content</a>
				<span class="description">Compare original vs distilled content</span>
			</div>
		</div>
	</section>

	<!-- Distillation -->
	<section class="section">
		<h3>🔮 AI Distillation</h3>

		<div class="endpoint-group">
			<div class="endpoint" class:disabled={!secretKey.trim()}>
				<span class="method">GET</span>
				<a href={buildUrl(endpoints['update-distilled'])}
					>{getDisplayText(endpoints['update-distilled'])}</a
				>
				<span class="description">Run AI distillation process (expensive operation)</span>
			</div>
		</div>
	</section>

	<!-- System Operations -->
	<section class="section">
		<h3>⚙️ System Operations</h3>

		<div class="endpoint-group">
			<div class="endpoint">
				<span class="method">GET</span>
				<a href="/api/migrate">/api/migrate</a>
				<span class="description">Run database migrations</span>
			</div>

			<div class="endpoint">
				<span class="method">GET</span>
				<a href="/api/content-status">/api/content-status</a>
				<span class="description">Check content table status</span>
			</div>

			<div class="endpoint">
				<span class="method">GET</span>
				<a href="/api/scheduler-status">/api/scheduler-status</a>
				<span class="description">Check background scheduler status</span>
			</div>

			<div class="endpoint">
				<span class="method">GET</span>
				<a href="/api/memory-status">/api/memory-status</a>
				<span class="description">View current memory usage and system statistics</span>
			</div>

			<div class="endpoint" class:disabled={!secretKey.trim()}>
				<span class="method">GET</span>
				<a href={buildUrl(endpoints['heap-snapshot'])}
					>{getDisplayText(endpoints['heap-snapshot'])}</a
				>
				<span class="description">Generate V8 heap snapshot for memory analysis</span>
			</div>
		</div>
	</section>
</main>

<style>
	main {
		max-width: 1200px;
		margin: 0 auto;
		padding: 20px;
		background: #f8fafc;
		color: #1a202c;
		min-height: 100vh;
	}

	.header {
		background: linear-gradient(135deg, #ff3e00 0%, #ff6b35 100%);
		color: white;
		padding: 20px;
		border-radius: 12px;
		margin-bottom: 30px;
		text-align: center;
	}

	.header h1 {
		margin: 0 0 8px 0;
		font-size: 28px;
		font-weight: 700;
	}

	.header p {
		margin: 0;
		opacity: 0.9;
		font-size: 16px;
	}

	.secret-input {
		background: white;
		border-radius: 12px;
		padding: 20px;
		margin-bottom: 30px;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
	}

	.secret-input label {
		display: block;
		font-weight: 600;
		margin-bottom: 8px;
		color: #2d3748;
	}

	.secret-input input {
		width: 100%;
		padding: 12px;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		font-size: 14px;
		font-family: 'Monaco', 'Menlo', monospace;
	}

	.secret-input input:focus {
		outline: none;
		border-color: #ff3e00;
		box-shadow: 0 0 0 3px rgba(255, 62, 0, 0.1);
	}

	.section {
		background: white;
		border-radius: 12px;
		padding: 20px;
		margin-bottom: 20px;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
	}

	.section h3 {
		margin: 0 0 15px 0;
		color: #2d3748;
		border-bottom: 2px solid #e2e8f0;
		padding-bottom: 8px;
		font-size: 18px;
		font-weight: 600;
	}

	.endpoint-group {
		margin-bottom: 20px;
	}

	.endpoint-group:last-child {
		margin-bottom: 0;
	}

	.endpoint {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px;
		background: #f7fafc;
		border-radius: 8px;
		margin-bottom: 8px;
		transition: all 0.2s ease;
	}

	.endpoint:last-child {
		margin-bottom: 0;
	}

	.endpoint:hover {
		background: #edf2f7;
	}

	.endpoint a {
		color: #ff3e00;
		text-decoration: none;
		font-family: 'Monaco', 'Menlo', monospace;
		font-size: 13px;
		flex: 1;
		word-break: break-all;
	}

	.endpoint a:hover {
		color: #cc3300;
		text-decoration: underline;
	}

	.endpoint .description {
		font-size: 12px;
		color: #718096;
		flex: 1;
	}

	.method {
		background: #48bb78;
		color: white;
		padding: 4px 8px;
		border-radius: 4px;
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		min-width: 45px;
		text-align: center;
	}

	.disabled {
		opacity: 0.5;
		pointer-events: none;
	}

	@media (max-width: 768px) {
		main {
			padding: 16px;
		}

		.header {
			padding: 16px;
		}

		.header h1 {
			font-size: 24px;
		}

		.section {
			padding: 16px;
		}

		.endpoint {
			flex-direction: column;
			align-items: flex-start;
			gap: 8px;
		}

		.endpoint a {
			word-break: break-all;
		}
	}
</style>
