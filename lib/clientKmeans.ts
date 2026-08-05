// Runs entirely in the browser, no server involved, so there's no time limit
// to worry about here.

function distance(a: number[], b: number[]) {
  return Math.sqrt(a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0));
}

export function kmeans(points: number[][], k: number, iterations = 15) {
  let centroids = points.slice(0, k);
  let assignments = new Array(points.length).fill(0);

  for (let iter = 0; iter < iterations; iter++) {
    assignments = points.map((p) => {
      let best = 0;
      let bestDist = Infinity;
      centroids.forEach((c, i) => {
        const d = distance(p, c);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      });
      return best;
    });

    centroids = centroids.map((_, i) => {
      const members = points.filter((_, idx) => assignments[idx] === i);
      if (members.length === 0) return centroids[i];
      const dims = members[0].length;
      const avg = new Array(dims).fill(0);
      members.forEach((m) => m.forEach((v, d) => (avg[d] += v / members.length)));
      return avg;
    });
  }

  return assignments;
}
