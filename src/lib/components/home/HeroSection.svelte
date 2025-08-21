<script lang="ts">
	let { isOldHost = false }: { isOldHost?: boolean } = $props()
</script>

<header class="hero" class:rounded-top={isOldHost}>
	<div class="hero-content">
		<div class="logo">svelte-llm</div>
		<h1>Svelte & SvelteKit documentation for AI assistants</h1>
		<p class="hero-description">
			Connect your AI coding assistant directly to up-to-date Svelte 5 and SvelteKit documentation
			via this <strong>Model Context Protocol (MCP) server</strong>, or download preset
			documentation in llms.txt format and add the docs to your context.
		</p>
		<p class="hero-note">
			Documentation is automatically fetched from the <a
				target="_blank"
				href="https://github.com/sveltejs/svelte.dev/tree/main/apps/svelte.dev/content"
				>official documentation</a
			> source on GitHub and updated hourly.
		</p>
	</div>
</header>

<style>
	.hero {
		text-align: center;
		padding: 60px 0 40px 0;
		background: linear-gradient(135deg, #ff3e00 0%, #ff6b35 100%);
		color: white;
		margin: 0 0 30px 0;
		border-radius: 0 0 20px 20px;
	}

	.hero.rounded-top {
		border-radius: 20px 20px 20px 20px;
	}

	.hero-content {
		max-width: 800px;
		margin: 0 auto;
		padding: 0 24px;
	}

	.logo {
		font-size: 18px;
		font-weight: 600;
		letter-spacing: 0.5px;
		text-transform: uppercase;
		opacity: 0.9;
		margin-bottom: 16px;
	}

	.hero h1 {
		font-size: clamp(32px, 5vw, 48px);
		font-weight: 700;
		line-height: 1.2;
		margin: 0 0 24px 0;
		letter-spacing: -0.02em;
	}

	.hero-description {
		font-size: 20px;
		line-height: 1.5;
		margin: 0 0 20px 0;
		opacity: 0.95;
		font-weight: 400;
	}

	.hero-note {
		font-size: 16px;
		opacity: 0.8;
		margin: 0;
		font-weight: 400;
	}

	.hero-note a {
		color: rgba(255, 255, 255, 0.9);
		text-decoration: underline;
		text-decoration-color: rgba(255, 255, 255, 0.5);
		transition: text-decoration-color 0.2s ease;
	}

	.hero-note a:hover {
		text-decoration-color: rgba(255, 255, 255, 1);
	}

	@media (max-width: 768px) {
		.hero {
			border-radius: 0;
			margin: 0 -16px 40px -16px;
			padding: 60px 0 40px 0;
		}

		.hero.rounded-top {
			border-radius: 20px 20px 20px 20px;
			margin: 0 8px 40px 8px;
		}

		.hero-content {
			padding: 0 16px;
		}

		.hero h1 {
			font-size: 28px;
		}

		.hero-description {
			font-size: 18px;
		}
	}
</style>
