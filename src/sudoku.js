import { BOX_SIZE, SUDOKU_SIZE } from './constants.js';

const BASE_SOLUTION = [
	[5, 3, 4, 6, 7, 8, 9, 1, 2],
	[6, 7, 2, 1, 9, 5, 3, 4, 8],
	[1, 9, 8, 3, 4, 2, 5, 6, 7],
	[8, 5, 9, 7, 6, 1, 4, 2, 3],
	[4, 2, 6, 8, 5, 3, 7, 9, 1],
	[7, 1, 3, 9, 2, 4, 8, 5, 6],
	[9, 6, 1, 5, 3, 7, 2, 8, 4],
	[2, 8, 7, 4, 1, 9, 6, 3, 5],
	[3, 4, 5, 2, 8, 6, 1, 7, 9]
];

const PUZZLE_MASKS = {
	easy: [
		[0, 0, 0, 0, 0, 8, 0, 1, 0],
		[6, 0, 0, 1, 0, 0, 3, 0, 0],
		[0, 9, 0, 0, 4, 0, 0, 6, 0],
		[0, 0, 9, 0, 6, 0, 4, 0, 3],
		[4, 0, 0, 8, 0, 3, 0, 0, 1],
		[7, 0, 3, 0, 0, 0, 8, 0, 6],
		[0, 6, 0, 0, 3, 0, 0, 8, 0],
		[0, 0, 0, 4, 0, 0, 6, 0, 0],
		[0, 0, 5, 0, 0, 6, 0, 0, 9]
	],
	medium: [
		[0, 0, 4, 0, 0, 0, 9, 0, 0],
		[6, 0, 0, 0, 9, 5, 0, 0, 0],
		[0, 9, 0, 3, 0, 0, 0, 0, 7],
		[8, 0, 0, 0, 6, 0, 0, 2, 0],
		[0, 0, 6, 0, 0, 0, 7, 0, 0],
		[0, 1, 0, 0, 2, 0, 0, 0, 6],
		[9, 0, 0, 0, 3, 7, 0, 8, 0],
		[0, 0, 0, 4, 1, 0, 0, 0, 5],
		[0, 0, 5, 0, 0, 0, 1, 0, 0]
	],
	hard: [
		[0, 0, 0, 0, 7, 0, 0, 0, 2],
		[0, 7, 0, 1, 0, 0, 0, 4, 0],
		[0, 0, 8, 0, 0, 0, 5, 0, 0],
		[8, 0, 0, 0, 6, 0, 0, 0, 3],
		[0, 0, 0, 8, 0, 3, 0, 0, 0],
		[7, 0, 0, 0, 2, 0, 0, 0, 6],
		[0, 0, 1, 0, 0, 0, 2, 0, 0],
		[0, 8, 0, 0, 0, 9, 0, 3, 0],
		[3, 0, 0, 0, 8, 0, 0, 0, 0]
	],
	expert: [
		[0, 0, 0, 0, 0, 0, 0, 1, 0],
		[0, 0, 0, 1, 0, 5, 0, 0, 0],
		[0, 9, 0, 0, 4, 0, 0, 0, 0],
		[8, 0, 0, 0, 0, 0, 0, 0, 3],
		[0, 0, 6, 0, 0, 0, 7, 0, 0],
		[7, 0, 0, 0, 0, 0, 0, 0, 6],
		[0, 0, 0, 0, 3, 0, 0, 8, 0],
		[0, 0, 0, 4, 0, 9, 0, 0, 0],
		[0, 4, 0, 0, 0, 0, 0, 0, 0]
	]
};

function cloneGrid(grid) {
	return grid.map(row => row.slice());
}

function shuffle(values) {
	const next = values.slice();
	for (let index = next.length - 1; index > 0; index -= 1) {
		const swapIndex = Math.floor(Math.random() * (index + 1));
		const temp = next[index];
		next[index] = next[swapIndex];
		next[swapIndex] = temp;
	}
	return next;
}

function permuteDigits(grid) {
	const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
	return grid.map(row => row.map(cell => (cell === 0 ? 0 : digits[cell - 1])));
}

function reorderGroups(grid) {
	const rowGroups = shuffle([0, 1, 2]);
	const colGroups = shuffle([0, 1, 2]);
	const rowOffsets = [0, 1, 2];
	const colOffsets = [0, 1, 2];

	const rows = [];
	for (const group of rowGroups) {
		for (const offset of shuffle(rowOffsets)) {
			rows.push(group * 3 + offset);
		}
	}

	const cols = [];
	for (const group of colGroups) {
		for (const offset of shuffle(colOffsets)) {
			cols.push(group * 3 + offset);
		}
	}

	return rows.map(rowIndex => cols.map(colIndex => grid[rowIndex][colIndex]));
}

function normalizeGrid(grid) {
	return grid.map(row => row.map(cell => Number(cell) || 0));
}

function isSafe(grid, row, col, value) {
	for (let index = 0; index < SUDOKU_SIZE; index += 1) {
		if (grid[row][index] === value || grid[index][col] === value) {
			return false;
		}
	}

	const startRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
	const startCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;

	for (let currentRow = startRow; currentRow < startRow + BOX_SIZE; currentRow += 1) {
		for (let currentCol = startCol; currentCol < startCol + BOX_SIZE; currentCol += 1) {
			if (grid[currentRow][currentCol] === value) {
				return false;
			}
		}
	}

	return true;
}

function solveInPlace(grid) {
	for (let row = 0; row < SUDOKU_SIZE; row += 1) {
		for (let col = 0; col < SUDOKU_SIZE; col += 1) {
			if (grid[row][col] === 0) {
				for (let value = 1; value <= SUDOKU_SIZE; value += 1) {
					if (isSafe(grid, row, col, value)) {
						grid[row][col] = value;
						if (solveInPlace(grid)) {
							return true;
						}
						grid[row][col] = 0;
					}
				}

				return false;
			}
		}
	}

	return true;
}

export function generateSudoku(difficulty = 'medium') {
	const mask = PUZZLE_MASKS[difficulty] || PUZZLE_MASKS.medium;
	return reorderGroups(permuteDigits(mask));
}

export function solveSudoku(grid) {
	const workingGrid = normalizeGrid(cloneGrid(grid));
	if (solveInPlace(workingGrid)) {
		return workingGrid;
	}

	return cloneGrid(BASE_SOLUTION);
}