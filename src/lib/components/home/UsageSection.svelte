<script lang="ts">
	let { siteUrl }: { siteUrl: string } = $props()
</script>

<section class="usage-section">
	<div class="section-header">
		<h2>Direct URL Access</h2>
		<p class="section-description">
			Alternative method: Access documentation presets directly via URL for manual download or
			integration.
		</p>
	</div>

	<div class="usage-grid">
		<div class="usage-card">
			<h3>Single preset</h3>
			<div class="code-block">
				<code>{siteUrl}/</code><code class="highlight">[preset]</code>
			</div>
			<a href="/svelte-complete-medium" class="example-link">View example →</a>
		</div>

		<div class="usage-card">
			<h3>Multiple presets</h3>
			<div class="code-block">
				<code>{siteUrl}/</code><code class="highlight">svelte,sveltekit,svelte-cli</code>
			</div>
			<a href="/svelte,sveltekit,svelte-cli" class="example-link">View example →</a>
		</div>
	</div>
</section>

<style>
	.usage-section {
		margin-bottom: 40px;
	}

	.section-header {
		margin-bottom: 16px;
		padding-top: 12px;
	}

	.section-header h2 {
		font-size: 24px;
		font-weight: 700;
		margin: 0 0 8px 0;
		color: #1d1d1f;
		letter-spacing: -0.01em;
		position: relative;
		padding-bottom: 6px;
	}

	.section-header h2::after {
		content: '';
		position: absolute;
		bottom: 0;
		left: 0;
		width: 60px;
		height: 3px;
		background: linear-gradient(90deg, #ff3e00 0%, #ff6b35 100%);
		border-radius: 2px;
	}

	.section-description {
		font-size: 16px;
		color: #6e6e73;
		margin: 0;
		line-height: 1.5;
		max-width: 600px;
	}

	.usage-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 16px;
	}

	.usage-card {
		background: white;
		border-radius: 12px;
		padding: 24px;
		box-shadow:
			0 4px 24px rgba(0, 0, 0, 0.04),
			0 2px 8px rgba(0, 0, 0, 0.06);
		border: 1px solid rgba(0, 0, 0, 0.06);
		transition: all 0.3s ease;
	}

	.usage-card:hover {
		transform: translateY(-4px);
		box-shadow:
			0 8px 32px rgba(0, 0, 0, 0.08),
			0 4px 16px rgba(0, 0, 0, 0.08);
	}

	.usage-card h3 {
		font-size: 18px;
		font-weight: 600;
		margin: 0 0 12px 0;
		color: #1d1d1f;
	}

	.usage-card .code-block {
		background: #f5f5f7;
		border: 1px solid rgba(0, 0, 0, 0.08);
		margin: 12px 0;
		position: static;
		padding: 12px;
		font-family:
			'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
		font-size: 13px;
		border-radius: 8px;
	}

	.usage-card .code-block code {
		color: #1d1d1f;
		display: inline;
		word-break: break-all;
	}

	.usage-card .code-block .highlight {
		color: #007aff;
		font-weight: 600;
	}

	.example-link {
		color: #007aff;
		text-decoration: none;
		font-weight: 500;
		font-size: 14px;
		display: inline-flex;
		align-items: center;
		transition: color 0.2s ease;
	}

	.example-link:hover {
		color: #0056b3;
	}

	@media (max-width: 768px) {
		.usage-grid {
			grid-template-columns: 1fr;
			gap: 16px;
		}

		.usage-card {
			padding: 24px;
		}

		.section-header h2 {
			font-size: 24px;
		}

		.section-description {
			font-size: 16px;
		}
	}
</style>
