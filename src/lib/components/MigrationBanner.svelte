<script lang="ts">
	let { show = false }: { show: boolean } = $props()
</script>

{#if show}
	<div class="migration-banner">
		<div class="banner-content">
			<div class="banner-message">
				<div class="banner-icon">🚀</div>
				<div class="banner-text">
					<p class="banner-title">We've moved to a new domain!</p>
					<p class="banner-description">
						This site is now available at <a
							href="https://svelte-llm.stanislav.garden"
							class="domain-link"><strong>svelte-llm.stanislav.garden</strong></a
						>. The old URL will continue to work, but please update your bookmarks and integrations.
					</p>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.migration-banner {
		background: #fefefe;
		color: #374151;
		padding: 16px 0;
		position: relative;
		z-index: 100;
		border-bottom: 2px solid #dc2626;
		box-shadow: 0 2px 8px rgba(220, 38, 38, 0.1);
	}

	.banner-content {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 24px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.banner-message {
		display: flex;
		align-items: center;
		gap: 16px;
		flex: 1;
	}

	.banner-icon {
		font-size: 24px;
		line-height: 1;
		flex-shrink: 0;
	}

	.banner-text {
		flex: 1;
	}

	.banner-title {
		margin: 0 0 4px 0;
		font-size: 16px;
		font-weight: 600;
		line-height: 1.3;
		color: #1f2937;
	}

	.banner-description {
		margin: 0;
		font-size: 14px;
		line-height: 1.4;
		color: #4b5563;
	}

	.domain-link {
		color: #dc2626;
		text-decoration: none;
		transition: all 0.2s ease;
	}

	.domain-link:hover {
		color: #b91c1c;
		text-decoration: underline;
	}

	.domain-link strong {
		font-weight: 600;
	}

	@media (max-width: 768px) {
		.banner-content {
			padding: 0 16px;
		}

		.banner-message {
			gap: 12px;
			justify-content: center;
		}

		.banner-icon {
			font-size: 20px;
		}

		.banner-title {
			font-size: 15px;
		}

		.banner-description {
			font-size: 13px;
		}

		.banner-text {
			text-align: center;
		}
	}

	@media (max-width: 580px) {
		.migration-banner {
			padding: 12px 0;
		}

		.banner-message {
			flex-direction: column;
			align-items: center;
			gap: 8px;
		}

		.banner-text {
			text-align: center;
		}
	}
</style>
