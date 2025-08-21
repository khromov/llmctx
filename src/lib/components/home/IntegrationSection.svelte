<script lang="ts">
	let { siteUrl }: { siteUrl: string } = $props()

	const instructions = [
		{
			title: 'Cursor',
			description: 'Cursor supports adding context via URL using the Paste Links feature.',
			descriptionLinkText: 'Paste Links',
			descriptionLinkUrl: 'https://docs.cursor.com/context/@-symbols/@-link#paste-links',
			command: `@${siteUrl}/[preset]`
		},
		{
			title: 'Zed',
			description: 'You can use this project directly in Zed using a /fetch command.',
			descriptionLinkText: '/fetch command',
			descriptionLinkUrl: 'https://zed.dev/docs/assistant/commands',
			command: `/fetch ${siteUrl}/[preset]`
		},
		{
			title: 'cURL',
			description: `Let's be real—if you clicked this, you probably already know how to use cURL. But if you don't, here's a quick example:`,
			command: `curl ${siteUrl}/[preset] -o context.txt`
		}
	]
</script>

<section class="integration-section">
	<div class="section-header">
		<h2>AI Assistant Integration</h2>
		<p class="section-description">
			Multiple ways to use these presets with your favorite AI coding assistants
		</p>
	</div>

	<div class="integration-grid">
		{#each instructions as { title, description, descriptionLinkText, descriptionLinkUrl, command }}
			<div class="integration-card">
				<h3>{title}</h3>
				<p>
					{#if descriptionLinkText && descriptionLinkUrl}
						{description.split(descriptionLinkText)[0]}<a
							href={descriptionLinkUrl}
							target="_blank"
							rel="noopener noreferrer">{descriptionLinkText}</a
						>{description.split(descriptionLinkText)[1] || ''}
					{:else}
						{description}
					{/if}
				</p>
				<div class="code-block">
					<code>{command}</code>
				</div>
			</div>
		{/each}
	</div>
</section>

<style>
	.integration-section {
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

	.integration-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 16px;
	}

	.integration-card {
		background: white;
		border-radius: 12px;
		padding: 24px;
		box-shadow:
			0 4px 24px rgba(0, 0, 0, 0.04),
			0 2px 8px rgba(0, 0, 0, 0.06);
		border: 1px solid rgba(0, 0, 0, 0.06);
		transition: all 0.3s ease;
	}

	.integration-card:hover {
		transform: translateY(-4px);
		box-shadow:
			0 8px 32px rgba(0, 0, 0, 0.08),
			0 4px 16px rgba(0, 0, 0, 0.08);
	}

	.integration-card h3 {
		font-size: 18px;
		font-weight: 600;
		margin: 0 0 10px 0;
		color: #1d1d1f;
	}

	.integration-card p {
		font-size: 16px;
		color: #6e6e73;
		margin: 0 0 16px 0;
		line-height: 1.5;
	}

	.integration-card a {
		color: #007aff;
		text-decoration: none;
	}

	.integration-card a:hover {
		color: #0056b3;
		text-decoration: underline;
	}

	.integration-card .code-block {
		background: #f5f5f7;
		color: #1d1d1f;
		border: 1px solid rgba(0, 0, 0, 0.08);
		position: static;
		padding: 12px;
		font-family:
			'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
		font-size: 13px;
		border-radius: 8px;
	}

	.integration-card .code-block code {
		color: #1d1d1f;
		display: block;
		word-break: break-all;
	}

	@media (max-width: 768px) {
		.integration-grid {
			grid-template-columns: 1fr;
			gap: 16px;
		}

		.integration-card {
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
