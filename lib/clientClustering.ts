// Groups conversations that are similar enough, rather than forcing every
// conversation into one of a fixed number of buckets (which is what caused
// unrelated chats to get lumped together under k-means).

export function cosineSimilarity(a: number[], b: number[]) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

// Union-find: connects any two conversations whose similarity clears the
// threshold, then groups everything that ends up connected, directly or
// transitively, into one cluster.
export function clusterByThreshold(points: number[][], threshold: number): number[] {
  const n = points.length;
  const parent = Array.from({ length: n }, (_, i) => i);

  function find(x: number): number {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  }

  function union(a: number, b: number) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  }

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (cosineSimilarity(points[i], points[j]) >= threshold) {
        union(i, j);
      }
    }
  }

  const rootToIndex = new Map<number, number>();
  const assignments = new Array(n);
  for (let i = 0; i < n; i++) {
    const r = find(i);
    if (!rootToIndex.has(r)) rootToIndex.set(r, rootToIndex.size);
    assignments[i] = rootToIndex.get(r)!;
  }
  return assignments;
}
