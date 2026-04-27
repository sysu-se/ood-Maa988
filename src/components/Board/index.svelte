<script>
	import { BOX_SIZE } from '@sudoku/constants';
	import { SUDOKU_SIZE } from '@sudoku/constants';
	import { gamePaused } from '@sudoku/stores/game';
	import { grid, userGrid, invalidCells } from '@sudoku/stores/grid';
	import { settings } from '@sudoku/stores/settings';
	import { cursor } from '@sudoku/stores/cursor';
	import { explore } from '../../stores/explore.js';
	import { candidates } from '@sudoku/stores/candidates';
	import { notes } from '@sudoku/stores/notes';
	import { modal } from '@sudoku/stores/modal';
	import game from '@sudoku/game';
	import Cell from './Cell.svelte';

	const rows = Array.from({ length: SUDOKU_SIZE }, (_, index) => index);

	function isSelected(cursorStore, x, y) {
		return cursorStore.x === x && cursorStore.y === y;
	}

	function isSameArea(cursorStore, x, y) {
		if (cursorStore.x === null && cursorStore.y === null) return false;
		if (cursorStore.x === x || cursorStore.y === y) return true;

		const cursorBoxX = Math.floor(cursorStore.x / BOX_SIZE);
		const cursorBoxY = Math.floor(cursorStore.y / BOX_SIZE);
		const cellBoxX = Math.floor(x / BOX_SIZE);
		const cellBoxY = Math.floor(y / BOX_SIZE);
		return (cursorBoxX === cellBoxX && cursorBoxY === cellBoxY);
	}

	function getValueAtCursor(gridStore, cursorStore) {
		if (cursorStore.x === null && cursorStore.y === null) return null;

		return gridStore[cursorStore.y][cursorStore.x];
	}

	function isExploreInvalid(state, row, col) {
		return Boolean(state.active && state.invalidCells.includes(`${col},${row}`));
	}

	function showExploreTip() {
		modal.show('hint', { title: '探索提示', mode: 'candidates' });
	}

	function toggleExploreNotes() {
		notes.toggle();
	}
</script>

<div class="board-padding relative z-10">
	<div class="max-w-xl relative">
		<div class="w-full" style="padding-top: 100%"></div>
	</div>
	<div class="board-padding absolute inset-0 flex justify-center">
		<div class="relative w-full h-full max-w-xl">
			<div class="bg-white shadow-2xl rounded-xl overflow-hidden w-full h-full max-w-xl grid" class:bg-gray-200={$gamePaused} class:opacity-30={$explore.active} class:pointer-events-none={$explore.active}>

				{#each $userGrid as row, y}
					{#each row as value, x}
						<Cell {value}
						      cellY={y + 1}
						      cellX={x + 1}
						      candidates={$candidates[x + ',' + y]}
						      disabled={$gamePaused}
						      selected={isSelected($cursor, x, y)}
						      userNumber={$grid[y][x] === 0}
						      sameArea={$settings.highlightCells && !isSelected($cursor, x, y) && isSameArea($cursor, x, y)}
						      sameNumber={$settings.highlightSame && value && !isSelected($cursor, x, y) && getValueAtCursor($userGrid, $cursor) === value}
						      conflictingNumber={$settings.highlightConflicting && $grid[y][x] === 0 && $invalidCells.includes(x + ',' + y)} />
					{/each}
				{/each}

			</div>

			{#if $explore.active}
				<div class="explore-overlay">
					<div class="explore-panel">
						<div class="explore-header">
							<div>
								<div class="text-sm uppercase tracking-wide text-gray-500">Explore Mode</div>
								<div class="text-xl font-semibold">分支棋盘</div>
							</div>
							<div class="text-right text-sm text-gray-600">
								<div>Depth: {$explore.depth}</div>
								<div>Selected: ({$cursor.y + 1}, {$cursor.x + 1})</div>
							</div>
						</div>

							<div class="explore-tools">
								<button class="btn btn-small" on:click={showExploreTip}>提示</button>
								<button class="btn btn-small relative" on:click={toggleExploreNotes} title={`Notes (${ $notes ? 'ON' : 'OFF' })`}>
									笔记
									<span class="badge badge-mini" class:badge-primary={$notes}>{$notes ? 'ON' : 'OFF'}</span>
								</button>
							</div>

						<div class="explore-board-wrap">
							<div class="explore-board" aria-label="Explore Sudoku board">
								{#each rows as row}
									{#each rows as col}
										<Cell
											value={$explore.current[row][col]}
											cellX={col + 1}
											cellY={row + 1}
												candidates={$explore.current[row][col] === 0 ? $candidates[col + ',' + row] : undefined}
											disabled={false}
											userNumber={$explore.origin[row][col] === 0}
											selected={isSelected($cursor, col, row)}
											sameArea={$settings.highlightCells && !isSelected($cursor, col, row) && isSameArea($cursor, col, row)}
											sameNumber={$settings.highlightSame && $explore.current[row][col] && !isSelected($cursor, col, row) && getValueAtCursor($explore.current, $cursor) === $explore.current[row][col]}
											conflictingNumber={$settings.highlightConflicting && isExploreInvalid($explore, row, col)} />
									{/each}
								{/each}
							</div>
						</div>

						{#if $explore.failed}
							<div class="explore-message text-red-600">{$explore.reason}</div>
						{/if}

						<div class="explore-actions">
							<button class="btn btn-small" on:click={() => game.undo()} disabled={!$explore.canUndo}>撤销</button>
							<button class="btn btn-small" on:click={() => game.redo()} disabled={!$explore.canRedo}>重做</button>
							<button class="btn btn-small" on:click={() => game.resetExplore()}>回到初态</button>
							<button class="btn btn-small" on:click={() => game.commitExplore()} disabled={$explore.failed}>保存</button>
							<button class="btn btn-small btn-primary" on:click={() => game.discardExplore()}>退出探索</button>
						</div>
					</div>
				</div>
			{/if}
		</div>

	</div>
</div>

<style>
	.board-padding {
		@apply px-4 pb-4;
	}

	.explore-overlay {
		@apply absolute inset-0 flex items-center justify-center p-4;
		background: rgba(15, 23, 42, 0.35);
	}

	.explore-panel {
		@apply w-full max-w-lg bg-white rounded-2xl shadow-2xl p-4;
	}

	.explore-header {
		@apply flex items-start justify-between gap-4 mb-3;
	}

	.explore-tools {
		@apply flex flex-wrap items-center gap-2 mb-3;
	}

	.explore-board-wrap {
		@apply p-2 rounded-xl border border-gray-200 bg-white;
	}

	.explore-board {
		@apply grid;
		grid-template-columns: repeat(9, minmax(0, 1fr));
		grid-template-rows: repeat(9, minmax(0, 1fr));
		aspect-ratio: 1;
	}

	.explore-message {
		@apply mt-3 text-sm;
	}

	.explore-actions {
		@apply mt-4 flex flex-wrap justify-end gap-2;
	}

	.badge-mini {
		min-height: 18px;
		min-width: 18px;
		@apply p-1 rounded-full leading-none text-center text-xs text-white bg-gray-600 inline-block absolute top-0 left-0;
	}
</style>