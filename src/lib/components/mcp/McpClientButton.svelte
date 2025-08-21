<script lang="ts">
	let {
		id,
		name,
		icon,
		isActive,
		onclick
	}: {
		id: string
		name: string
		icon: string
		isActive: boolean
		onclick: () => void
	} = $props()
</script>

<button class="client-button" class:active={isActive} {onclick}>
	<span class="client-icon">{icon}</span>
	<span class="client-name">{name}</span>
</button>

<style>
	.client-button {
		background: #f5f5f7;
		border: 2px solid rgba(0, 0, 0, 0.08);
		border-radius: 12px;
		padding: 16px 12px;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		text-align: center;
	}

	.client-button:hover {
		background: #eef7ff;
		border-color: #007aff;
		transform: translateY(-2px);
		box-shadow: 0 4px 16px rgba(0, 122, 255, 0.15);
	}

	.client-button.active {
		background: #007aff;
		border-color: #007aff;
		color: white;
		transform: translateY(-2px);
		box-shadow: 0 4px 16px rgba(0, 122, 255, 0.3);
	}

	.client-icon {
		font-size: 24px;
		line-height: 1;
	}

	.client-name {
		font-weight: 600;
		font-size: 14px;
	}
</style>
