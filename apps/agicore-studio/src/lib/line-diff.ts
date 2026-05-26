// Minimal LCS-based line diff. Produces a sequence of operations:
// equal, add, remove. Sufficient for the diff-preview surface — when
// we need more (intra-line word diff, side-by-side render), a real
// library can replace this without changing the consumer.

export type DiffOp =
  | { kind: 'equal';  line: string; aIndex: number; bIndex: number }
  | { kind: 'add';    line: string; bIndex: number }
  | { kind: 'remove'; line: string; aIndex: number };

/** Standard LCS-table line diff. O(N*M) memory which is fine for our
 *  file sizes — `.agi` files top out around a few hundred lines. */
export function diffLines(a: string, b: string): DiffOp[] {
  const aLines = a.split('\n');
  const bLines = b.split('\n');
  const n = aLines.length;
  const m = bLines.length;

  // Build LCS length table.
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      if (aLines[i] === bLines[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  // Walk the table to recover the operations in order.
  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (aLines[i] === bLines[j]) {
      ops.push({ kind: 'equal', line: aLines[i], aIndex: i, bIndex: j });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ kind: 'remove', line: aLines[i], aIndex: i });
      i += 1;
    } else {
      ops.push({ kind: 'add', line: bLines[j], bIndex: j });
      j += 1;
    }
  }
  while (i < n) {
    ops.push({ kind: 'remove', line: aLines[i], aIndex: i });
    i += 1;
  }
  while (j < m) {
    ops.push({ kind: 'add', line: bLines[j], bIndex: j });
    j += 1;
  }
  return ops;
}

/** Tally the change count for header summaries. */
export function countChanges(ops: DiffOp[]): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const o of ops) {
    if (o.kind === 'add') added += 1;
    else if (o.kind === 'remove') removed += 1;
  }
  return { added, removed };
}
