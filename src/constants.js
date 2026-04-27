export const SUDOKU_SIZE = 9;
export const BOX_SIZE = 3;

export const DIFFICULTY_EASY = 'easy';
export const DIFFICULTY_MEDIUM = 'medium';
export const DIFFICULTY_HARD = 'hard';
export const DIFFICULTY_EXPERT = 'expert';
export const DIFFICULTY_CUSTOM = 'custom';

export const DIFFICULTIES = {
	[DIFFICULTY_EASY]: 'Easy',
	[DIFFICULTY_MEDIUM]: 'Medium',
	[DIFFICULTY_HARD]: 'Hard',
	[DIFFICULTY_EXPERT]: 'Expert'
};

export const DROPDOWN_DURATION = 180;
export const MODAL_DURATION = 180;
export const MAX_HINTS = 81;

export const BASE_URL = typeof window !== 'undefined'
	? window.location.origin + window.location.pathname.replace(/index\.html?$/i, '')
	: 'https://example.com';

export const MODAL_NONE = 'none';

export const GAME_OVER_CELEBRATIONS = [
	'Great job!',
	'Sudoku complete!',
	'Puzzle solved!',
	'Well done!'
];

export const CANDIDATE_COORDS = [
	[1, 1], [1, 2], [1, 3],
	[2, 1], [2, 2], [2, 3],
	[3, 1], [3, 2], [3, 3]
];