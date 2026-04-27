import { SUDOKU_SIZE } from './constants.js';

function encodeText(text) {
	if (typeof btoa === 'function') {
		return btoa(unescape(encodeURIComponent(text)));
	}

	return Buffer.from(text, 'utf8').toString('base64');
}

function decodeText(text) {
	if (typeof atob === 'function') {
		return decodeURIComponent(escape(atob(text)));
	}

	return Buffer.from(text, 'base64').toString('utf8');
}

function isGrid(grid) {
	return Array.isArray(grid)
		&& grid.length === SUDOKU_SIZE
		&& grid.every(row => Array.isArray(row)
			&& row.length === SUDOKU_SIZE
			&& row.every(cell => Number.isInteger(cell) && cell >= 0 && cell <= 9));
}

export function encodeSudoku(grid) {
	return encodeText(JSON.stringify(grid));
}

export function decodeSencode(sencode) {
	const parsed = JSON.parse(decodeText(sencode));

	if (!isGrid(parsed)) {
		throw new Error('Invalid sencode payload');
	}

	return parsed;
}

export function validateSencode(sencode) {
	if (typeof sencode !== 'string' || sencode.trim().length === 0) {
		return false;
	}

	try {
		decodeSencode(sencode.trim());
		return true;
	} catch (error) {
		return false;
	}
}