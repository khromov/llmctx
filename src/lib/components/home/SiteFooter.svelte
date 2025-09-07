<script lang="ts">
</script>

<footer class="site-footer">
	<div class="footer-content">
		<div class="footer-decoration"></div>
		<p class="footer-text">
			Crafted by <a href="https://khromov.se" target="_blank" rel="noopener noreferrer"
				>Stanislav Khromov</a
			>
			<span class="separator">•</span>
			Inspired by
			<a href="https://twitter.com/didiercatz" target="_blank" rel="noopener noreferrer"
				>Didier Catz</a
			>
		</p>
		<div class="footer-meta">
			<span>Built with Svelte 5 & SvelteKit</span>
		</div>
	</div>
</footer>

<style>
	@import url('/src/app.css');

	.site-footer {
		position: relative;
		padding: var(--space-4xl) 0;
		margin-top: var(--space-4xl);
		background: linear-gradient(180deg, transparent 0%, var(--color-parchment) 100%);
	}

	.footer-content {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 var(--space-xl);
		text-align: center;
		position: relative;
	}

	.footer-decoration {
		position: absolute;
		top: 0;
		left: 50%;
		transform: translateX(-50%);
		width: 100px;
		height: 1px;
		background: linear-gradient(90deg, transparent 0%, var(--color-stone) 50%, transparent 100%);
		opacity: 0.4;
	}

	.footer-text {
		font-size: var(--text-base);
		color: var(--color-charcoal);
		margin: var(--space-xl) 0 var(--space-sm) 0;
		font-weight: 400;
	}

	.footer-text a {
		color: var(--color-sage-dark);
		text-decoration: none;
		font-weight: 500;
		position: relative;
		transition: color 0.3s var(--ease-out-expo);
	}

	.footer-text a::after {
		content: '';
		position: absolute;
		bottom: -2px;
		left: 0;
		width: 0;
		height: 1px;
		background: var(--color-rust);
		transition: width 0.3s var(--ease-out-expo);
	}

	.footer-text a:hover {
		color: var(--color-rust);
	}

	.footer-text a:hover::after {
		width: 100%;
	}

	.separator {
		display: inline-block;
		margin: 0 var(--space-sm);
		color: var(--color-stone);
		opacity: 0.5;
	}

	.footer-meta {
		font-size: var(--text-sm);
		color: var(--color-stone);
		margin-top: var(--space-sm);
		font-style: italic;
	}

	@media (max-width: 768px) {
		.site-footer {
			padding: var(--space-3xl) 0;
			margin-top: var(--space-3xl);
		}

		.footer-content {
			padding: 0 var(--space-lg);
		}

		.footer-text {
			font-size: var(--text-sm);
		}

		.separator {
			display: block;
			margin: var(--space-xs) 0;
		}
	}
</style>
