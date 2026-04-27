<script>
	import { cursor } from '@sudoku/stores/cursor';
	import { explore } from '../../../stores/explore.js';
	import { SUDOKU_SIZE } from '@sudoku/constants';
	import Cell from '../../Board/Cell.svelte';
	import game from '@sudoku/game';

	export let data = {};
	export let hideModal;

	const rows = Array.from({ length: SUDOKU_SIZE }, (_, index) => index);

	$: state = $explore;
	$: selectedRow = $cursor.y;
	$: selectedCol = $cursor.x;
	$: selectedCandidates = state.active ? game.getCandidates(selectedRow, selectedCol) : [];
	$: selectedIsGiven = Boolean(state.active && state.origin[selectedRow][selectedCol] !== 0);
	$: selectedValue = state.active ? state.current[selectedRow][selectedCol] : 0;
	$: canCommit = Boolean(state.active && !state.failed && state.current.every(row => row.every(value => value !== 0)) && state.invalidCells.length === 0);

	function isInvalidCell(row, col) {
		return Boolean(state.active && state.invalidCells.includes(`${col},${row}`));
	}

	function tryCandidate(value) {
		if (!state.active || state.failed || selectedIsGiven) return;

		game.exploreGuess({ row: selectedRow, col: selectedCol, value });
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

<h1 class="text-3xl font-semibold mb-3 leading-none">{data.title || 'Explore'}</h1>

<p class="text-lg mb-5">Try values in the branch board without touching the main puzzle. If the branch fails, the conflicting cells turn red.</p>

{#if state.active}
	<div class="explore-layout">
		<div class="explore-board-wrap">
			<div class="explore-board" aria-label="Explore Sudoku board">
				{#each rows as row}
					{#each rows as col}
						<Cell
							value={state.current[row][col]}
							cellX={col + 1}
							cellY={row + 1}
							disabled={false}
							userNumber={state.origin[row][col] === 0}
							selected={selectedRow === row && selectedCol === col}
							conflictingNumber={isInvalidCell(row, col)} />
					{/each}
				{/each}
			</div>
		</div>

		<div class="space-y-4">
			<div class="panel">
				<div class="font-semibold mb-2">Branch status</div>
				<div>Depth: {state.depth}</div>
				<div>Selected: ({selectedRow + 1}, {selectedCol + 1})</div>
				<div>Value: {selectedValue || 'empty'}</div>
				{#if state.failed}
					<div class="text-red-600">Failed: {state.reason}</div>
				{:else if canCommit}
					<div class="text-green-700">Solved branch ready to commit.</div>
				{:else}
					<div class="text-gray-700">Branch is still valid.</div>
				{/if}
			</div>

			<div class="panel">
				<div class="font-semibold mb-2">Candidates for selected cell</div>
				{#if selectedIsGiven}
					<div class="text-gray-600">This is a given cell.</div>
				{:else if selectedCandidates.length > 0}
					<div class="candidate-grid">
						{#each selectedCandidates as value}
							<button class="btn btn-small" disabled={state.failed} on:click={() => tryCandidate(value)}>{value}</button>
						{/each}
					</div>
				{:else}
					<div class="text-gray-600">No candidates are available here.</div>
				{/if}
			</div>

			<div class="flex flex-wrap gap-2">
				<button class="btn btn-small" on:click={() => game.undo()} disabled={!state.canUndo || state.failed}>Undo</button>
				<button class="btn btn-small" on:click={() => game.redo()} disabled={!state.canRedo || state.failed}>Redo</button>
				<button class="btn btn-small" on:click={resetExplore}>Back to start</button>
			</div>

			<div class="flex flex-wrap justify-end gap-2">
				<button class="btn btn-small" disabled={!canCommit} on:click={commitExplore}>Commit</button>
				<button class="btn btn-small btn-primary" on:click={discardExplore}>Discard</button>
			</div>
		</div>
	</div>
{:else}
	<div class="panel">Explore mode is not active.</div>
{/if}

<style>
	.explore-layout {
		@apply grid gap-5;
		grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
	}

	@media (max-width: 900px) {
		.explore-layout {
			grid-template-columns: minmax(0, 1fr);
		}
	}

	.explore-board-wrap {
		@apply p-3 rounded bg-white border border-gray-200;
	}

	.explore-board {
		@apply grid;
		grid-template-columns: repeat(9, minmax(0, 1fr));
		grid-template-rows: repeat(9, minmax(0, 1fr));
		aspect-ratio: 1;
	}

	.panel {
		@apply p-3 rounded bg-gray-100;
	}

	.candidate-grid {
		@apply flex flex-wrap gap-2;
	}
</style>