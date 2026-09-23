export type Cell = 0 | 1;
export type Grid = Cell[][];

export function createGrid(rows: number, cols: number, liveCells: Array<[number, number]> = []): Grid {
  if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows <= 0 || cols <= 0) {
    throw new Error('rows and cols must be positive integers');
  }
  const grid: Grid = Array.from({ length: rows }, () => Array<Cell>(cols).fill(0));
  for (const [row, col] of liveCells) {
    if (row < 0 || row >= rows || col < 0 || col >= cols) throw new Error('live cell is out of bounds');
    grid[row][col] = 1;
  }
  return grid;
}

export function nextGeneration(grid: Grid): Grid {
  if (grid.length === 0 || grid[0].length === 0) throw new Error('grid must not be empty');
  const rows = grid.length;
  const cols = grid[0].length;

  return grid.map((row, r) =>
    row.map((cell, c) => {
      let neighbours = 0;
      for (let dr = -1; dr <= 1; dr += 1) {
        for (let dc = -1; dc <= 1; dc += 1) {
          if (dr === 0 && dc === 0) continue;
          const rr = r + dr;
          const cc = c + dc;
          if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) neighbours += grid[rr][cc];
        }
      }
      if (cell === 1) return (neighbours === 2 || neighbours === 3 ? 1 : 0) as Cell;
      return (neighbours === 3 ? 1 : 0) as Cell;
    })
  );
}

export function population(grid: Grid): number {
  return grid.reduce((sum, row) => sum + row.reduce((rowSum, cell) => rowSum + cell, 0), 0);
}
