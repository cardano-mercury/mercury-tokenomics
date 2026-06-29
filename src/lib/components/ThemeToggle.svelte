<script lang="ts">
	import { onMount } from 'svelte';
	import { Moon, Sun } from 'lucide-svelte';

	let theme = $state<'light' | 'dark'>('light');

	onMount(() => {
		const saved = localStorage.getItem('theme');
		if (saved === 'dark' || saved === 'light') {
			theme = saved;
		} else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
			theme = 'dark';
		}
		document.documentElement.setAttribute('data-theme', theme);
	});

	function toggle() {
		theme = theme === 'dark' ? 'light' : 'dark';
		localStorage.setItem('theme', theme);
		document.documentElement.setAttribute('data-theme', theme);
	}
</script>

<button
	onclick={toggle}
	class="flex h-10 w-10 items-center justify-center rounded-full text-ink-400 hover:bg-ink-100"
	aria-label="Toggle dark mode"
>
	{#if theme === 'dark'}
		<Sun size={20} />
	{:else}
		<Moon size={20} />
	{/if}
</button>
