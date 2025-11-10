export function weightedSum(x: number[], w: number[], b: number): number {
  return x.reduce((acc, xi, i) => acc + (w[i] ?? 0) * xi, b);
}

export function binaryCombinations(n: number): number[][] {
  const total = 1 << n;
  const rows: number[][] = [];
  for (let idx = 0; idx < total; idx++) {
    const row: number[] = [];
    for (let i = 0; i < n; i++) {
      const bit = (idx >> (n - 1 - i)) & 1;
      row.push(bit);
    }
    rows.push(row);
  }
  return rows;
}
