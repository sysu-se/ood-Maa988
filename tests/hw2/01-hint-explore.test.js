import { describe, expect, it } from 'vitest'
import { loadDomainApi, makePuzzle } from '../hw1/helpers/domain-api.js'

describe('HW2 hint / explore behavior', () => {
	it('exposes candidate hints and next-step hints from Sudoku', async () => {
		const { createSudoku } = await loadDomainApi()
		const sudoku = createSudoku(makePuzzle())

		expect(sudoku.getCandidates(0, 2)).toContain(4)
		const nextHint = sudoku.findNextHint()
		expect(nextHint).toBeTruthy()
		expect(nextHint).toHaveProperty('row')
		expect(nextHint).toHaveProperty('col')
		expect(nextHint).toHaveProperty('value')
	})

	it('can apply a next hint through Game', async () => {
		const { createGame, createSudoku } = await loadDomainApi()
		const game = createGame({ sudoku: createSudoku(makePuzzle()) })

		const hint = game.getNextHint()
		expect(hint).toBeTruthy()
		expect(game.applyHint()).toBeTruthy()
		expect(game.getSudoku().getGrid()[hint.row][hint.col]).toBe(hint.value)
	})

	it('supports explore start, failure, reset and commit', async () => {
		const { createGame, createSudoku } = await loadDomainApi()
		const game = createGame({ sudoku: createSudoku(makePuzzle()) })

		expect(game.startExplore()).toBe(true)
		expect(game.isExploreActive()).toBe(true)

		expect(game.exploreGuess({ row: 0, col: 2, value: 5 })).toBe(false)
		expect(game.isExploreFailed()).toBe(true)

		expect(game.resetExplore()).toBe(true)
		expect(game.isExploreFailed()).toBe(false)
		expect(game.exploreGuess({ row: 0, col: 2, value: 4 })).toBe(true)
		expect(game.commitExplore()).toBe(true)
		expect(game.isExploreActive()).toBe(false)
		expect(game.getSudoku().getGrid()[0][2]).toBe(4)
		expect(game.canUndo()).toBe(true)
	})
})