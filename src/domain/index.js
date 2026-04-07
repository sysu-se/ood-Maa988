// ============================================================
// Sudoku 领域对象
// ============================================================

/**
 * 深拷贝 9x9 grid
 * 使用 map 创建新的二维数组，确保没有共享引用
 */
function cloneGrid(grid) {
  return grid.map(row => [...row])
}

/**
 * 创建 Sudoku 对象
 * @param {number[][]} input - 9x9 的数独网格，0 表示空单元格
 * @returns {Sudoku}
 */
export function createSudoku(input) {
  // 防御性拷贝：创建时深拷贝输入，避免外部修改影响内部状态
  let grid = cloneGrid(input)

  return {
    /**
     * 获取当前 grid 的副本
     * 返回深拷贝，防止外部修改
     */
    getGrid() {
      return cloneGrid(grid)
    },

    /**
     * 在指定位置填入数字
     * @param {{row: number, col: number, value: number}} move
     */
    guess(move) {
      const { row, col, value } = move
      grid[row][col] = value
    },

    /**
     * 克隆当前 Sudoku 对象
     * 返回一个独立的副本，修改克隆不会影响原对象
     */
    clone() {
      return createSudoku(grid)
    },

    /**
     * 序列化为 JSON 可序列化的纯数据
     * 只保存 grid 数据，不包含方法
     */
    toJSON() {
      return {
        type: 'Sudoku',
        grid: cloneGrid(grid)
      }
    },

    /**
     * 返回人类可读的字符串表示
     * 用于调试，格式化输出 9x9 网格
     */
    toString() {
      const separator = '+-------+-------+-------+'
      const lines = [separator]

      for (let i = 0; i < 9; i++) {
        let row = '| '
        for (let j = 0; j < 9; j++) {
          const val = grid[i][j]
          row += (val === 0 ? '.' : val.toString()) + ' '
          if ((j + 1) % 3 === 0) {
            row += '| '
          }
        }
        lines.push(row)
        if ((i + 1) % 3 === 0) {
          lines.push(separator)
        }
      }

      return lines.join('\n')
    }
  }
}

/**
 * 从 JSON 数据恢复 Sudoku 对象
 * @param {object} json - 由 toJSON() 生成的数据
 * @returns {Sudoku}
 */
export function createSudokuFromJSON(json) {
  return createSudoku(json.grid)
}

// ============================================================
// Game 领域对象（管理 Undo/Redo 历史）
// ============================================================

/**
 * 创建 Game 对象
 * @param {{sudoku: Sudoku}} options
 * @returns {Game}
 */
export function createGame({ sudoku }) {
  // 持有当前数独对象（克隆一份，避免外部修改）
  let currentSudoku = sudoku.clone()

  // 历史记录：存储 Move 对象
  // undoStack 存储已执行的操作，用于撤销
  // redoStack 存储已撤销的操作，用于重做
  const undoStack = []
  const redoStack = []

  return {
    /**
     * 获取当前的 Sudoku 对象
     */
    getSudoku() {
      return currentSudoku
    },

    /**
     * 执行猜测并记录到历史
     * @param {{row: number, col: number, value: number}} move
     */
    guess(move) {
      // 根据作业要求：Undo 后若进行新的输入，Redo 历史应失效
      redoStack.length = 0

      // 记录操作前的旧值（用于撤销）
      const oldValue = currentSudoku.getGrid()[move.row][move.col]

      // 保存 Move 到 undo 历史
      // 存储：操作前的旧值，以便撤销时恢复
      undoStack.push({
        row: move.row,
        col: move.col,
        oldValue: oldValue,
        newValue: move.value
      })

      // 应用到当前数独
      currentSudoku.guess(move)
    },

    /**
     * 撤销最近一次操作
     * 将操作从 undoStack 移到 redoStack
     */
    undo() {
      if (undoStack.length === 0) return

      const move = undoStack.pop()

      // 恢复到旧值
      currentSudoku.guess({
        row: move.row,
        col: move.col,
        value: move.oldValue
      })

      // 将操作移到 redo 历史
      redoStack.push(move)
    },

    /**
     * 重做被撤销的操作
     * 将操作从 redoStack 移回 undoStack
     */
    redo() {
      if (redoStack.length === 0) return

      const move = redoStack.pop()

      // 恢复到新值
      currentSudoku.guess({
        row: move.row,
        col: move.col,
        value: move.newValue
      })

      // 将操作移回 undo 历史
      undoStack.push(move)
    },

    /**
     * 检查是否可以撤销
     */
    canUndo() {
      return undoStack.length > 0
    },

    /**
     * 检查是否可以重做
     */
    canRedo() {
      return redoStack.length > 0
    },

    /**
     * 序列化为 JSON
     * 保存当前 grid 和历史记录
     */
    toJSON() {
      return {
        type: 'Game',
        sudoku: currentSudoku.toJSON(),
        undoStack: [...undoStack],
        redoStack: [...redoStack]
      }
    }
  }
}

/**
 * 从 JSON 数据恢复 Game 对象
 * @param {object} json - 由 toJSON() 生成的数据
 * @returns {Game}
 */
export function createGameFromJSON(json) {
  // 从 JSON 恢复 Sudoku
  const sudoku = createSudokuFromJSON(json.sudoku)

  // 创建 Game
  const game = createGame({ sudoku })

  // 恢复历史记录
  // 注意：需要手动修改内部状态，因为创建 Game 时历史是空的
  // 这里我们通过直接操作来实现（在实际实现中可以优化）
  
  // 清除自动产生的 undoStack（创建 Game 时不会有历史记录）
  // 我们需要重建历史，这里采用更直接的方式：
  // 重新执行所有 undoStack 中的操作
  
  // 由于 Game 的内部状态是私有的，我们需要在创建时传入历史
  // 或者重新设计 createGame 使其能接收历史数据
  // 这里我们采用一个简单方案：创建一个能接受历史的新函数

  return createGameWithHistory(sudoku, json.undoStack || [], json.redoStack || [])
}

/**
 * 创建带有历史记录的 Game 对象
 * 内部使用，用于反序列化
 */
function createGameWithHistory(sudoku, undoStack, redoStack) {
  let currentSudoku = sudoku.clone()

  return {
    getSudoku() {
      return currentSudoku
    },

    guess(move) {
      // 清空 redo 历史
      redoStack.length = 0

      const oldValue = currentSudoku.getGrid()[move.row][move.col]

      undoStack.push({
        row: move.row,
        col: move.col,
        oldValue: oldValue,
        newValue: move.value
      })

      currentSudoku.guess(move)
    },

    undo() {
      if (undoStack.length === 0) return

      const move = undoStack.pop()

      currentSudoku.guess({
        row: move.row,
        col: move.col,
        value: move.oldValue
      })

      redoStack.push(move)
    },

    redo() {
      if (redoStack.length === 0) return

      const move = redoStack.pop()

      currentSudoku.guess({
        row: move.row,
        col: move.col,
        value: move.newValue
      })

      undoStack.push(move)
    },

    canUndo() {
      return undoStack.length > 0
    },

    canRedo() {
      return redoStack.length > 0
    },

    toJSON() {
      return {
        type: 'Game',
        sudoku: currentSudoku.toJSON(),
        undoStack: [...undoStack],
        redoStack: [...redoStack]
      }
    }
  }
}
