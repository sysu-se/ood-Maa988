<script>
	import { hints } from '@sudoku/stores/hints';
	import { userGrid } from '@sudoku/stores/grid';
	import { cursor } from '@sudoku/stores/cursor';
	import { notes } from '@sudoku/stores/notes';
	import { settings } from '@sudoku/stores/settings';
	import { keyboardDisabled } from '@sudoku/stores/keyboard';
	import { modal } from '@sudoku/stores/modal';
	import { gamePaused } from '../../../stores/game.js';
	import game from '@sudoku/game';

	$: hintsAvailable = $hints > 0;
	$: undoAvailable = Boolean($userGrid) && game.canUndo();
	$: redoAvailable = Boolean($userGrid) && game.canRedo();
	$: hintInfo = $userGrid ? game.getHintInfo($cursor.y, $cursor.x) : null;
	$: canApplySelectedHint = Boolean(hintInfo && hintInfo.canApply);

	function showCandidateHint() {
		if (!$keyboardDisabled) {
			modal.show('hint', { title: '候选提示', mode: 'candidates' });
		}
	}

	function applySelectedHint() {
		if (canApplySelectedHint) {
			game.applyHint($cursor.y, $cursor.x);
		}
	}

	function enterExplore() {
		if ($gamePaused) return;

		if (!game.isExploreActive()) {
			game.startExplore();
		}

		if (game.isExploreActive()) {
			modal.show('explore');
		}
	}
</script>

<div class="action-buttons space-x-3">

	<button class="btn btn-round" disabled={$gamePaused || !undoAvailable} on:click={() => game.undo()} title="Undo">
		<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
		</svg>
	</button>

	<button class="btn btn-round" disabled={$gamePaused || !redoAvailable} on:click={() => game.redo()} title="Redo">
		<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10h-10a8 8 90 00-8 8v2M21 10l-6 6m6-6l-6-6" />
		</svg>
	</button>

	<button class="btn btn-round btn-badge" disabled={$keyboardDisabled} on:click={showCandidateHint} title="候选提示">
		<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
		</svg>

		<span class="badge" class:badge-primary={hintsAvailable}>{$hints === Infinity ? '∞' : $hints}</span>
	</button>

	<button class="btn btn-round" disabled={$keyboardDisabled || !hintsAvailable || !canApplySelectedHint} on:click={applySelectedHint} title="直接填写答案">
		<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
		</svg>
	</button>

	<button class="btn btn-round" disabled={$gamePaused} on:click={enterExplore} title="进入探索模式">
		<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.27L16.18 7.9l-.9 5.77L11 17.27l-4.28-3.6L5.82 7.9 11 5.27zm0 13.46l7.73-4.15 1.47-9.44L11 1.73 1.8 5.14l1.47 9.44L11 18.73z" />
		</svg>
	</button>

	<button class="btn btn-round btn-badge" on:click={notes.toggle} title="Notes ({$notes ? 'ON' : 'OFF'})">
		<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
		</svg>

		<span class="badge tracking-tighter" class:badge-primary={$notes}>{$notes ? 'ON' : 'OFF'}</span>
	</button>

</div>


<style>
	.action-buttons {
		@apply flex flex-wrap justify-evenly self-end;
	}

	.btn-badge {
		@apply relative;
	}

	.badge {
		min-height: 20px;
		min-width:  20px;
		@apply p-1 rounded-full leading-none text-center text-xs text-white bg-gray-600 inline-block absolute top-0 left-0;
	}

	.badge-primary {
		@apply bg-primary;
	}
</style>