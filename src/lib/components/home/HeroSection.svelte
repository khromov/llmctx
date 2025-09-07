<script lang="ts">
	let { isOldHost = false }: { isOldHost?: boolean } = $props()
</script>

<header class="hero" class:rounded-top={isOldHost}>
	<div class="hero-background">
		<div class="organic-blob blob-1"></div>
		<div class="organic-blob blob-2"></div>
		<div class="organic-blob blob-3"></div>
	</div>

	<div class="hero-content">
		<div class="hero-badge">
			<svg
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
			>
				<path d="M12 2L2 7L12 12L22 7L12 2Z" />
				<path d="M2 17L12 22L22 17" />
				<path d="M2 12L12 17L22 12" />
			</svg>
			<span>Documentation Toolkit</span>
		</div>

		<h1 class="hero-title">
			<span class="title-line">Svelte & SvelteKit</span>
			<span class="title-accent">documentation</span>
			<span class="title-sub">for the modern developer</span>
		</h1>

		<p class="hero-description">
			Connect your AI coding assistant to living documentation through our
			<strong>Model Context Protocol</strong> server, or download curated presets in llms.txt format.
			Crafted for developers who value clarity and efficiency.
		</p>

		<div class="hero-meta">
			<div class="meta-item">
				<svg
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<circle cx="12" cy="12" r="10" />
					<path d="M12 6v6l4 2" />
				</svg>
				<span>Updated hourly from official sources</span>
			</div>
			<div class="meta-item">
				<svg
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<path d="M13 2L3 14h9l-1 8l10-12h-9l1-8z" />
				</svg>
				<span>Optimized for AI assistants</span>
			</div>
		</div>
	</div>
</header>

<style>
	@import url('/src/app.css');

	.hero {
		position: relative;
		padding: var(--space-4xl) 0 var(--space-3xl) 0;
		overflow: hidden;
		background: linear-gradient(135deg, var(--color-paper) 0%, var(--color-parchment) 100%);
		margin: 0 0 var(--space-3xl) 0;
		border-bottom: 1px solid rgba(139, 109, 71, 0.1);
	}

	.hero.rounded-top {
		border-radius: 24px;
		margin: var(--space-lg) var(--space-lg) var(--space-3xl) var(--space-lg);
	}

	.hero-background {
		position: absolute;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
	}

	.organic-blob {
		position: absolute;
		border-radius: 50%;
		filter: blur(40px);
		opacity: 0.15;
		animation: blob-float 30s infinite ease-in-out;
	}

	.blob-1 {
		width: 600px;
		height: 600px;
		background: radial-gradient(circle, var(--color-sage) 0%, transparent 70%);
		top: -200px;
		right: -100px;
		animation-duration: 25s;
	}

	.blob-2 {
		width: 400px;
		height: 400px;
		background: radial-gradient(circle, var(--color-rust) 0%, transparent 70%);
		bottom: -150px;
		left: -50px;
		animation-duration: 30s;
		animation-delay: -10s;
	}

	.blob-3 {
		width: 300px;
		height: 300px;
		background: radial-gradient(circle, var(--color-clay) 0%, transparent 70%);
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		animation-duration: 35s;
		animation-delay: -5s;
	}

	@keyframes blob-float {
		0%,
		100% {
			transform: translate(0, 0) scale(1);
		}
		33% {
			transform: translate(30px, -30px) scale(1.1);
		}
		66% {
			transform: translate(-20px, 20px) scale(0.95);
		}
	}

	.hero-content {
		position: relative;
		max-width: 900px;
		margin: 0 auto;
		padding: 0 var(--space-xl);
		z-index: 1;
	}

	.hero-badge {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-xs) var(--space-md);
		background: var(--color-cream);
		border: 1px solid rgba(107, 124, 91, 0.2);
		border-radius: 100px;
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--color-sage-dark);
		margin-bottom: var(--space-xl);
		animation: fade-in-up 0.8s var(--ease-out-expo) both;
	}

	.hero-badge svg {
		flex-shrink: 0;
		stroke: var(--color-sage);
	}

	.hero-title {
		font-family: var(--font-serif);
		font-size: var(--text-5xl);
		font-weight: 400;
		line-height: 1.1;
		margin: 0 0 var(--space-xl) 0;
		color: var(--color-ink);
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.title-line {
		display: block;
		animation: fade-in-up 0.8s var(--ease-out-expo) 0.1s both;
	}

	.title-accent {
		display: block;
		font-style: italic;
		color: var(--color-rust);
		animation: fade-in-up 0.8s var(--ease-out-expo) 0.2s both;
	}

	.title-sub {
		display: block;
		font-family: var(--font-sans);
		font-size: var(--text-xl);
		font-weight: 300;
		color: var(--color-stone);
		margin-top: var(--space-sm);
		animation: fade-in-up 0.8s var(--ease-out-expo) 0.3s both;
	}

	.hero-description {
		font-size: var(--text-lg);
		line-height: 1.7;
		color: var(--color-charcoal);
		margin: 0 0 var(--space-xl) 0;
		max-width: 720px;
		animation: fade-in-up 0.8s var(--ease-out-expo) 0.4s both;
	}

	.hero-description strong {
		font-weight: 600;
		color: var(--color-sage-dark);
		position: relative;
		white-space: nowrap;
	}

	.hero-description strong::after {
		content: '';
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 2px;
		background: var(--color-sage);
		opacity: 0.3;
		transform: scaleX(0);
		transform-origin: left;
		transition: transform 0.3s var(--ease-out-expo);
	}

	.hero:hover .hero-description strong::after {
		transform: scaleX(1);
	}

	.hero-meta {
		display: flex;
		gap: var(--space-xl);
		flex-wrap: wrap;
		animation: fade-in-up 0.8s var(--ease-out-expo) 0.5s both;
	}

	.meta-item {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: var(--text-sm);
		color: var(--color-stone);
	}

	.meta-item svg {
		flex-shrink: 0;
		stroke: var(--color-sage);
	}

	@keyframes fade-in-up {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (max-width: 768px) {
		.hero {
			padding: var(--space-3xl) 0 var(--space-2xl) 0;
			margin: 0 0 var(--space-2xl) 0;
		}

		.hero.rounded-top {
			border-radius: 20px;
			margin: var(--space-md) var(--space-md) var(--space-2xl) var(--space-md);
		}

		.hero-content {
			padding: 0 var(--space-lg);
		}

		.hero-title {
			font-size: var(--text-4xl);
		}

		.title-sub {
			font-size: var(--text-lg);
		}

		.hero-description {
			font-size: var(--text-base);
		}

		.hero-meta {
			gap: var(--space-lg);
		}

		.organic-blob {
			filter: blur(60px);
		}
	}
</style>
