<script lang="ts">
	import type { PageData } from './$types'
	import { cleanDocumentationPath } from '$lib/utils/pathUtils'

	let { data }: { data: PageData } = $props()

	// State for expand/collapse all functionality
	let expandedItems = $state<Set<string>>(new Set())
	let allExpanded = $state(false)

	// Helper functions
	function formatBytes(bytes: number): string {
		if (bytes === 0) return '0 B'
		const k = 1024
		const sizes = ['B', 'KB', 'MB']
		const i = Math.floor(Math.log(bytes) / Math.log(k))
		return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
	}

	function formatPercentage(ratio: number): string {
		return (ratio * 100).toFixed(1) + '%'
	}

	function formatCompressionRatio(ratio: number): string {
		const reduction = (1 - ratio) * 100
		return reduction.toFixed(1) + '% smaller'
	}

	function toggleItem(path: string): void {
		if (expandedItems.has(path)) {
			expandedItems.delete(path)
		} else {
			expandedItems.add(path)
		}
		expandedItems = new Set(expandedItems) // Trigger reactivity
	}

	function expandAll(): void {
		expandedItems = new Set(data.comparisons.map((comp) => comp.path))
		allExpanded = true
	}

	function collapseAll(): void {
		expandedItems.clear()
		expandedItems = new Set(expandedItems) // Trigger reactivity
		allExpanded = false
	}

	// Update allExpanded state when individual items change
	$effect(() => {
		allExpanded = expandedItems.size === data.comparisons.length && data.comparisons.length > 0
	})
</script>

<svelte:head>
	<title>Content Comparison - Admin</title>
</svelte:head>

<main class="admin-main">
	<div class="header">
		<h1>📊 Content Comparison</h1>
		<p>Compare original documentation with AI-distilled versions</p>
	</div>

	{#if data.error}
		<div class="error-card">
			<h3>❌ Error Loading Data</h3>
			<p>{data.error}</p>
		</div>
	{:else if data.comparisons.length === 0}
		<div class="empty-state">
			<h3>📭 No Comparisons Available</h3>
			<p>No matching content found between the content and content_distilled tables.</p>
			<p>Make sure both tables contain data and run the distillation process.</p>
		</div>
	{:else}
		<!-- Stats Summary -->
		<div class="stats-card">
			<h3>📈 Summary Statistics</h3>
			<div class="stats-grid">
				<div class="stat-item">
					<span class="stat-label">Total Comparisons</span>
					<span class="stat-value">{data.stats.totalComparisons}</span>
				</div>
				<div class="stat-item">
					<span class="stat-label">Average Compression</span>
					<span class="stat-value"
						>{formatCompressionRatio(data.stats.averageCompressionRatio)}</span
					>
				</div>
				<div class="stat-item">
					<span class="stat-label">Total Size Saved</span>
					<span class="stat-value">{formatBytes(data.stats.totalSizeSaved)}</span>
				</div>
				<div class="stat-item">
					<span class="stat-label">Original Total</span>
					<span class="stat-value">{formatBytes(data.stats.originalTotalSize)}</span>
				</div>
				<div class="stat-item">
					<span class="stat-label">Distilled Total</span>
					<span class="stat-value">{formatBytes(data.stats.distilledTotalSize)}</span>
				</div>
			</div>
		</div>

		<!-- Controls -->
		<div class="controls">
			<button class="btn btn-primary" onclick={expandAll} disabled={allExpanded}>
				📖 Expand All
			</button>
			<button class="btn btn-secondary" onclick={collapseAll} disabled={expandedItems.size === 0}>
				📕 Collapse All
			</button>
			<span class="controls-info">
				{expandedItems.size} of {data.comparisons.length} expanded
			</span>
		</div>

		<!-- Comparison Items -->
		<div class="comparisons-list">
			{#each data.comparisons as comparison (comparison.path)}
				{@const isExpanded = expandedItems.has(comparison.path)}
				{@const cleanPath = cleanDocumentationPath(comparison.path)}

				<div class="comparison-item">
					<button
						class="comparison-header"
						class:expanded={isExpanded}
						onclick={() => toggleItem(comparison.path)}
					>
						<div class="header-content">
							<span class="expand-icon">{isExpanded ? '▼' : '▶'}</span>
							<div class="path-info">
								<h4>{cleanPath}</h4>
								<span class="path-detail">{comparison.path}</span>
							</div>
							<div class="size-info">
								<span class="size-comparison">
									{formatBytes(comparison.original?.size_bytes || 0)} → {formatBytes(
										comparison.distilled?.size_bytes || 0
									)}
								</span>
								<span class="compression-ratio">
									{formatCompressionRatio(comparison.compressionRatio)}
								</span>
							</div>
						</div>
					</button>

					{#if isExpanded}
						<div class="comparison-content">
							<div class="content-grid">
								<!-- Original Content -->
								<div class="content-section">
									<div class="content-header">
										<h5>📄 Original Content</h5>
										<div class="content-meta">
											<span>{formatBytes(comparison.original?.size_bytes || 0)}</span>
											<span
												>{new Date(
													comparison.original?.updated_at || ''
												).toLocaleDateString()}</span
											>
										</div>
									</div>
									<div class="content-body">
										<pre class="content-text">{comparison.original?.content ||
												'No content available'}</pre>
									</div>
								</div>

								<!-- Distilled Content -->
								<div class="content-section">
									<div class="content-header">
										<h5>🔮 Distilled Content</h5>
										<div class="content-meta">
											<span>{formatBytes(comparison.distilled?.size_bytes || 0)}</span>
											<span
												>{new Date(
													comparison.distilled?.updated_at || ''
												).toLocaleDateString()}</span
											>
										</div>
									</div>
									<div class="content-body">
										<pre class="content-text">{comparison.distilled?.content ||
												'No content available'}</pre>
									</div>
								</div>
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</main>

<style>
	.admin-main {
		max-width: 1400px;
		margin: 0 auto;
		padding: 20px;
		background: #f8fafc;
		min-height: 100vh;
	}

	.header {
		background: linear-gradient(135deg, #4c51bf 0%, #667eea 100%);
		color: white;
		padding: 24px;
		border-radius: 12px;
		margin-bottom: 24px;
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

	.error-card,
	.empty-state {
		background: white;
		border-radius: 12px;
		padding: 24px;
		text-align: center;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
	}

	.error-card {
		border-left: 4px solid #ef4444;
	}

	.empty-state {
		border-left: 4px solid #f59e0b;
	}

	.stats-card {
		background: white;
		border-radius: 12px;
		padding: 24px;
		margin-bottom: 24px;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
	}

	.stats-card h3 {
		margin: 0 0 16px 0;
		color: #374151;
		font-size: 18px;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 16px;
	}

	.stat-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 16px;
		background: #f9fafb;
		border-radius: 8px;
		border: 1px solid #e5e7eb;
	}

	.stat-label {
		font-size: 12px;
		color: #6b7280;
		text-transform: uppercase;
		font-weight: 600;
		margin-bottom: 4px;
	}

	.stat-value {
		font-size: 20px;
		font-weight: 700;
		color: #374151;
	}

	.controls {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 24px;
		flex-wrap: wrap;
	}

	.btn {
		padding: 10px 16px;
		border: none;
		border-radius: 8px;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-primary {
		background: #4c51bf;
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background: #4338ca;
		transform: translateY(-1px);
	}

	.btn-secondary {
		background: #6b7280;
		color: white;
	}

	.btn-secondary:hover:not(:disabled) {
		background: #4b5563;
		transform: translateY(-1px);
	}

	.controls-info {
		color: #6b7280;
		font-size: 14px;
		font-weight: 500;
	}

	.comparisons-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.comparison-item {
		background: white;
		border-radius: 12px;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
		overflow: hidden;
	}

	.comparison-header {
		width: 100%;
		background: none;
		border: none;
		padding: 20px;
		cursor: pointer;
		transition: background-color 0.2s ease;
		text-align: left;
	}

	.comparison-header:hover {
		background: #f9fafb;
	}

	.comparison-header.expanded {
		background: #f3f4f6;
		border-bottom: 1px solid #e5e7eb;
	}

	.header-content {
		display: flex;
		align-items: center;
		gap: 16px;
	}

	.expand-icon {
		font-size: 14px;
		color: #6b7280;
		min-width: 16px;
	}

	.path-info {
		flex: 1;
		min-width: 0;
	}

	.path-info h4 {
		margin: 0 0 4px 0;
		font-size: 16px;
		font-weight: 600;
		color: #374151;
	}

	.path-detail {
		font-size: 12px;
		color: #6b7280;
		font-family: 'Monaco', 'Menlo', monospace;
	}

	.size-info {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 4px;
	}

	.size-comparison {
		font-size: 14px;
		color: #374151;
		font-weight: 600;
		font-family: 'Monaco', 'Menlo', monospace;
	}

	.compression-ratio {
		font-size: 12px;
		color: #059669;
		font-weight: 600;
	}

	.comparison-content {
		border-top: 1px solid #e5e7eb;
	}

	.content-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1px;
		background: #e5e7eb;
	}

	.content-section {
		background: white;
	}

	.content-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px 20px;
		background: #f9fafb;
		border-bottom: 1px solid #e5e7eb;
	}

	.content-header h5 {
		margin: 0;
		font-size: 14px;
		font-weight: 600;
		color: #374151;
	}

	.content-meta {
		display: flex;
		gap: 12px;
		font-size: 12px;
		color: #6b7280;
	}

	.content-body {
		padding: 20px;
		max-height: 600px;
		overflow-y: auto;
	}

	.content-text {
		margin: 0;
		font-size: 12px;
		line-height: 1.5;
		color: #374151;
		white-space: pre-wrap;
		word-wrap: break-word;
		font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
	}

	@media (max-width: 1024px) {
		.content-grid {
			grid-template-columns: 1fr;
		}

		.header-content {
			flex-direction: column;
			align-items: flex-start;
			gap: 12px;
		}

		.size-info {
			align-items: flex-start;
		}
	}

	@media (max-width: 768px) {
		.admin-main {
			padding: 16px;
		}

		.header {
			padding: 16px;
		}

		.stats-grid {
			grid-template-columns: 1fr;
		}

		.controls {
			flex-direction: column;
			align-items: stretch;
		}

		.btn {
			justify-content: center;
		}
	}
</style>
