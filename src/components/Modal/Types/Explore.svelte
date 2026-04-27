<script>
	import { cursor } from '@sudoku/stores/cursor';
	import { explore } from '../../../stores/explore.js';
	import game from '@sudoku/game';

	export let data = {};
	export let hideModal;

	$: candidates = game.getCandidates($cursor.y, $cursor.x);
	$: state = $explore;

	function tryCandidate(value) {
		game.exploreGuess({ row: $cursor.y, col: $cursor.x, value });
	}

	function resetExplore() {
		game.resetExplore();
	}

	function commitExplore() {
		if (game.commitExplore()) {
			hideModal();
		}
	}

	function discardExplore() {
		game.discardExplore();
		hideModal();
	}
</script>

<h1 class="text-3xl font-semibold mb-5 leading-none">{data.title || 'Explore'}</h1>

<p class="text-lg mb-4">Try values on the current cell, then roll back quickly if the branch fails.</p>

<div class="mb-4">
	<div class="font-semibold mb-2">Current cell</div>
	<div>({$cursor.y + 1}, {$cursor.x + 1})</div>
</div>

<div class="mb-4">
	<div class="font-semibold mb-2">Available candidates</div>
	{#if candidates.length > 0}
		<div class="candidate-grid">
			{#each candidates as value}
				<button class="btn btn-small" on:click={() => tryCandidate(value)}>{value}</button>
			{/each}
		</div>
	{:else}
		<div class="text-gray-600">No candidates are available for this cell.</div>
	{/if}
</div>

{#if state.active}
	<div class="mb-4 p-3 rounded bg-gray-100">
		<div class="font-semibold">Explore status</div>
		<div>Depth: {state.depth}</div>
		{#if state.failed}
			<div class="text-red-600">Failed: {state.reason}</div>
		{:else}
			<div class="text-green-700">This branch is still valid.</div>
		{/if}
	</div>
{/if}

<div class="flex flex-wrap justify-end gap-2">
	<button class="btn btn-small" on:click={resetExplore}>Back to start</button>
	<button class="btn btn-small" disabled={state.failed} on:click={commitExplore}>Commit</button>
	<button class="btn btn-small btn-primary" on:click={discardExplore}>Discard</button>
</div>

<style>
	.candidate-grid {
		@apply flex flex-wrap gap-2;
	}
</style>