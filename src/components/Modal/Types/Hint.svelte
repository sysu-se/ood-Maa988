<script>
	import { cursor } from '@sudoku/stores/cursor';
	import { userGrid } from '@sudoku/stores/grid';
	import game from '@sudoku/game';

	export let data = {};
	export let hideModal;

	$: hintInfo = $userGrid ? game.getHintInfo($cursor.y, $cursor.x) : null;
	$: candidateHint = hintInfo ? hintInfo.candidates : [];
</script>

<h1 class="text-3xl font-semibold mb-5 leading-none">{data.title || '候选提示'}</h1>

{#if hintInfo}
    <p class="text-lg mb-4">Current cell: ({$cursor.y + 1}, {$cursor.x + 1})</p>
{:else}
    <p class="text-lg mb-4">No hint is available for the current cell.</p>
{/if}

<div class="mb-5">
	<div class="font-semibold mb-2">Candidates for this cell</div>
	{#if candidateHint.length > 0}
		<div class="candidate-list">{candidateHint.join(', ')}</div>
	{:else}
		<div class="text-gray-600">This cell is already filled or has no legal candidates.</div>
	{/if}
</div>

<div class="mb-5">
	<div class="font-semibold mb-2">Reason</div>
	{#if hintInfo}
		<div class="text-gray-800 mb-2">{hintInfo.reason}</div>
	{:else}
		<div class="text-gray-600">No reason is available.</div>
	{/if}
</div>

<div class="flex justify-end space-x-3">
	<button class="btn btn-small" on:click={hideModal}>Close</button>
</div>

<style>
	.candidate-list {
		@apply text-lg tracking-wide;
	}
</style>