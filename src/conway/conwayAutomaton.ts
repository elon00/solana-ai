import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '../utils/pqcCrypto.js';

export type ConwayGrid = boolean[][];

function validateGrid(grid: ConwayGrid): void {
  if (!Array.isArray(grid) || grid.length === 0 || grid[0].length === 0) {
    throw new Error('Conway grid must be a non-empty rectangle');
  }
  const width = grid[0].length;
  if (!grid.every((row) => Array.isArray(row) && row.length === width)) {
    throw new Error('Conway grid must be rectangular');
  }
}

export function stepConway(grid: ConwayGrid): ConwayGrid {
  validateGrid(grid);
  const height = grid.length;
  const width = grid[0].length;

  return grid.map((row, y) =>
    row.map((alive, x) => {
      let neighbours = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const ny = y + dy;
          const nx = x + dx;
          if (ny >= 0 && ny < height && nx >= 0 && nx < width && grid[ny][nx]) {
            neighbours += 1;
          }
        }
      }
      return alive ? neighbours === 2 || neighbours === 3 : neighbours === 3;
    })
  );
}

export function runConway(grid: ConwayGrid, generations: number): ConwayGrid {
  validateGrid(grid);
  if (!Number.isSafeInteger(generations) || generations < 0) {
    throw new Error('generations must be a non-negative safe integer');
  }

  let state = grid.map((row) => [...row]);
  for (let i = 0; i < generations; i += 1) state = stepConway(state);
  return state;
}

export function conwayStateHash(grid: ConwayGrid): string {
  validateGrid(grid);
  const encoded = grid.map((row) => row.map((cell) => (cell ? '1' : '0')).join('')).join('|');
  return bytesToHex(sha256(new TextEncoder().encode(encoded)));
}
