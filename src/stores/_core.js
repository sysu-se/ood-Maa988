import { derived, get, writable } from 'svelte/store';
import { BOX_SIZE, DIFFICULTY_CUSTOM, MAX_HINTS, MODAL_NONE, SUDOKU_SIZE } from '../constants.js';
import { createGame, createGameFromJSON, createSudoku } from '../domain/index.js';
import { decodeSencode, encodeSudoku } from '../sencode.js';
import { generateSudoku } from '../sudoku.js';

function cloneGrid(grid) {
	return grid.map(row => row.slice());
}

function createEmptyGrid() {
	return Array.from({ length: SUDOKU_SIZE }, () => Array(SUDOKU_SIZE).fill(0));
}

function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value));
}

function isCursor(value) {
	return value && typeof value === 'object' && Number.isInteger(value.x) && Number.isInteger(value.y);
}

function normalizeCursor(value) {
	if (!isCursor(value)) return { x: 0, y: 0 };
	return {
		x: clamp(value.x, 0, SUDOKU_SIZE - 1),
		y: clamp(value.y, 0, SUDOKU_SIZE - 1)
	};
}

function coordKey(cursor) {
	return `${cursor.x},${cursor.y}`;
}

function cloneCandidateMap(candidates) {
	const next = {};
	for (const [key, values] of Object.entries(candidates || {})) {
		next[key] = Array.isArray(values) ? values.slice() : [];
	}
	return next;
}

function createBooleanStore(initialValue = false) {
	const state = writable(initialValue);
	return {
		subscribe: state.subscribe,
		set: state.set,
		update: state.update,
		toggle() {
			state.update(value => !value);
		}
	};
}

function createDifficultyStore() {
	const state = writable('medium');
	return {
		subscribe: state.subscribe,
		set: state.set,
		update: state.update,
		setCustom() {
			state.set(DIFFICULTY_CUSTOM);
		}
	};
}

function createCursorStore() {
	const state = writable({ x: 0, y: 0 });
	return {
		subscribe: state.subscribe,
		set(firstArg, secondArg) {
			if (typeof firstArg === 'number' && typeof secondArg === 'number') {
				return () => state.set(normalizeCursor({ x: firstArg, y: secondArg }));
			}

			state.set(normalizeCursor(firstArg));
		},
		move(deltaX = 0, deltaY = 0) {
			state.update(cursor => ({
				x: clamp(cursor.x + deltaX, 0, SUDOKU_SIZE - 1),
				y: clamp(cursor.y + deltaY, 0, SUDOKU_SIZE - 1)
			}));
		},
		replace(cursor) {
			state.set(normalizeCursor(cursor));
		}
	};
}

function createCandidateStore() {
	const state = writable({});
	return {
		subscribe: state.subscribe,
		add(cursor, value) {
			if (!isCursor(cursor) || !Number.isInteger(value) || value < 1 || value > SUDOKU_SIZE) return;
			const key = coordKey(cursor);
			state.update(current => {
				const next = cloneCandidateMap(current);
				const values = Array.isArray(next[key]) ? next[key].slice() : [];
				if (!values.includes(value)) {
					values.push(value);
					values.sort((left, right) => left - right);
				}
				next[key] = values;
				return next;
			});
		},
		clear(cursor) {
			if (!isCursor(cursor)) return;
			const key = coordKey(cursor);
			state.update(current => {
				if (!(key in current)) return current;
				const next = cloneCandidateMap(current);
				delete next[key];
				return next;
			});
		},
		replace(values) {
			state.set(cloneCandidateMap(values));
		}
	};
}

function createBoardStore(initialGrid = createEmptyGrid()) {
	const state = writable(cloneGrid(initialGrid));
	return {
		subscribe: state.subscribe,
		replace(grid) {
			state.set(cloneGrid(grid));
		},
		update(updater) {
			state.update(current => cloneGrid(updater(cloneGrid(current))));
		},
		getGrid() {
			return cloneGrid(get(state));
		},
		getSencode(grid = get(state)) {
			return encodeSudoku(grid);
		}
	};
}

function createModalStore() {
	const currentModal = writable(MODAL_NONE);
	const data = writable({});

	return {
		subscribe: currentModal.subscribe,
		show(type, modalData = {}) {
			data.set(modalData);
			currentModal.set(type);
		},
		hide() {
			const modalData = get(data);
			currentModal.set(MODAL_NONE);
			data.set({});
			if (typeof modalData.onHide === 'function') {
				modalData.onHide();
			}
		}
	};
}

function calculateInvalidCells(board) {
	const invalidCells = new Set();

	const mark = (row, col) => {
		invalidCells.add(`${col},${row}`);
	};

	for (let row = 0; row < SUDOKU_SIZE; row += 1) {
		for (let col = 0; col < SUDOKU_SIZE; col += 1) {
			const value = board[row][col];
			if (value === 0) continue;

			for (let otherCol = 0; otherCol < SUDOKU_SIZE; otherCol += 1) {
				if (otherCol !== col && board[row][otherCol] === value) {
					mark(row, col);
					mark(row, otherCol);
				}
			}

			for (let otherRow = 0; otherRow < SUDOKU_SIZE; otherRow += 1) {
				if (otherRow !== row && board[otherRow][col] === value) {
					mark(row, col);
					mark(otherRow, col);
				}
			}

			const startRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
			const startCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;
			for (let boxRow = startRow; boxRow < startRow + BOX_SIZE; boxRow += 1) {
				for (let boxCol = startCol; boxCol < startCol + BOX_SIZE; boxCol += 1) {
					if ((boxRow !== row || boxCol !== col) && board[boxRow][boxCol] === value) {
						mark(row, col);
						mark(boxRow, boxCol);
					}
				}
			}
		}
	}

	return [...invalidCells];
}

function isBoardSolved(board) {
	for (let row = 0; row < SUDOKU_SIZE; row += 1) {
		for (let col = 0; col < SUDOKU_SIZE; col += 1) {
			if (board[row][col] === 0) return false;
		}
	}

	return true;
}

const settingsDefaults = {
	displayTimer: true,
	hintsLimited: false,
	hints: 3,
	highlightCells: true,
	highlightSame: true,
	highlightConflicting: true
};

const settings = writable({ ...settingsDefaults });
const gamePaused = createBooleanStore(true);
const gameWon = createBooleanStore(false);
const canUndo = createBooleanStore(false);
const canRedo = createBooleanStore(false);
const difficulty = createDifficultyStore();
const timer = writable('00:00');
const timerRunning = createBooleanStore(false);
const hints = writable(Infinity);
const usedHints = writable(0);
const notes = createBooleanStore(false);
const cursor = createCursorStore();
const candidates = createCandidateStore();
const modal = createModalStore();
const modalData = writable({});
const explore = writable({
	active: false,
	failed: false,
	reason: '',
	startHash: '',
	currentHash: '',
	canUndo: false,
	canRedo: false,
	depth: 0
});

const gridState = createBoardStore(createEmptyGrid());
const userGridState = writable(createEmptyGrid());
const invalidCellsStore = derived(userGridState, $userGrid => calculateInvalidCells($userGrid));
const keyboardDisabled = derived(gamePaused, $gamePaused => $gamePaused);
const modalState = writable(MODAL_NONE);

let currentGame = null;
let timerInterval = null;
let timerStartedAt = null;
let timerStoppedAt = null;
let timerPausedDuration = 0;

function formatElapsed(milliseconds) {
	const timeStr = new Date(milliseconds).toISOString().substr(11, 8);
	return timeStr.substr(0, 2) === '00' ? timeStr.substr(3) : timeStr;
}

function clearTimerInterval() {
	if (timerInterval !== null) {
		clearInterval(timerInterval);
		timerInterval = null;
	}
}

function startTimerTick() {
	if (timerInterval !== null) return;

	if (timerStartedAt === null) {
		timerStartedAt = Date.now();
		timerPausedDuration = 0;
		timerStoppedAt = null;
	}

	if (timerStoppedAt !== null) {
		timerPausedDuration += Date.now() - timerStoppedAt;
		timerStoppedAt = null;
	}

	const updateTimer = () => {
		const elapsed = Date.now() - timerStartedAt - timerPausedDuration;
		timer.set(formatElapsed(elapsed));
	};

	updateTimer();
	timerInterval = setInterval(updateTimer, 1000);
}

function stopTimerTick() {
	if (timerStartedAt === null) return;
	timerStoppedAt = Date.now();
	clearTimerInterval();
}

function syncCurrentBoard() {
	if (!currentGame) return;
	canUndo.set(currentGame.canUndo());
	canRedo.set(currentGame.canRedo());
	syncExploreState();
	if (!currentGame.isExploreActive()) {
		userGridState.set(currentGame.getSudoku().getGrid());
	}
	updateGameWon();
}

function syncExploreState() {
	if (!currentGame || !currentGame.isExploreActive()) {
		explore.set({
			active: false,
			failed: false,
			reason: '',
			startHash: '',
			currentHash: '',
			canUndo: false,
			canRedo: false,
			depth: 0
		});
		return;
	}

	explore.set(currentGame.getExploreState());
}

function updateGameWon() {
	if (currentGame && currentGame.isExploreActive()) {
		gameWon.set(false);
		return;
	}

	const board = get(userGridState);
	const invalidCells = calculateInvalidCells(board);
	const won = isBoardSolved(board) && invalidCells.length === 0;
	gameWon.set(won);
	if (won) {
		pauseGame();
	}
}

invalidCellsStore.subscribe(() => {
	updateGameWon();
});

function resetAuxiliaryState() {
	notes.set(false);
	candidates.replace({});
}

function findFirstEmptyCell(board) {
	for (let row = 0; row < SUDOKU_SIZE; row += 1) {
		for (let col = 0; col < SUDOKU_SIZE; col += 1) {
			if (board[row][col] === 0) {
				return { x: col, y: row };
			}
		}
	}

	return { x: 0, y: 0 };
}

function loadBoard(board, difficultyValue) {
	const puzzle = cloneGrid(board);
	currentGame = createGame({ sudoku: createSudoku(puzzle) });
	gridState.replace(puzzle);
	userGridState.set(cloneGrid(puzzle));
	difficulty.set(difficultyValue);
	timer.set('00:00');
	timerStartedAt = null;
	timerStoppedAt = null;
	timerPausedDuration = 0;
	clearTimerInterval();
	timerRunning.set(false);
	hints.set(get(settings).hintsLimited ? clamp(get(settings).hints, 0, MAX_HINTS) : Infinity);
	usedHints.set(0);
	gamePaused.set(true);
	gameWon.set(false);
	canUndo.set(false);
	canRedo.set(false);
	syncExploreState();
	resetAuxiliaryState();
	cursor.replace(findFirstEmptyCell(puzzle));
}

function pauseGame() {
	gamePaused.set(true);
	timerRunning.set(false);
	stopTimerTick();
}

function resumeGame() {
	gamePaused.set(false);
	timerRunning.set(true);
	startTimerTick();
}

function startNew(difficultyValue) {
	loadBoard(generateSudoku(difficultyValue), difficultyValue);
	resumeGame();
	if (typeof window !== 'undefined') {
		window.location.hash = '';
	}
}

function startCustom(sencode) {
	loadBoard(decodeSencode(sencode), DIFFICULTY_CUSTOM);
	resumeGame();
	if (typeof window !== 'undefined') {
		window.location.hash = '';
	}
}

function guess(move) {
	if (!currentGame || get(gamePaused)) return false;

	try {
		currentGame.guess(move);
		syncCurrentBoard();
		return true;
	} catch {
		return false;
	}
}

function undo() {
	if (!currentGame || get(gamePaused) || !currentGame.canUndo()) return false;
	currentGame.undo();
	syncCurrentBoard();
	return true;
}

function redo() {
	if (!currentGame || get(gamePaused) || !currentGame.canRedo()) return false;
	currentGame.redo();
	syncCurrentBoard();
	return true;
}

function applyHint(row, col) {
	if (!currentGame || get(gamePaused)) return false;
	const hint = currentGame.applyHint(row, col);
	if (!hint) return false;
	syncCurrentBoard();

	if (currentGame.isExploreActive()) {
		syncExploreState();
	}

	const applied = true;
	if (applied) {
		hints.update(count => count === Infinity ? Infinity : Math.max(0, count - 1));
		usedHints.update(count => count + 1);
	}

	return hint;
}

function startExplore() {
	if (!currentGame || get(gamePaused)) return false;
	const started = currentGame.startExplore();
	syncCurrentBoard();
	return started;
}

function resetExplore() {
	if (!currentGame) return false;
	const reset = currentGame.resetExplore();
	syncCurrentBoard();
	return reset;
}

function discardExplore() {
	if (!currentGame) return false;
	const discarded = currentGame.discardExplore();
	syncCurrentBoard();
	return discarded;
}

function commitExplore() {
	if (!currentGame) return false;
	const committed = currentGame.commitExplore();
	const shouldResume = committed && !currentGame.isSolved();
	syncCurrentBoard();
	if (shouldResume) {
		resumeGame();
	}
	return committed;
}

function exploreGuess(move) {
	if (!currentGame || !currentGame.isExploreActive()) return false;
	const applied = currentGame.exploreGuess(move);
	syncCurrentBoard();
	return applied;
}

function getCandidates(row, col) {
	if (!currentGame) return [];
	return currentGame.getCandidates(row, col);
}

function getNextHint() {
	if (!currentGame) return null;
	return currentGame.getNextHint();
}

function getHintInfo(row, col) {
	if (!currentGame) return null;
	return currentGame.getHintInfo(row, col);
}

function toJSON() {
	if (!currentGame) return null;

	return {
		game: currentGame.toJSON(),
		grid: gridState.getGrid(),
		userGrid: get(userGridState),
		difficulty: get(difficulty),
		timer: get(timer),
		timerRunning: get(timerRunning),
		hints: get(hints),
		usedHints: get(usedHints),
		gamePaused: get(gamePaused),
		notes: get(notes),
		candidates: get(candidatesState),
		cursor: get(cursorState),
		settings: get(settings),
		explore: get(explore)
	};
}

function fromJSON(json) {
	if (!json) return null;

	const gameJSON = json.game || json;
	currentGame = createGameFromJSON(gameJSON);
	const board = currentGame.getSudoku().getGrid();
	gridState.replace(json.grid || board);
	userGridState.set(cloneGrid(json.userGrid || board));
	difficulty.set(json.difficulty || 'medium');
	timer.set(typeof json.timer === 'string' ? json.timer : formatElapsed(Number(json.timer || 0) * 1000));
	timerRunning.set(Boolean(json.timerRunning));
	hints.set(json.hints !== undefined ? json.hints : Infinity);
	usedHints.set(json.usedHints || 0);
	gamePaused.set(json.gamePaused !== undefined ? Boolean(json.gamePaused) : true);
	notes.set(Boolean(json.notes));
	candidates.replace(json.candidates || {});
	cursor.replace(json.cursor || { x: 0, y: 0 });
	settings.set({ ...settingsDefaults, ...(json.settings || {}) });
	canUndo.set(currentGame.canUndo());
	canRedo.set(currentGame.canRedo());
	syncExploreState();
	updateGameWon();
	return json;
}

const settingsState = settings;
const candidatesState = writable({});
const cursorState = writable({ x: 0, y: 0 });

const candidatesApi = {
	subscribe: candidatesState.subscribe,
	add(cursorValue, value) {
		if (!isCursor(cursorValue) || !Number.isInteger(value) || value < 1 || value > SUDOKU_SIZE) return;
		const key = coordKey(cursorValue);
		candidatesState.update(current => {
			const next = cloneCandidateMap(current);
			const values = Array.isArray(next[key]) ? next[key].slice() : [];
			if (!values.includes(value)) {
				values.push(value);
				values.sort((left, right) => left - right);
			}
			next[key] = values;
			return next;
		});
	},
	clear(cursorValue) {
		if (!isCursor(cursorValue)) return;
		const key = coordKey(cursorValue);
		candidatesState.update(current => {
			if (!(key in current)) return current;
			const next = cloneCandidateMap(current);
			delete next[key];
			return next;
		});
	},
	replace(values) {
		candidatesState.set(cloneCandidateMap(values));
	}
};

const cursorApi = {
	subscribe: cursorState.subscribe,
	set(firstArg, secondArg) {
		if (typeof firstArg === 'number' && typeof secondArg === 'number') {
			return () => cursorState.set(normalizeCursor({ x: firstArg, y: secondArg }));
		}

		cursorState.set(normalizeCursor(firstArg));
	},
	move(deltaX = 0, deltaY = 0) {
		cursorState.update(cursorValue => ({
			x: clamp(cursorValue.x + deltaX, 0, SUDOKU_SIZE - 1),
			y: clamp(cursorValue.y + deltaY, 0, SUDOKU_SIZE - 1)
		}));
	},
	replace(cursorValue) {
		cursorState.set(normalizeCursor(cursorValue));
	}
};

const grid = {
	subscribe: gridState.subscribe,
	replace: gridState.replace,
	update: gridState.update,
	getGrid: gridState.getGrid,
	getSencode: gridState.getSencode
};

const userGrid = {
	subscribe: userGridState.subscribe,
	replace(gridValue) {
		userGridState.set(cloneGrid(gridValue));
	},
	update(updater) {
		userGridState.update(current => cloneGrid(updater(cloneGrid(current))));
	},
	set(firstArg, secondArg) {
		if (Array.isArray(firstArg)) {
			userGridState.set(cloneGrid(firstArg));
			return;
		}

		if (isCursor(firstArg) && Number.isInteger(secondArg)) {
			guess({ row: firstArg.y, col: firstArg.x, value: secondArg });
		}
	},
	applyHint(cursorValue) {
		return applyHint(cursorValue.y, cursorValue.x);
	}
};

const modalApi = {
	subscribe: modalState.subscribe,
	show(type, data = {}) {
		modalData.set(data);
		modalState.set(type);
	},
	hide() {
		const currentData = get(modalData);
		modalState.set(MODAL_NONE);
		modalData.set({});
		if (typeof currentData.onHide === 'function') {
			currentData.onHide();
		}
	}
};

const game = {
	startNew,
	startCustom,
	guess,
	undo,
	redo,
	canUndo: () => currentGame ? currentGame.canUndo() : false,
	canRedo: () => currentGame ? currentGame.canRedo() : false,
	pause: pauseGame,
	pauseGame,
	resume: resumeGame,
	resumeGame,
	applyHint,
	startExplore,
	resetExplore,
	discardExplore,
	commitExplore,
	exploreGuess,
	getCandidates,
	getNextHint,
	getHintInfo,
	isExploreActive: () => Boolean(currentGame && currentGame.isExploreActive()),
	isExploreFailed: () => Boolean(currentGame && currentGame.isExploreFailed()),
	getExploreState: () => currentGame ? currentGame.getExploreState() : get(explore),
	toJSON,
	fromJSON,
	getGame: () => currentGame,
	getSudoku: () => (currentGame ? currentGame.getSudoku() : createSudoku(createEmptyGrid()))
};

loadBoard(createEmptyGrid(), 'medium');

export {
	settingsState as settings,
	gamePaused,
	gameWon,
	canUndo,
	canRedo,
	difficulty,
	timer,
	timerRunning,
	hints,
	usedHints,
	notes,
	explore,
	cursorApi as cursor,
	candidatesApi as candidates,
	grid,
	userGrid,
	invalidCellsStore as invalidCells,
	modalApi as modal,
	modalData,
	keyboardDisabled,
	startNew,
	startCustom,
	guess,
	undo,
	redo,
	pauseGame,
	resumeGame,
	applyHint,
	startExplore,
	resetExplore,
	discardExplore,
	commitExplore,
	exploreGuess,
	getCandidates,
	getNextHint,
	getHintInfo,
	toJSON,
	fromJSON,
	game
};

export default game;