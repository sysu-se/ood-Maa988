# DESIGN.md - 数独游戏领域对象设计

## 1. Sudoku 和 Game 的职责边界

### Sudoku 对象
**职责**：表示数独局面（Board）
- 持有 9x9 的 grid 数据（二维数组，0 表示空单元格）
- 提供 `guess(move)` 方法在指定位置填入数字
- 提供 `getGrid()` 返回当前局面的深拷贝
- 提供 `clone()` 创建独立的副本
- 提供 `toJSON()` / `toString()` 用于序列化和调试

**设计理由**：Sudoku 是一个纯粹的领域对象，只关心局面数据，不关心游戏历史或用户交互。它的行为简单明确：存储和修改 grid。

### Game 对象
**职责**：管理一局游戏的会话状态
- 持有当前 `Sudoku` 对象
- 管理 Undo/Redo 历史记录
- 提供 `guess(move)` 方法（带历史记录）
- 提供 `undo()` / `redo()` / `canUndo()` / `canRedo()`
- 提供 `toJSON()` 序列化整个游戏状态（包括历史）

**设计理由**：Game 是更高层次的业务逻辑对象，它组合了 Sudoku 并添加了游戏会话管理功能（主要是 Undo/Redo）。UI 层通过 Game 对象与领域层交互，而不是直接操作 Sudoku。

---

## 2. Move 是值对象还是实体对象？为什么？

**Move 是值对象（Value Object）**。

**理由**：
- Move 只包含数据：`{ row, col, oldValue, newValue }`，没有唯一标识
- Move 的生命周期短暂，作为参数传递，不需要持久化身份
- Move 的相等性由字段值决定，而非 ID
- Move 不包含复杂行为，只是简单数据传输对象

**为什么 Move 不是核心领域对象**：
- Move 只是一个操作的描述，不是独立存在的业务概念
- 它的意义在于被 Game 对象使用，不能独立发挥作用
- 数独游戏的核心是局面（Sudoku）和游戏会话（Game），Move 只是操作的手段

---

## 3. History 中存储的是什么？为什么？

**History 中存储的是 Move 对象**，而不是 Sudoku 快照。

**存储结构**：
```javascript
{
  row: number,      // 操作的行
  col: number,      // 操作的列
  oldValue: number, // 操作前的值（用于撤销）
  newValue: number  // 操作的值（用于重做）
}
```

**为什么存储 Move 而不是快照**：
1. **内存效率**：每次操作只记录一个单元格的变化（4 个数字），而不是整个 9x9 数组
2. **时间效率**：撤销/重做只需修改一个单元格，不需要复制整个 grid
3. **语义清晰**：Move 直接表达了"做了什么操作"，更符合领域语言

**缺点与权衡**：
- 如果用户进行了大量操作，Move 列表会增长。但数独游戏通常不会有成千上万步操作，因此这不是问题
- 存储 Move 要求 oldValue 和 newValue 都是数字，如果未来需要记录更复杂的信息（如笔记、高亮），可以扩展 Move 结构

---

## 4. 复制策略：哪些地方需要深拷贝？

### 深拷贝的位置

| 位置 | 复制方式 | 原因 |
|------|----------|------|
| `createSudoku(input)` | 深拷贝 input | 防御性编程，防止外部修改影响内部状态 |
| `getGrid()` | 深拷贝返回 | 防止调用方修改返回的数组影响内部状态 |
| `clone()` | 深拷贝整个 grid | 创建独立副本，修改克隆不影响原对象 |
| `createGame({ sudoku })` | 克隆传入的 sudoku | 防止外部修改影响游戏状态 |
| `toJSON()` | 深拷贝 grid | 返回纯数据，不暴露内部引用 |

### 浅拷贝是否足够？

对于 `Move` 对象，**浅拷贝足够**，因为：
- Move 的所有字段都是基本类型（number）
- 没有嵌套对象或数组引用

对于 `grid`（二维数组），**必须深拷贝**，因为：
- grid 是嵌套数组结构
- 如果使用浅拷贝，新旧对象会共享内部数组引用
- 修改一个会影响另一个，导致严重 bug

### 如果误用浅拷贝会导致什么问题？

```javascript
// 错误示例：浅拷贝
function shallowClone(grid) {
  return [...grid] // 只复制了外层数组，内层数组仍是引用
}

const original = createSudoku(puzzle)
const cloned = original.clone()

// 如果 clone 使用浅拷贝：
cloned.guess({ row: 0, col: 0, value: 9 })
// original.getGrid()[0][0] 也会变成 9！
// 因为两个对象共享内层数组引用
```

**我们的实现使用深拷贝避免此问题**：
```javascript
function cloneGrid(grid) {
  return grid.map(row => [...row]) // 两层都复制
}
```

---

## 5. 序列化 / 反序列化设计

### Sudoku 序列化

**`toJSON()` 输出**：
```javascript
{
  type: 'Sudoku',
  grid: [[5,3,0,...], [6,0,0,...], ...] // 9x9 数组
}
```

**序列化字段**：
- `type`：标识对象类型，用于调试
- `grid`：当前数独局面

**不序列化的字段**：
- 方法（自动排除，JSON.stringify 只包含数据）

**反序列化**：
```javascript
createSudokuFromJSON(json) {
  return createSudoku(json.grid)
}
```

### Game 序列化

**`toJSON()` 输出**：
```javascript
{
  type: 'Game',
  sudoku: { type: 'Sudoku', grid: [...] }, // 当前局面
  undoStack: [{ row, col, oldValue, newValue }, ...], // 撤销历史
  redoStack: [{ row, col, oldValue, newValue }, ...]  // 重做历史
}
```

**序列化字段**：
- `sudoku`：当前数独局面（通过 sudoku.toJSON()）
- `undoStack`：完整的撤销历史
- `redoStack`：完整的重做历史

**反序列化**：
```javascript
createGameFromJSON(json) {
  const sudoku = createSudokuFromJSON(json.sudoku)
  return createGameWithHistory(sudoku, json.undoStack, json.redoStack)
}
```

### Round-trip 保证

序列化 → 反序列化后：
- Sudoku：grid 完全恢复
- Game：grid + undoStack + redoStack 完全恢复，Undo/Redo 行为正确

---

## 6. 外表化接口设计

### `Sudoku.toString()`

**设计**：输出可视化的数独网格表示

**示例输出**：
```
+-------+-------+-------+
| 5 3 . | . 7 . | . . . |
| 6 . . | 1 9 5 | . . . |
| . 9 8 | . . . | . 6 . |
+-------+-------+-------+
| 8 . . | . 6 . | . . 3 |
| 4 . . | 8 . 3 | . . 1 |
| 7 . . | . 2 . | . . 6 |
+-------+-------+-------+
| . 6 . | . . . | 2 8 . |
| . . . | 4 1 9 | . . 5 |
| . . . | . 8 . | . 7 9 |
+-------+-------+-------+
```

**设计理由**：
- 使用 `.` 表示空单元格（0），更直观
- 使用 `+`、`-`、`|` 分隔符，模拟标准数独格式
- 每 3 行/列添加粗分隔线，突出 3x3 宫格
- 适合调试时打印查看当前局面

### `Sudoku.toJSON()`

**设计**：返回纯 JavaScript 对象，可被 `JSON.stringify` 处理

**设计理由**：
- 用于持久化、传输、或状态保存
- 结构清晰，包含完整 grid 数据
- 与 `createSudokuFromJSON` 配合实现完整 round-trip

---

## 7. 其他设计考虑

### 是否还有其他对象？

当前设计包含两个核心对象：`Sudoku` 和 `Game`。

**可能添加但未添加的对象**：
- `Cell`：表示单个单元格。但会增加复杂度，收益不大
- `MoveHistory`：专门管理历史。但当前 Game 对象职责已清晰
- `Validator`：校验数独合法性。本次作业不要求

### Undo/Redo 更接近"存 move"还是"存 snapshot"？

**存 Move**。

理由见第 3 节。简而言之：内存效率高、实现简单、符合数独游戏的使用场景。

### 如果继续增加"提示"或"探索模式"，现在的设计够用吗？

**基本够用，但需要扩展**：

- **提示功能**：可以在 Game 中添加 `getHint()` 方法，利用 Sudoku 的 grid 数据进行计算
- **探索模式**（多分支历史）：当前 undoStack/redoStack 是线性结构，需要改为树形结构才能支持分支

**当前设计的优势**：
- 对象边界清晰，扩展时只需添加方法或新对象，不需要重构整体架构
- Game 对象作为外观（Facade），UI 层不需要知道内部实现细节

---

## 8. 最容易出错的地方

1. **深浅拷贝混淆**：二维数组必须两层都拷贝，否则共享引用会导致状态污染
2. **Undo 后新操作未清空 Redo 历史**：必须在 `guess()` 开始时清空 `redoStack`
3. **防御性拷贝遗漏**：`getGrid()` 返回的也必须是副本，否则调用方可以间接修改内部状态
4. **反序列化时历史恢复**：需要专门的 `createGameWithHistory` 函数，而不是复用普通的 `createGame`
