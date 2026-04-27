import { solveSudoku } from '../sudoku.js'

function cloneGrid(grid) {
	return grid.map(row => row.slice())
}

function createGivensSet(input, givens) {
	if (givens instanceof Set) {
		return new Set(givens)
	}

	const inferred = new Set()
	for (let row = 0; row < 9; row += 1) {
		for (let col = 0; col < 9; col += 1) {
			if (input[row][col] !== 0) {
				inferred.add(`${row},${col}`)
			}
		}
	}

	return inferred
}

function isValidPosition(row, col) {
	return Number.isInteger(row) && Number.isInteger(col) && row >= 0 && row < 9 && col >= 0 && col < 9
}

function isValidValue(value) {
	return Number.isInteger(value) && value >= 0 && value <= 9
}

function getInvalidCellsFromGrid(grid) {
	const invalid = new Set()

	const mark = (row, col) => {
		invalid.add(`${col},${row}`)
	}

	for (let row = 0; row < 9; row += 1) {
		for (let col = 0; col < 9; col += 1) {
			const value = grid[row][col]
			if (value === 0) continue

			for (let otherCol = 0; otherCol < 9; otherCol += 1) {
				if (otherCol !== col && grid[row][otherCol] === value) {
					mark(row, col)
					mark(row, otherCol)
				}
			}

			for (let otherRow = 0; otherRow < 9; otherRow += 1) {
				if (otherRow !== row && grid[otherRow][col] === value) {
					mark(row, col)
					mark(otherRow, col)
				}
			}

			const startRow = Math.floor(row / 3) * 3
			const startCol = Math.floor(col / 3) * 3
			for (let boxRow = startRow; boxRow < startRow + 3; boxRow += 1) {
				for (let boxCol = startCol; boxCol < startCol + 3; boxCol += 1) {
					if ((boxRow !== row || boxCol !== col) && grid[boxRow][boxCol] === value) {
						mark(row, col)
						mark(boxRow, boxCol)
					}
				}
			}
		}
	}

	return [...invalid]
}

function hasConflict(grid) {
	return getInvalidCellsFromGrid(grid).length > 0
}

function getCandidatesForCell(grid, row, col) {
	if (grid[row][col] !== 0) return []

	const used = new Set()
	for (let index = 0; index < 9; index += 1) {
		used.add(grid[row][index])
		used.add(grid[index][col])
	}

	const startRow = Math.floor(row / 3) * 3
	const startCol = Math.floor(col / 3) * 3
	for (let boxRow = startRow; boxRow < startRow + 3; boxRow += 1) {
		for (let boxCol = startCol; boxCol < startCol + 3; boxCol += 1) {
			used.add(grid[boxRow][boxCol])
		}
	}

	const candidates = []
	for (let value = 1; value <= 9; value += 1) {
		if (!used.has(value)) {
			candidates.push(value)
		}
	}

	return candidates
}

function buildCandidateMap(grid) {
	const candidateMap = new Map()
	for (let row = 0; row < 9; row += 1) {
		for (let col = 0; col < 9; col += 1) {
			if (grid[row][col] === 0) {
				candidateMap.set(`${row},${col}`, getCandidatesForCell(grid, row, col))
			}
		}
	}
	return candidateMap
}

function findHiddenSingle(grid) {
	const candidateMap = buildCandidateMap(grid)

	for (let row = 0; row < 9; row += 1) {
		for (let value = 1; value <= 9; value += 1) {
			const matches = []
			for (let col = 0; col < 9; col += 1) {
				const candidates = candidateMap.get(`${row},${col}`) || []
				if (candidates.includes(value)) matches.push({ row, col, candidates })
			}
			if (matches.length === 1) {
				return { ...matches[0], value, reason: 'row-hidden-single' }
			}
		}
	}

	for (let col = 0; col < 9; col += 1) {
		for (let value = 1; value <= 9; value += 1) {
			const matches = []
			for (let row = 0; row < 9; row += 1) {
				const candidates = candidateMap.get(`${row},${col}`) || []
				if (candidates.includes(value)) matches.push({ row, col, candidates })
			}
			if (matches.length === 1) {
				return { ...matches[0], value, reason: 'column-hidden-single' }
			}
		}
	}

	for (let boxRow = 0; boxRow < 9; boxRow += 3) {
		for (let boxCol = 0; boxCol < 9; boxCol += 3) {
			for (let value = 1; value <= 9; value += 1) {
				const matches = []
				for (let row = boxRow; row < boxRow + 3; row += 1) {
					for (let col = boxCol; col < boxCol + 3; col += 1) {
						const candidates = candidateMap.get(`${row},${col}`) || []
						if (candidates.includes(value)) matches.push({ row, col, candidates })
					}
				}
				if (matches.length === 1) {
					return { ...matches[0], value, reason: 'box-hidden-single' }
				}
			}
		}
	}

	return null
}

function findNextHint(grid) {
	const candidateMap = buildCandidateMap(grid)
	for (const [key, candidates] of candidateMap.entries()) {
		if (candidates.length === 1) {
			const [row, col] = key.split(',').map(Number)
			return { row, col, value: candidates[0], candidates, reason: 'naked-single' }
		}
	}

	return findHiddenSingle(grid)
}

export function createSudoku(input, givens) {
	let grid = cloneGrid(input)
	const givenCells = createGivensSet(input, givens)

	return {
		getGrid() {
			return cloneGrid(grid)
		},

		getValue(row, col) {
			return grid[row][col]
		},

		getGivens() {
			return new Set(givenCells)
		},

		isGiven(row, col) {
			return givenCells.has(`${row},${col}`)
		},

		getCandidates(row, col) {
			if (!isValidPosition(row, col)) return []
			return getCandidatesForCell(grid, row, col)
		},

		getCandidateMap() {
			const candidateMap = {}
			for (let row = 0; row < 9; row += 1) {
				for (let col = 0; col < 9; col += 1) {
					if (grid[row][col] === 0) {
						candidateMap[`${col},${row}`] = getCandidatesForCell(grid, row, col)
					}
				}
			}
			return candidateMap
		},

		findNextHint() {
			return findNextHint(grid)
		},

		guess(move) {
			const { row, col, value } = move
			if (!isValidPosition(row, col)) {
				throw new Error(`Invalid position: row=${row}, col=${col}`)
			}
			if (!isValidValue(value)) {
				throw new Error(`Invalid value: ${value}`)
			}
			if (givenCells.has(`${row},${col}`)) {
				throw new Error(`Cannot modify given cell at (${row}, ${col})`)
			}
			grid[row][col] = value
		},

		getInvalidCells() {
			return getInvalidCellsFromGrid(grid)
		},

		isSolved() {
			for (let row = 0; row < 9; row += 1) {
				for (let col = 0; col < 9; col += 1) {
					if (grid[row][col] === 0) return false
				}
			}

			return !hasConflict(grid)
		},

		clone() {
			return createSudoku(grid, new Set(givenCells))
		},

		toJSON() {
			return {
				type: 'Sudoku',
				grid: cloneGrid(grid),
				givens: [...givenCells]
			}
		},

		toString() {
			const separator = '+-------+-------+-------+'
			const lines = [separator]

			for (let row = 0; row < 9; row += 1) {
				let line = '| '
				for (let col = 0; col < 9; col += 1) {
					const value = grid[row][col]
					line += `${value === 0 ? '.' : value} `
					if ((col + 1) % 3 === 0) {
						line += '| '
					}
				}
				lines.push(line)
				if ((row + 1) % 3 === 0) {
					lines.push(separator)
				}
			}

			return lines.join('\n')
		}
	}
}

export function createSudokuFromJSON(json) {
	return createSudoku(json.grid, json.givens ? new Set(json.givens) : undefined)
}

function createHistoryEntry(type, snapshot, nextSnapshot, move) {
	return {
		type,
		before: snapshot ? snapshot.toJSON() : null,
		after: nextSnapshot ? nextSnapshot.toJSON() : null,
		move: move || null
	}
}

function restoreSudoku(snapshot) {
	return createSudokuFromJSON(snapshot)
}

function hashGrid(grid) {
	return grid.map(row => row.join('')).join('|')
}

function createExploreSession(sudoku) {
	const origin = sudoku.clone()
	return {
		origin,
		sudoku: sudoku.clone(),
		undoStack: [],
		redoStack: [],
		failed: false,
		reason: '',
		startHash: hashGrid(origin.getGrid())
	}
}

function applySessionMove(session, move) {
	const oldValue = session.sudoku.getValue(move.row, move.col)
	session.sudoku.guess(move)
	session.undoStack.push(createHistoryEntry('move', null, null, { ...move, oldValue, newValue: move.value }))
	session.redoStack.length = 0
	return session.sudoku
}

function syncExploreFailureState(session) {
	if (session.sudoku.getInvalidCells().length === 0) {
		session.failed = false
		session.reason = ''
		return
	}

	session.failed = true
	if (!session.reason) {
		session.reason = '探索出现冲突'
	}
}

function undoSessionMove(session) {
	if (session.undoStack.length === 0) return
	const entry = session.undoStack.pop()
	if (entry.type === 'move') {
		session.sudoku.guess({ row: entry.move.row, col: entry.move.col, value: entry.move.oldValue })
		session.redoStack.push(entry)
		syncExploreFailureState(session)
		return
	}
	if (entry.type === 'snapshot') {
		session.sudoku = restoreSudoku(entry.before)
		session.redoStack.push(entry)
		syncExploreFailureState(session)
	}
}

function redoSessionMove(session) {
	if (session.redoStack.length === 0) return
	const entry = session.redoStack.pop()
	if (entry.type === 'move') {
		session.sudoku.guess({ row: entry.move.row, col: entry.move.col, value: entry.move.newValue })
		session.undoStack.push(entry)
		syncExploreFailureState(session)
		return
	}
	if (entry.type === 'snapshot') {
		session.sudoku = restoreSudoku(entry.after)
		session.undoStack.push(entry)
		syncExploreFailureState(session)
	}
}

export function createGame({ sudoku, undoStack = [], redoStack = [], exploreState = null, failedExploreHashes = [] }) {
	let mainSudoku = sudoku.clone()
	const mainUndoStack = [...undoStack]
	const mainRedoStack = [...redoStack]
	let exploreSession = exploreState
		? {
			origin: restoreSudoku(exploreState.origin),
			sudoku: restoreSudoku(exploreState.sudoku),
			undoStack: (exploreState.undoStack || []).map(entry => ({ ...entry })),
			redoStack: (exploreState.redoStack || []).map(entry => ({ ...entry })),
			failed: Boolean(exploreState.failed),
			reason: exploreState.reason || '',
			startHash: exploreState.startHash || hashGrid(restoreSudoku(exploreState.origin).getGrid())
		}
		: null
	const failedHashes = new Set(failedExploreHashes)
	let mode = exploreSession ? 'explore' : 'main'

	function currentSession() {
		return mode === 'explore' ? exploreSession : null
	}

	function currentSudoku() {
		return mode === 'explore' && exploreSession ? exploreSession.sudoku : mainSudoku
	}

	function getExploreState() {
		if (!exploreSession) {
			return {
				active: false,
				failed: false,
				reason: '',
				startHash: '',
				currentHash: '',
				canUndo: false,
				canRedo: false
			}
		}

		const currentHash = hashGrid(exploreSession.sudoku.getGrid())
		return {
			active: true,
			failed: exploreSession.failed,
			reason: exploreSession.reason,
			startHash: exploreSession.startHash,
			currentHash,
			invalidCells: exploreSession.sudoku.getInvalidCells(),
			canUndo: exploreSession.undoStack.length > 0,
			canRedo: exploreSession.redoStack.length > 0,
			depth: exploreSession.undoStack.length,
			origin: exploreSession.origin.getGrid(),
			current: exploreSession.sudoku.getGrid()
		}
	}

	function markExploreFailure(reason) {
		if (!exploreSession) return false
		exploreSession.failed = true
		exploreSession.reason = reason
		failedHashes.add(hashGrid(exploreSession.sudoku.getGrid()))
		return true
	}

	function refreshExploreFailureMemory() {
		if (!exploreSession) return false
		const currentHash = hashGrid(exploreSession.sudoku.getGrid())
		if (failedHashes.has(currentHash)) {
			return markExploreFailure('该探索局面已经失败过')
		}
		return false
	}

	function getSudoku() {
		return currentSudoku().clone()
	}

	function guess(move) {
		if (mode === 'explore' && exploreSession) {
			if (exploreSession.failed) return false
			if (refreshExploreFailureMemory()) return false
			try {
				applySessionMove(exploreSession, move)
			} catch (error) {
				return false
			}
			if (exploreSession.sudoku.getInvalidCells().length > 0) {
				markExploreFailure('探索出现冲突')
				return false
			}
			if (failedHashes.has(hashGrid(exploreSession.sudoku.getGrid()))) {
				return markExploreFailure('该探索局面已经失败过')
			}
			return true
		}

		const nextSudoku = mainSudoku.clone()
		nextSudoku.guess(move)
		const entry = createHistoryEntry('move', mainSudoku, nextSudoku, { ...move, oldValue: mainSudoku.getValue(move.row, move.col), newValue: move.value })
		mainSudoku = nextSudoku
		mainUndoStack.push(entry)
		mainRedoStack.length = 0
		return true
	}

	function undo() {
		if (mode === 'explore' && exploreSession) {
			undoSessionMove(exploreSession)
			return
		}

		if (mainUndoStack.length === 0) return
		const entry = mainUndoStack.pop()
		if (entry.type === 'move') {
			mainSudoku.guess({ row: entry.move.row, col: entry.move.col, value: entry.move.oldValue })
			mainRedoStack.push(entry)
			return
		}
		if (entry.type === 'snapshot') {
			mainSudoku = restoreSudoku(entry.before)
			mainRedoStack.push(entry)
		}
	}

	function redo() {
		if (mode === 'explore' && exploreSession) {
			redoSessionMove(exploreSession)
			return
		}

		if (mainRedoStack.length === 0) return
		const entry = mainRedoStack.pop()
		if (entry.type === 'move') {
			mainSudoku.guess({ row: entry.move.row, col: entry.move.col, value: entry.move.newValue })
			mainUndoStack.push(entry)
			return
		}
		if (entry.type === 'snapshot') {
			mainSudoku = restoreSudoku(entry.after)
			mainUndoStack.push(entry)
		}
	}

	function canUndo() {
		return mode === 'explore' ? Boolean(exploreSession && exploreSession.undoStack.length > 0) : mainUndoStack.length > 0
	}

	function canRedo() {
		return mode === 'explore' ? Boolean(exploreSession && exploreSession.redoStack.length > 0) : mainRedoStack.length > 0
	}

	function startExplore() {
		if (mode === 'explore' || !mainSudoku) return false
		exploreSession = createExploreSession(mainSudoku)
		mode = 'explore'
		return true
	}

	function resetExplore() {
		if (!exploreSession) return false
		exploreSession.sudoku = exploreSession.origin.clone()
		exploreSession.undoStack = []
		exploreSession.redoStack = []
		exploreSession.failed = false
		exploreSession.reason = ''
		return true
	}

	function discardExplore() {
		if (!exploreSession) return false
		exploreSession = null
		mode = 'main'
		return true
	}

	function commitExplore() {
		if (!exploreSession || exploreSession.failed) return false
		const before = mainSudoku.clone()
		const after = exploreSession.sudoku.clone()
		mainSudoku = after.clone()
		mainUndoStack.push(createHistoryEntry('snapshot', before, after))
		mainRedoStack.length = 0
		const currentHash = hashGrid(after.getGrid())
		failedHashes.delete(currentHash)
		exploreSession = null
		mode = 'main'
		return true
	}

	function exploreGuess(move) {
		if (mode !== 'explore' || !exploreSession) return false
		return guess(move)
	}

	function getCandidates(row, col) {
		return currentSudoku().getCandidates(row, col)
	}

	function getNextHint() {
		return currentSudoku().findNextHint()
	}

	function getHintInfo(row, col) {
		if (!Number.isInteger(row) || !Number.isInteger(col)) {
			return null
		}

		const sudoku = currentSudoku()
		const currentValue = sudoku.getValue(row, col)
		const isGiven = sudoku.isGiven(row, col)
		const candidates = sudoku.getCandidates(row, col)
		const solution = solveSudoku(sudoku.getGrid())
		const value = solution[row][col]
		const reason = isGiven
			? '题目给定数'
			: currentValue !== 0
				? '当前格已经填写'
				: candidates.length === 1
					? '唯一候选'
					: '由当前棋盘求解得到'

		return {
			row,
			col,
			currentValue,
			isGiven,
			candidates,
			value,
			reason,
			canApply: !isGiven && currentValue === 0 && Number.isInteger(value) && value > 0
		}
	}

	function applyHint(row, col) {
		if (!Number.isInteger(row) || !Number.isInteger(col)) {
			const hint = getNextHint()
			if (!hint) return null
			return guess({ row: hint.row, col: hint.col, value: hint.value }) ? hint : null
		}

		const hintInfo = getHintInfo(row, col)
		if (!hintInfo || !hintInfo.canApply) return null

		return guess({ row, col, value: hintInfo.value }) ? { ...hintInfo, reason: 'selected-cell' } : null
	}

	function getSnapshot() {
		return {
			mode,
			main: mainSudoku.toJSON(),
			mainUndoStack: [...mainUndoStack],
			mainRedoStack: [...mainRedoStack],
			exploreState: exploreSession
				? {
					origin: exploreSession.origin.toJSON(),
					sudoku: exploreSession.sudoku.toJSON(),
					undoStack: [...exploreSession.undoStack],
					redoStack: [...exploreSession.redoStack],
					failed: exploreSession.failed,
					reason: exploreSession.reason,
					startHash: exploreSession.startHash
				}
				: null,
			failedExploreHashes: [...failedHashes]
		}
	}

	function toJSON() {
		return {
			type: 'Game',
			...getSnapshot()
		}
	}

	function isSolved() {
		return currentSudoku().isSolved()
	}

	return {
		getSudoku,
		guess,
		undo,
		redo,
		canUndo,
		canRedo,
		startExplore,
		resetExplore,
		discardExplore,
		commitExplore,
		exploreGuess,
		isExploreActive() {
			return mode === 'explore'
		},
		isExploreFailed() {
			return Boolean(exploreSession && exploreSession.failed)
		},
		getExploreState,
		getCandidates,
		getNextHint,
		getHintInfo,
		applyHint,
		isSolved,
		toJSON
	}
}

export function createGameFromJSON(json) {
	const sudoku = createSudokuFromJSON(json.main || json.sudoku)
	return createGame({
		sudoku,
		undoStack: json.mainUndoStack || json.undoStack || [],
		redoStack: json.mainRedoStack || json.redoStack || [],
		exploreState: json.exploreState || null,
		failedExploreHashes: json.failedExploreHashes || []
	})
}