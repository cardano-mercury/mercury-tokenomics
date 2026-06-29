<script lang="ts">
	let { href = '/', size = 'md' }: { href?: string; size?: 'md' | 'lg' } = $props();
</script>

<a
	{href}
	class="font-mono font-bold tracking-tight text-mercury {size === 'lg' ? 'text-3xl' : 'text-xl'}"
>
	Mercury
</a>
